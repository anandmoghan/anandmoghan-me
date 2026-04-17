import {
  doc,
  collection,
  runTransaction,
  getDocs,
  getDoc,
  query,
  where,
  limit,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../../../firebase'
import { sessionFromWire } from '../schema'
import type { WireSession } from '../schema'
import type { Session } from '../types'
import {
  localDayKey,
  isoWeekKeyFromDk,
  monthKeyFromDk,
  splitAcrossMidnight,
} from './time'
import { applySessionDelta } from './rollup'

/** Finds the currently active session (e == null), if any. Returns null otherwise. */
export async function getActiveSession(uid: string): Promise<Session | null> {
  const q = query(
    collection(db, 'users', uid, 'sessions'),
    where('e', '==', null),
    limit(1),
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return sessionFromWire(d.id, d.data() as WireSession)
}

/**
 * Switches to a new activity. Closes the current active session (with
 * midnight-split and min-duration enforcement) then creates a new active session.
 */
export async function switchActivity(
  uid: string,
  cid: string,
  tz: string,
  minDuration?: number,
): Promise<void> {
  const now = new Date()
  const todayKey = localDayKey(now, tz)

  // Find active session outside transaction (queries not supported inside tx)
  const active = await getActiveSession(uid)

  await runTransaction(db, async (tx) => {
    // Re-verify inside transaction
    if (active) {
      const activeRef = doc(db, 'users', uid, 'sessions', active.id)
      const snap = await tx.get(activeRef)
      if (snap.exists() && snap.data().e === null) {
        const session = sessionFromWire(active.id, snap.data() as WireSession)
        await closeSessionInTx(tx, uid, session, now, tz, todayKey, minDuration)
      }
    }

    // Create new active session
    const newRef = doc(collection(db, 'users', uid, 'sessions'))
    tx.set(newRef, {
      c: cid,
      s: Timestamp.fromDate(now),
      e: null,
      dk: todayKey,
    })
  })
}

/**
 * Stops the current active session without starting a new one.
 */
export async function stopActivity(
  uid: string,
  tz: string,
  minDuration?: number,
): Promise<void> {
  const now = new Date()
  const todayKey = localDayKey(now, tz)
  const active = await getActiveSession(uid)
  if (!active) return

  await runTransaction(db, async (tx) => {
    const activeRef = doc(db, 'users', uid, 'sessions', active.id)
    const snap = await tx.get(activeRef)
    if (!snap.exists() || snap.data().e !== null) return
    const session = sessionFromWire(active.id, snap.data() as WireSession)
    await closeSessionInTx(tx, uid, session, now, tz, todayKey, minDuration)
  })
}

/**
 * Deletes a session and removes its rollup contribution.
 */
export async function deleteSession(
  uid: string,
  sessionId: string,
  tz: string,
): Promise<void> {
  const todayKey = localDayKey(new Date(), tz)
  const sessionRef = doc(db, 'users', uid, 'sessions', sessionId)
  const snap = await getDoc(sessionRef)
  if (!snap.exists()) return

  const session = sessionFromWire(sessionId, snap.data() as WireSession)

  await runTransaction(db, async (tx) => {
    const latest = await tx.get(sessionRef)
    if (!latest.exists()) return

    tx.delete(sessionRef)

    // Remove rollup contribution only for sealed past sessions
    if (session.endedAt && session.dayKey < todayKey) {
      const seconds = Math.max(0, Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000))
      applySessionDelta(tx, uid, {
        cid: session.categoryId,
        seconds,
        count: 1,
        weekKey: isoWeekKeyFromDk(session.dayKey, tz),
        monthKey: monthKeyFromDk(session.dayKey),
      }, null)
    }
  })
}

/**
 * Edits a past session's category, start time, or end time.
 * Re-derives dk from new startedAt and applies rollup delta math.
 * Editing endedAt to null is forbidden (would create a second active session).
 */
export async function editSession(
  uid: string,
  sessionId: string,
  patch: { categoryId?: string; startedAt?: Date; endedAt?: Date },
  tz: string,
): Promise<void> {
  const todayKey = localDayKey(new Date(), tz)
  const sessionRef = doc(db, 'users', uid, 'sessions', sessionId)
  const snap = await getDoc(sessionRef)
  if (!snap.exists()) return

  const old = sessionFromWire(sessionId, snap.data() as WireSession)

  const newCid = patch.categoryId ?? old.categoryId
  const newStart = patch.startedAt ?? old.startedAt
  const newEnd = patch.endedAt ?? old.endedAt // keep existing (null stays null for active)
  const newDk = localDayKey(newStart, tz)

  await runTransaction(db, async (tx) => {
    const latest = await tx.get(sessionRef)
    if (!latest.exists()) return

    tx.update(sessionRef, {
      c: newCid,
      s: Timestamp.fromDate(newStart),
      e: newEnd ? Timestamp.fromDate(newEnd) : null,
      dk: newDk,
    })

    // Remove old rollup contribution
    if (old.endedAt && old.dayKey < todayKey) {
      const oldSeconds = Math.max(0, Math.floor((old.endedAt.getTime() - old.startedAt.getTime()) / 1000))
      applySessionDelta(tx, uid, {
        cid: old.categoryId,
        seconds: oldSeconds,
        count: 1,
        weekKey: isoWeekKeyFromDk(old.dayKey, tz),
        monthKey: monthKeyFromDk(old.dayKey),
      }, null)
    }

    // Add new rollup contribution
    if (newEnd && newDk < todayKey) {
      const newSeconds = Math.max(0, Math.floor((newEnd.getTime() - newStart.getTime()) / 1000))
      applySessionDelta(tx, uid, null, {
        cid: newCid,
        seconds: newSeconds,
        count: 1,
        weekKey: isoWeekKeyFromDk(newDk, tz),
        monthKey: monthKeyFromDk(newDk),
      })
    }
  })
}

/**
 * Switches timezone: deletes active session and all sessions with today's dk
 * in old or new tz, then writes the new tz to prefs.
 */
export async function switchTimezone(
  uid: string,
  newTz: string,
): Promise<void> {
  const { doc: fsDoc, setDoc, getDocs: fsGetDocs, deleteDoc } = await import('firebase/firestore')

  const now = new Date()
  const currentTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const oldTodayKey = localDayKey(now, currentTz)
  const newTodayKey = localDayKey(now, newTz)

  // Get all sessions to delete (today in old or new tz, or active)
  const todayKeys = new Set([oldTodayKey, newTodayKey])
  const allToDelete: string[] = []

  for (const dk of todayKeys) {
    const q = query(collection(db, 'users', uid, 'sessions'), where('dk', '==', dk))
    const snap = await fsGetDocs(q)
    snap.docs.forEach(d => allToDelete.push(d.id))
  }

  // Also include active session (e == null) which may not be in today's dk if clock crossed midnight
  const active = await getActiveSession(uid)
  if (active && !allToDelete.includes(active.id)) allToDelete.push(active.id)

  // Delete all
  await Promise.all(allToDelete.map(id => deleteDoc(fsDoc(db, 'users', uid, 'sessions', id))))

  // Write new tz to prefs
  await setDoc(fsDoc(db, 'users', uid, 'settings', 'preferences'), { tz: newTz }, { merge: true })
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function closeSessionInTx(
  tx: import('firebase/firestore').Transaction,
  uid: string,
  session: Session,
  now: Date,
  tz: string,
  todayKey: number,
  minDuration?: number,
): Promise<void> {
  const sessionRef = doc(db, 'users', uid, 'sessions', session.id)
  const dur = Math.max(0, Math.floor((now.getTime() - session.startedAt.getTime()) / 1000))

  if (minDuration && dur < minDuration) {
    // Too short — discard
    tx.delete(sessionRef)
    return
  }

  // Write last-run timestamp to category doc
  const catRef = doc(db, 'users', uid, 'categories', session.categoryId)
  tx.update(catRef, { lr: Timestamp.fromDate(now) })

  const pieces = splitAcrossMidnight(session.startedAt, now, tz)

  if (pieces.length === 1) {
    // Simple close
    tx.update(sessionRef, { e: Timestamp.fromDate(now) })
    if (session.dayKey < todayKey) {
      applySessionDelta(tx, uid, null, {
        cid: session.categoryId,
        seconds: dur,
        count: 1,
        weekKey: isoWeekKeyFromDk(session.dayKey, tz),
        monthKey: monthKeyFromDk(session.dayKey),
      })
    }
  } else {
    // Multi-day: delete original, emit one doc per piece
    tx.delete(sessionRef)
    for (const piece of pieces) {
      const pieceRef = doc(collection(db, 'users', uid, 'sessions'))
      const pieceDur = Math.max(0, Math.floor((piece.e.getTime() - piece.s.getTime()) / 1000))
      tx.set(pieceRef, {
        c: session.categoryId,
        s: Timestamp.fromDate(piece.s),
        e: Timestamp.fromDate(piece.e),
        dk: piece.dk,
      })
      if (piece.dk < todayKey) {
        applySessionDelta(tx, uid, null, {
          cid: session.categoryId,
          seconds: pieceDur,
          count: 1,
          weekKey: isoWeekKeyFromDk(piece.dk, tz),
          monthKey: monthKeyFromDk(piece.dk),
        })
      }
    }
  }
}
