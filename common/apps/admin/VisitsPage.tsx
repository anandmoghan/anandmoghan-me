'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Timestamp, collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getDb } from '@/common/firebase/client'
import { Card } from '../shell/Card'
import { ListSkeleton } from '../shell/Skeleton'
import { dayKey, toDate } from './format'

// Visits dashboard, aggregated in the browser over a bounded recent window. Once traffic
// outgrows WINDOW_DAYS x MAX_VISITS, move this to daily rollups written by a function.
const WINDOW_DAYS = 30
const MAX_VISITS = 5000
const TOP_N = 15

interface Visit {
  uid: string
  isAnonymous: boolean
  path: string
  referrer: string | null
  country: string | null
  sessionId: string
  createdAt: Date
}

interface Stats {
  views: number
  visitors: number
  sessions: number
  returning: number
  signedIn: number
  byPage: Array<[string, number, number]>
  byCountry: Array<[string, number, number]>
  byReferrer: Array<[string, number, number]>
  byDay: Array<{ day: string; views: number; visitors: number }>
}

/** [key, views, distinct visitors], most views first. */
function rank(visits: Visit[], keyOf: (v: Visit) => string | null): Array<[string, number, number]> {
  const groups = new Map<string, { views: number; uids: Set<string> }>()
  for (const v of visits) {
    const key = keyOf(v)
    if (!key) continue
    const g = groups.get(key) ?? { views: 0, uids: new Set<string>() }
    g.views++
    g.uids.add(v.uid)
    groups.set(key, g)
  }
  return Array.from(groups, ([key, g]): [string, number, number] => [key, g.views, g.uids.size])
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
}

function externalHost(referrer: string | null): string | null {
  if (!referrer || referrer.startsWith('/')) return null
  try {
    const host = new URL(referrer).hostname
    return host.endsWith('anandmoghan.me') ? null : host
  } catch {
    return null
  }
}

function summarise(visits: Visit[]): Stats {
  const sessionsByUid = new Map<string, Set<string>>()
  const signedInUids = new Set<string>()
  for (const v of visits) {
    const sessions = sessionsByUid.get(v.uid) ?? new Set<string>()
    sessions.add(v.sessionId)
    sessionsByUid.set(v.uid, sessions)
    if (!v.isAnonymous) signedInUids.add(v.uid)
  }

  const days = new Map<string, { views: number; uids: Set<string> }>()
  const today = new Date()
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    days.set(dayKey(d), { views: 0, uids: new Set() })
  }
  for (const v of visits) {
    const day = days.get(dayKey(v.createdAt))
    if (!day) continue
    day.views++
    day.uids.add(v.uid)
  }

  return {
    views: visits.length,
    visitors: sessionsByUid.size,
    sessions: Array.from(sessionsByUid.values()).reduce((n, s) => n + s.size, 0),
    returning: Array.from(sessionsByUid.values()).filter((s) => s.size > 1).length,
    signedIn: signedInUids.size,
    byPage: rank(visits, (v) => v.path),
    byCountry: rank(visits, (v) => v.country ?? 'Unknown'),
    byReferrer: rank(visits, (v) => externalHost(v.referrer)),
    byDay: Array.from(days, ([day, d]) => ({ day: day.slice(5), views: d.views, visitors: d.uids.size })),
  }
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card compact>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="text-2xl font-extrabold tabular-nums">{value}</p>
    </Card>
  )
}

function RankTable({ title, rows, keyLabel }: { title: string; rows: Array<[string, number, number]>; keyLabel: string }) {
  return (
    <Card flush>
      <h2 className="px-4 pt-3 font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted">No data.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2">{keyLabel}</th>
              <th className="px-4 py-2 text-right">Views</th>
              <th className="px-4 py-2 text-right">Visitors</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, views, visitors]) => (
              <tr key={key} className="border-t border-border">
                <td className="max-w-0 truncate px-4 py-2" title={key}>{key}</td>
                <td className="px-4 py-2 text-right tabular-nums">{views}</td>
                <td className="px-4 py-2 text-right tabular-nums">{visitors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

export function VisitsPage() {
  const [visits, setVisits] = useState<Visit[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const since = Timestamp.fromMillis(Date.now() - WINDOW_DAYS * 86_400_000)
      const snap = await getDocs(
        query(collection(getDb(), 'visits'), where('createdAt', '>=', since), orderBy('createdAt', 'desc'), limit(MAX_VISITS)),
      )
      const rows: Visit[] = []
      for (const d of snap.docs) {
        const createdAt = toDate(d.get('createdAt'))
        if (!createdAt) continue
        rows.push({
          uid: String(d.get('uid')),
          isAnonymous: d.get('isAnonymous') !== false,
          path: String(d.get('path')),
          referrer: d.get('referrer') ?? null,
          country: d.get('country') ?? null,
          sessionId: String(d.get('sessionId')),
          createdAt,
        })
      }
      setVisits(rows)
    } catch (err) {
      console.error('Loading visits failed', err)
      setError('Visits could not be loaded.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => (visits ? summarise(visits) : null), [visits])
  const [colors, setColors] = useState({ accent: '#4b505a', muted: '#8b949e' })
  useEffect(() => {
    const css = getComputedStyle(document.querySelector('.domain-admin') ?? document.documentElement)
    setColors({
      accent: css.getPropertyValue('--domain').trim() || css.getPropertyValue('--accent').trim() || '#4b505a',
      muted: css.getPropertyValue('--muted').trim() || '#8b949e',
    })
  }, [])

  if (error) return <p className="px-4 py-8 text-sm text-destructive">{error}</p>
  if (!stats || !visits) return <ListSkeleton />

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-[1.4rem] font-extrabold">Visits</h1>
        <button type="button" className="btn btn--sm" onClick={load}>
          Refresh
        </button>
      </div>
      <p className="text-sm text-muted">
        Last {WINDOW_DAYS} days, aggregated in the browser
        {visits.length === MAX_VISITS ? `, capped at the newest ${MAX_VISITS} visits` : ''}.
        Only visitors who accepted analytics are counted.
        Returning visitors had more than one session in the window.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Page views" value={stats.views} />
        <Stat label="Visitors" value={stats.visitors} />
        <Stat label="Sessions" value={stats.sessions} />
        <Stat label="Returning" value={stats.returning} />
        <Stat label="Signed in" value={stats.signedIn} />
      </div>

      <Card>
        <h2 className="mb-3 font-bold">By day</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.byDay} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.muted} opacity={0.2} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: colors.muted }} tickLine={false} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12 }}
                labelStyle={{ color: 'var(--fg)' }}
              />
              <Bar dataKey="views" name="Views" fill={colors.accent} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <RankTable title="By page" keyLabel="Path" rows={stats.byPage} />
        <RankTable title="By country" keyLabel="Country" rows={stats.byCountry} />
        <RankTable title="Referrers" keyLabel="Site" rows={stats.byReferrer} />
      </div>
    </div>
  )
}
