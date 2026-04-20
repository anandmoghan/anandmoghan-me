import { useState, useEffect, useMemo } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../../firebase'
import { inferTickerCurrency, cleanTicker } from '../services/trading212'
import type { Position, AccountCash, Order } from '../services/trading212'

// ── Snapshot (portfolio data, updated every 4h by Worker cron) ───────────────

export interface T212Snapshot {
  portfolio: Position[]
  cash: AccountCash | null
  orders: Order[]
  meta: Record<string, { n: string; c: string }>  // ticker → { name, currencyCode }
  syncedAt: number | null   // unix ms
  error: string | null
}

const EMPTY_SNAPSHOT: T212Snapshot = {
  portfolio: [],
  cash: null,
  orders: [],
  meta: {},
  syncedAt: null,
  error: null,
}

/** Listen to t212Snapshots/{uid} in Firestore. */
export function useT212Snapshot(uid: string | undefined) {
  const [snapshot, setSnapshot] = useState<T212Snapshot>(EMPTY_SNAPSHOT)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) { setSnapshot(EMPTY_SNAPSHOT); setLoading(false); return }
    const unsub = onSnapshot(doc(db, 't212Snapshots', uid), (snap) => {
      if (!snap.exists()) {
        setSnapshot(EMPTY_SNAPSHOT)
      } else {
        const d = snap.data()
        setSnapshot({
          portfolio: (d.p as Position[]) ?? [],
          cash: (d.c as AccountCash) ?? null,
          orders: (d.o as Order[]) ?? [],
          meta: (d.m as Record<string, { n: string; c: string }>) ?? {},
          syncedAt: (d.ts as number) ?? null,
          error: (d.err as string) ?? null,
        })
      }
      setLoading(false)
    })
    return unsub
  }, [uid])

  return { snapshot, loading }
}

// ── Credentials status ───────────────────────────────────────────────────────

/** True if the user has T212 credentials stored, false if not, null while loading. */
export function useT212Configured(uid: string | undefined) {
  const [configured, setConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    if (!uid) { setConfigured(false); return }
    const unsub = onSnapshot(doc(db, 't212Creds', uid), (snap) => {
      setConfigured(snap.exists())
    })
    return unsub
  }, [uid])

  return configured
}

// ── Instrument metadata (ticker → name/currency) ─────────────────────────────

/** Derive currencyMap and nameMap from snapshot.meta (written by Worker at sync time). */
export function useInstruments(snapshot: T212Snapshot) {
  const currencyMap = useMemo(
    () => new Map(Object.entries(snapshot.meta).map(([t, v]) => [t, v.c])),
    [snapshot.meta]
  )
  const nameMap = useMemo(
    () => new Map(Object.entries(snapshot.meta).map(([t, v]) => [t, v.n || cleanTicker(t)])),
    [snapshot.meta]
  )
  return { currencyMap, nameMap }
}

// ── Manual sync trigger ──────────────────────────────────────────────────────

const PROXY_BASE = import.meta.env.VITE_T212_PROXY_URL || 'https://t212-proxy.anand-mohan.workers.dev'

import { auth } from '../../../firebase'

export async function triggerT212Sync(): Promise<void> {
  const idToken = await auth.currentUser?.getIdToken()
  if (!idToken) throw new Error('Not authenticated')
  const res = await fetch(`${PROXY_BASE}/api/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sync failed: ${text}`)
  }
}
