import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  writeBatch,
  increment,
  setDoc,
  Transaction,
} from 'firebase/firestore'
import { db } from '../../../firebase'
import { sessionFromWire, rollupMapFromWire } from '../schema'
import type { WireSession } from '../schema'
import type { RollupMap } from '../types'
import { localDayKey, isoWeekKey, monthKey, isoWeekKeyFromDk, monthKeyFromDk, dayKeyToDate, nextDayKey } from './time'
import { WEEK_PREFIX, MONTH_PREFIX } from '../constants'

export interface SessionDeltaEntry {
  cid: string
  seconds: number
  count: number
  weekKey: string  // e.g. '2026-W16'
  monthKey: string // e.g. '202604'
}

/**
 * Applies rollup increments/decrements inside an open transaction.
 * Only for sessions whose dk < today (today is always computed live).
 * Pass null for removal or addition to skip that half.
 */
export function applySessionDelta(
  tx: Transaction,
  uid: string,
  removal: SessionDeltaEntry | null,
  addition: SessionDeltaEntry | null,
): void {
  if (removal) {
    const wRef = doc(db, 'users', uid, 'rollups', WEEK_PREFIX + removal.weekKey)
    const mRef = doc(db, 'users', uid, 'rollups', MONTH_PREFIX + removal.monthKey)
    const lRef = doc(db, 'users', uid, 'rollups', 'lifetime')
    const cid = removal.cid
    tx.set(wRef, { [cid]: { t: increment(-removal.seconds), n: increment(-removal.count) } }, { merge: true })
    tx.set(mRef, { [cid]: { t: increment(-removal.seconds), n: increment(-removal.count) } }, { merge: true })
    tx.set(lRef, { [cid]: { t: increment(-removal.seconds), n: increment(-removal.count) } }, { merge: true })
  }
  if (addition) {
    const wRef = doc(db, 'users', uid, 'rollups', WEEK_PREFIX + addition.weekKey)
    const mRef = doc(db, 'users', uid, 'rollups', MONTH_PREFIX + addition.monthKey)
    const lRef = doc(db, 'users', uid, 'rollups', 'lifetime')
    const cid = addition.cid
    tx.set(wRef, { [cid]: { t: increment(addition.seconds), n: increment(addition.count) } }, { merge: true })
    tx.set(mRef, { [cid]: { t: increment(addition.seconds), n: increment(addition.count) } }, { merge: true })
    tx.set(lRef, { [cid]: { t: increment(addition.seconds), n: increment(addition.count) } }, { merge: true })
  }
}

/**
 * Fire-and-forget rollup catchup. Reads rollups/state.lr and processes all
 * sealed days (dk < today) that haven't been rolled up yet. Idempotent.
 */
export async function runRollupCatchup(uid: string, tz: string): Promise<void> {
  try {
    const stateRef = doc(db, 'users', uid, 'rollups', 'state')
    const stateSnap = await getDoc(stateRef)
    const lr: number = stateSnap.exists() ? (stateSnap.data().lr ?? 0) : 0

    const todayKey = localDayKey(new Date(), tz)
    if (lr >= todayKey - 1) return // already caught up

    // Fetch all sessions with dk in (lr, todayKey) — i.e. past unrolled days
    const sessionsSnap = await getDocs(
      query(
        collection(db, 'users', uid, 'sessions'),
        where('dk', '>', lr),
        where('dk', '<', todayKey),
      )
    )

    // Group sealed sessions by dk
    const byDk: Map<number, Array<{ cid: string; seconds: number }>> = new Map()
    for (const d of sessionsSnap.docs) {
      const data = d.data() as WireSession
      if (data.e === null) continue // skip active session
      const s = sessionFromWire(d.id, data)
      const dur = Math.max(0, Math.floor((s.endedAt!.getTime() - s.startedAt.getTime()) / 1000))
      if (!byDk.has(s.dayKey)) byDk.set(s.dayKey, [])
      byDk.get(s.dayKey)!.push({ cid: s.categoryId, seconds: dur })
    }

    // Find the highest dk we'll process
    const maxDk = todayKey - 1

    // Process days from lr+1 to maxDk using batch writes
    let dk = nextDayKey(lr === 0 ? 0 : lr)
    if (lr === 0 && byDk.size === 0) {
      // No sessions at all, just set lr to yesterday
      await setDoc(stateRef, { lr: maxDk }, { merge: true })
      return
    }

    // Get all unique dayKeys from sessions plus fill in the range
    const allDks = new Set<number>()
    for (const [k] of byDk) allDks.add(k)
    // Also mark maxDk so lr advances even if no sessions in some days
    allDks.add(maxDk)

    // Apply increments for each day that has sessions
    // Use batched writes (max 500 ops per batch)
    let batch = writeBatch(db)
    let batchOps = 0

    const wRefs: Record<string, ReturnType<typeof doc>> = {}
    const mRefs: Record<string, ReturnType<typeof doc>> = {}
    const lifetimeRef = doc(db, 'users', uid, 'rollups', 'lifetime')

    for (const [dayDk, entries] of byDk) {
      if (dayDk >= todayKey) continue // skip today

      const wKey = WEEK_PREFIX + isoWeekKeyFromDk(dayDk, tz)
      const mKey = MONTH_PREFIX + monthKeyFromDk(dayDk)

      if (!wRefs[wKey]) wRefs[wKey] = doc(db, 'users', uid, 'rollups', wKey)
      if (!mRefs[mKey]) mRefs[mKey] = doc(db, 'users', uid, 'rollups', mKey)

      // Aggregate by category for this day
      const byCat: Record<string, { t: number; n: number }> = {}
      for (const { cid, seconds } of entries) {
        if (!byCat[cid]) byCat[cid] = { t: 0, n: 0 }
        byCat[cid].t += seconds
        byCat[cid].n += 1
      }

      for (const [cid, { t, n }] of Object.entries(byCat)) {
        batch.set(wRefs[wKey], { [cid]: { t: increment(t), n: increment(n) } }, { merge: true })
        batch.set(mRefs[mKey], { [cid]: { t: increment(t), n: increment(n) } }, { merge: true })
        batch.set(lifetimeRef, { [cid]: { t: increment(t), n: increment(n) } }, { merge: true })
        batchOps += 3
        if (batchOps >= 450) {
          await batch.commit()
          batch = writeBatch(db)
          batchOps = 0
        }
      }
    }

    // Update state.lr
    batch.set(stateRef, { lr: maxDk }, { merge: true })
    await batch.commit()
  } catch (err) {
    console.error('[rollup] catchup failed:', err)
  }
}

