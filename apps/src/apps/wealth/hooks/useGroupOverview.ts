import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { assetFromWire } from '../types'
import type { Group } from '../../../types'
import type { Asset, WireAsset } from '../types'
import type { T212Snapshot } from './useTrading212'
import type { AccountCash, Position, Order } from '../services/trading212'

export interface MemberOverview {
  uid: string
  displayName: string
  photoURL: string
  assets: Asset[]
  snapshot: T212Snapshot
  assetsLoading: boolean
  snapshotLoading: boolean
}

const EMPTY_SNAPSHOT: T212Snapshot = {
  portfolio: [],
  cash: null,
  orders: [],
  meta: {},
  syncedAt: null,
  error: null,
}

/** Aggregate all members' assets and T212 snapshots for a group. */
export function useGroupOverview(group: Group | null, selfUid: string | undefined) {
  const [members, setMembers] = useState<MemberOverview[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!group || !selfUid) {
      setMembers([])
      return
    }

    setLoading(true)

    // Keep per-member state in a ref-like map
    const memberMap = new Map<string, MemberOverview>()
    const unsubscribers: (() => void)[] = []
    let initialised = 0
    const total = group.members.length * 2 // assets + snapshot per member

    const trySetDone = () => {
      initialised++
      if (initialised >= total) setLoading(false)
    }

    const publish = () => setMembers([...memberMap.values()])

    for (const uid of group.members) {
      // Initialise with placeholder (empty displayName until profile resolves)
      memberMap.set(uid, {
        uid,
        displayName: '',
        photoURL: '',
        assets: [],
        snapshot: EMPTY_SNAPSHOT,
        assetsLoading: true,
        snapshotLoading: true,
      })

      // Fetch profile (one-shot — display names rarely change mid-session)
      getDoc(doc(db, 'users', uid)).then((snap) => {
        const existing = memberMap.get(uid)
        if (!existing) return
        memberMap.set(uid, {
          ...existing,
          displayName: snap.data()?.displayName || uid,
          photoURL: snap.data()?.photoURL || '',
        })
        publish()
      })

      // Subscribe to assets
      const assetsQ = query(
        collection(db, 'wealth', uid, 'assets'),
        orderBy('ca', 'desc')
      )
      const unsubAssets = onSnapshot(
        assetsQ,
        (snap) => {
          const assets: Asset[] = snap.docs.map((d) => assetFromWire(d.id, d.data() as WireAsset))
          const existing = memberMap.get(uid)
          if (!existing) return
          const wasLoading = existing.assetsLoading
          memberMap.set(uid, { ...existing, assets, assetsLoading: false })
          publish()
          if (wasLoading) trySetDone()
        },
        () => {
          // permission denied for this member — mark done with empty
          const existing = memberMap.get(uid)
          if (!existing) return
          const wasLoading = existing.assetsLoading
          memberMap.set(uid, { ...existing, assetsLoading: false })
          publish()
          if (wasLoading) trySetDone()
        }
      )
      unsubscribers.push(unsubAssets)

      // Subscribe to T212 snapshot
      const unsubSnap = onSnapshot(
        doc(db, 't212Snapshots', uid),
        (snapDoc) => {
          const existing = memberMap.get(uid)
          if (!existing) return
          const wasLoading = existing.snapshotLoading
          const d = snapDoc.exists() ? snapDoc.data() : null
          const snapshot: T212Snapshot = d
            ? { portfolio: (d.p as Position[]) ?? [], cash: (d.c as AccountCash) ?? null, orders: (d.o as Order[]) ?? [], meta: (d.m as Record<string, { n: string; c: string }>) ?? {}, syncedAt: (d.ts as number) ?? null, error: (d.err as string) ?? null }
            : EMPTY_SNAPSHOT
          memberMap.set(uid, { ...existing, snapshot, snapshotLoading: false })
          publish()
          if (wasLoading) trySetDone()
        },
        () => {
          const existing = memberMap.get(uid)
          if (!existing) return
          const wasLoading = existing.snapshotLoading
          memberMap.set(uid, { ...existing, snapshotLoading: false })
          publish()
          if (wasLoading) trySetDone()
        }
      )
      unsubscribers.push(unsubSnap)
    }

    return () => {
      unsubscribers.forEach((u) => u())
    }
  // Depend on stable primitives to avoid re-subscribing on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id, group?.members?.join(','), selfUid])

  return { members, loading }
}
