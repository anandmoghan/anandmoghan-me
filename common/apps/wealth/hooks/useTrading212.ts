'use client'

import { useState, useEffect, useMemo } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { getDb, getFirebaseAuth } from '@/common/firebase/client'
import { API_BASE } from '../services/api'
import { inferTickerCurrency, cleanTicker } from '../services/trading212'
import type { Position, AccountCash, Order } from '../services/trading212'

// ── Snapshot (portfolio data, updated every 4h by server cron) ───────────────

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
    const unsub = onSnapshot(doc(getDb(), 't212Snapshots', uid), (snap) => {
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
    const unsub = onSnapshot(doc(getDb(), 't212Creds', uid), (snap) => {
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

// ── T212 projection settings (growth rate + yearly contribution) ─────────────

export interface T212Settings {
  growthRate: number   // % per year
  contribution: number // annual, GBP (T212 account is GBP-native)
}

const DEFAULT_T212_SETTINGS: T212Settings = {
  growthRate: 7,
  contribution: 0,
}

/**
 * T212 projection assumptions (growth rate, yearly contribution) edited on the
 * Connections page and consumed by the FIRE projection. Stored at t212Settings/{uid}.
 * Contribution is in GBP — T212 ISA only accepts GBP contributions.
 */
export function useT212Settings(uid: string | undefined) {
  const [value, setValue] = useState<T212Settings>(DEFAULT_T212_SETTINGS)

  useEffect(() => {
    if (!uid) { setValue(DEFAULT_T212_SETTINGS); return }
    const unsub = onSnapshot(doc(getDb(), 't212Settings', uid), (snap) => {
      if (!snap.exists()) { setValue(DEFAULT_T212_SETTINGS); return }
      const d = snap.data()
      // Legacy: contribution used to be Record<Currency, number> — pick GBP if present.
      const rawContrib = d.contribution
      const contribution = typeof rawContrib === 'number'
        ? rawContrib
        : (rawContrib && typeof rawContrib === 'object' && typeof rawContrib.GBP === 'number' ? rawContrib.GBP : 0)
      setValue({
        growthRate: typeof d.growthRate === 'number' ? d.growthRate : DEFAULT_T212_SETTINGS.growthRate,
        contribution,
      })
    })
    return unsub
  }, [uid])

  const update = (patch: Partial<T212Settings>) => {
    const next: T212Settings = {
      growthRate: patch.growthRate ?? value.growthRate,
      contribution: patch.contribution ?? value.contribution,
    }
    setValue(next)
    if (uid) setDoc(doc(getDb(), 't212Settings', uid), next, { merge: true })
  }

  return { settings: value, update }
}

// ── Manual sync trigger ──────────────────────────────────────────────────────


export async function triggerT212Sync(): Promise<void> {
  const idToken = await getFirebaseAuth().currentUser?.getIdToken()
  if (!idToken) throw new Error('Not authenticated')
  const res = await fetch(`${API_BASE}/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sync failed: ${text}`)
  }
}
