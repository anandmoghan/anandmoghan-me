import { Timestamp } from 'firebase/firestore'
import type { Category, Budget, Session, RollupEntry, RollupMap } from './types'

// ── Wire types (short keys stored in Firestore) ───────────────────────────────

export interface WireBudget {
  k: 't' | 'c'
  v: number
  w: 'd' | 'w' | 'm'
}

export interface WireCategory {
  n: string
  i: string
  b: WireBudget[]
  m?: number
  a: boolean
  o: number
  lr?: Timestamp  // last run — written when any session for this category closes
}

export interface WireSession {
  c: string
  s: Timestamp
  e: Timestamp | null
  dk: number
}

export interface WireRollupEntry {
  t: number
  n: number
}

// ── Budget adapters ───────────────────────────────────────────────────────────

export function budgetFromWire(w: WireBudget): Budget {
  return { kind: w.k, value: w.v, window: w.w }
}

export function budgetToWire(b: Budget): WireBudget {
  return { k: b.kind, v: b.value, w: b.window }
}

// ── Category adapters ─────────────────────────────────────────────────────────

export function categoryFromWire(id: string, data: WireCategory): Category {
  return {
    id,
    name: data.n,
    icon: data.i,
    budgets: (data.b ?? []).map(budgetFromWire),
    minDuration: data.m,
    archived: data.a ?? false,
    order: data.o ?? 0,
    lastRunAt: data.lr ? data.lr.toDate() : undefined,
  }
}

export function categoryToWire(c: Omit<Category, 'id'>): WireCategory {
  const wire: WireCategory = {
    n: c.name,
    i: c.icon,
    b: c.budgets.map(budgetToWire),
    a: c.archived,
    o: c.order,
  }
  if (c.minDuration !== undefined) wire.m = c.minDuration
  return wire
}

// ── Session adapters ──────────────────────────────────────────────────────────

export function sessionFromWire(id: string, data: WireSession): Session {
  return {
    id,
    categoryId: data.c,
    startedAt: data.s.toDate(),
    endedAt: data.e ? data.e.toDate() : null,
    dayKey: data.dk,
  }
}

export function sessionToWire(s: Omit<Session, 'id'>): WireSession {
  return {
    c: s.categoryId,
    s: Timestamp.fromDate(s.startedAt),
    e: s.endedAt ? Timestamp.fromDate(s.endedAt) : null,
    dk: s.dayKey,
  }
}

// ── Rollup adapters ───────────────────────────────────────────────────────────

export function rollupEntryFromWire(data: WireRollupEntry): RollupEntry {
  return { seconds: data.t ?? 0, count: data.n ?? 0 }
}

export function rollupMapFromWire(data: Record<string, unknown>): RollupMap {
  const result: RollupMap = {}
  for (const [key, val] of Object.entries(data)) {
    if (key === 'since') continue // metadata field
    if (val && typeof val === 'object' && 't' in val && 'n' in val) {
      result[key] = rollupEntryFromWire(val as WireRollupEntry)
    }
  }
  return result
}

// ── Duration helper ───────────────────────────────────────────────────────────

/** Derives duration in seconds from startedAt/endedAt. Never store elapsed in state. */
export function duration(session: { startedAt: Date; endedAt: Date | null }): number {
  const end = session.endedAt ?? new Date()
  return Math.max(0, Math.floor((end.getTime() - session.startedAt.getTime()) / 1000))
}

/** Format seconds as h:mm:ss or m:ss */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Format seconds as a human-readable string, e.g. "2h 30m" */
export function formatDurationHuman(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}
