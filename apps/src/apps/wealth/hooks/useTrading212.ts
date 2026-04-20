import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../../firebase'
import type { Position, AccountCash, Order, Instrument } from '../services/trading212'

// ── Snapshot (portfolio data, updated every 4h by Worker cron) ───────────────

export interface T212Snapshot {
  portfolio: Position[]
  cash: AccountCash | null
  orders: Order[]
  syncedAt: number | null   // unix ms
  error: string | null
}

const EMPTY_SNAPSHOT: T212Snapshot = {
  portfolio: [],
  cash: null,
  orders: [],
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

/** Listen to config/t212Instruments for ticker metadata. Returns stable Maps. */
export function useInstruments() {
  const [currencyMap, setCurrencyMap] = useState<Map<string, string>>(new Map())
  const [nameMap, setNameMap] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 't212Instruments'), (snap) => {
      if (!snap.exists()) return
      const instruments = (snap.data().i as Instrument[]) ?? []
      setCurrencyMap(new Map(instruments.map((i) => [i.ticker, i.currencyCode])))
      setNameMap(new Map(instruments.map((i) => [i.ticker, i.name || i.shortname || i.ticker])))
    })
    return unsub
  }, [])

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