/**
 * Recomputes all rollups from scratch. Zeroes existing rollup docs and
 * re-aggregates all sealed sessions. Exposed via Settings button only.
 */
export async function recomputeRollups(uid: string, tz: string): Promise<void> {
  const todayKey = localDayKey(new Date(), tz)

  // Fetch all sealed past sessions
  const sessionsSnap = await getDocs(
    query(
      collection(db, 'users', uid, 'sessions'),
      where('dk', '<', todayKey),
    )
  )

  // Aggregate
  const weeks: Record<string, Record<string, { t: number; n: number }>> = {}
  const months: Record<string, Record<string, { t: number; n: number }>> = {}
  const lifetime: Record<string, { t: number; n: number }> = {}

  for (const d of sessionsSnap.docs) {
    const data = d.data() as WireSession
    if (data.e === null) continue
    const s = sessionFromWire(d.id, data)
    const dur = Math.max(0, Math.floor((s.endedAt!.getTime() - s.startedAt.getTime()) / 1000))
    const cid = s.categoryId

    const wKey = isoWeekKeyFromDk(s.dayKey, tz)
    const mKey = monthKeyFromDk(s.dayKey)

    if (!weeks[wKey]) weeks[wKey] = {}
    if (!weeks[wKey][cid]) weeks[wKey][cid] = { t: 0, n: 0 }
    weeks[wKey][cid].t += dur
    weeks[wKey][cid].n += 1

    if (!months[mKey]) months[mKey] = {}
    if (!months[mKey][cid]) months[mKey][cid] = { t: 0, n: 0 }
    months[mKey][cid].t += dur
    months[mKey][cid].n += 1

    if (!lifetime[cid]) lifetime[cid] = { t: 0, n: 0 }
    lifetime[cid].t += dur
    lifetime[cid].n += 1
  }

  // Delete all existing rollup docs first, then write new ones
  // Using batch writes
  let batch = writeBatch(db)
  let ops = 0

  const flush = async () => {
    await batch.commit()
    batch = writeBatch(db)
    ops = 0
  }

  // Write week rollups
  for (const [wKey, catMap] of Object.entries(weeks)) {
    const ref = doc(db, 'users', uid, 'rollups', WEEK_PREFIX + wKey)
    batch.set(ref, catMap)
    ops++
    if (ops >= 490) await flush()
  }

  // Write month rollups
  for (const [mKey, catMap] of Object.entries(months)) {
    const ref = doc(db, 'users', uid, 'rollups', MONTH_PREFIX + mKey)
    batch.set(ref, catMap)
    ops++
    if (ops >= 490) await flush()
  }

  // Write lifetime
  const lifetimeRef = doc(db, 'users', uid, 'rollups', 'lifetime')
  batch.set(lifetimeRef, lifetime)
  ops++

  // Write state
  const stateRef = doc(db, 'users', uid, 'rollups', 'state')
  batch.set(stateRef, { lr: todayKey - 1 })
  ops++

  await flush()
}

/** Load rollup data for the current week, month, and lifetime (one-shot reads). */
export async function loadRollups(uid: string, tz: string): Promise<{
  week: RollupMap
  month: RollupMap
  lifetime: RollupMap
}> {
  const now = new Date()
  const wKey = WEEK_PREFIX + isoWeekKey(now, tz)
  const mKey = MONTH_PREFIX + monthKey(now, tz)

  const [wSnap, mSnap, lSnap] = await Promise.all([
    getDoc(doc(db, 'users', uid, 'rollups', wKey)),
    getDoc(doc(db, 'users', uid, 'rollups', mKey)),
    getDoc(doc(db, 'users', uid, 'rollups', 'lifetime')),
  ])

  return {
    week: wSnap.exists() ? rollupMapFromWire(wSnap.data()) : {},
    month: mSnap.exists() ? rollupMapFromWire(mSnap.data()) : {},
    lifetime: lSnap.exists() ? rollupMapFromWire(lSnap.data()) : {},
  }
}

