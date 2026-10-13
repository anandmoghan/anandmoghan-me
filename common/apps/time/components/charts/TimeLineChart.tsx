'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS } from '../../constants'
import { duration } from '../../schema'
import { dayKeyToDate, isoWeekKeyFromDk, monthKeyFromDk } from '../../services/time'
import type { Category, Session } from '../../types'
import { formatDurationHuman } from '../../schema'
import type { RangeType } from '../RangePicker'

interface TimeLineChartProps {
  sessions: Session[]
  categories: Category[]
  categoryMap: Record<string, Category>
  filteredCategoryId: string | null
  tz: string
  rangeType: RangeType
}

type Grouping = 'day' | 'week' | 'month'

function inferGrouping(sessions: Session[]): Grouping {
  const dks = sessions.map(s => s.dayKey)
  if (dks.length === 0) return 'day'
  const minDk = Math.min(...dks)
  const maxDk = Math.max(...dks)
  const spanDays = (dayKeyToDate(maxDk).getTime() - dayKeyToDate(minDk).getTime()) / 86400000
  if (spanDays > 120) return 'month'
  if (spanDays > 45) return 'week'
  return 'day'
}

function groupKeyFor(dk: number, grouping: Grouping, tz: string): string {
  if (grouping === 'day') {
    return dayKeyToDate(dk).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  if (grouping === 'week') {
    return isoWeekKeyFromDk(dk, tz)
  }
  const mk = monthKeyFromDk(dk)
  const year = parseInt(mk.slice(0, 4))
  const month = parseInt(mk.slice(4)) - 1
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function buildYAxis(maxSeconds: number) {
  if (maxSeconds < 3600) {
    const maxMins = Math.max(1, Math.ceil(maxSeconds / 60))
    const step = maxMins <= 10 ? 2 : maxMins <= 20 ? 5 : maxMins <= 45 ? 10 : 15
    const ticks: number[] = []
    for (let m = 0; m <= maxMins + step; m += step) ticks.push(+(m / 60).toFixed(6))
    return { ticks, unit: 'm', tickFormatter: (v: number) => String(Math.round(v * 60)) }
  }
  const maxHours = Math.ceil(maxSeconds / 3600)
  return {
    ticks: Array.from({ length: maxHours + 1 }, (_, i) => i),
    unit: 'h',
    tickFormatter: (v: number) => String(v),
  }
}

export function TimeLineChart({ sessions, categories, categoryMap, filteredCategoryId, tz, rangeType }: TimeLineChartProps) {
  // Today is a single point — not useful as a trend line
  if (rangeType === 'today') return null

  const relevantCats = filteredCategoryId
    ? categories.filter(c => c.id === filteredCategoryId)
    : categories

  if (sessions.length === 0) return null

  // Week and month always show per-day granularity; lifetime/custom infer
  const grouping: Grouping =
    rangeType === 'week' || rangeType === 'month'
      ? 'day'
      : inferGrouping(sessions)

  const dkToLabel = new Map<number, string>()
  for (const s of sessions) {
    if (!dkToLabel.has(s.dayKey)) {
      dkToLabel.set(s.dayKey, groupKeyFor(s.dayKey, grouping, tz))
    }
  }

  const groupData: Record<string, Record<string, number>> = {}
  for (const s of sessions) {
    const label = dkToLabel.get(s.dayKey)!
    if (!groupData[label]) groupData[label] = {}
    groupData[label][s.categoryId] = (groupData[label][s.categoryId] ?? 0) + duration(s)
  }

  const sortedDks = [...new Set(sessions.map(s => s.dayKey))].sort((a, b) => a - b)
  const seen = new Set<string>()
  const orderedLabels: string[] = []
  for (const dk of sortedDks) {
    const label = dkToLabel.get(dk)!
    if (!seen.has(label)) {
      seen.add(label)
      orderedLabels.push(label)
    }
  }

  const data = orderedLabels.map(label => {
    const entry: Record<string, unknown> = { label }
    for (const cat of relevantCats) {
      const secs = groupData[label]?.[cat.id] ?? 0
      entry[cat.id] = secs > 0 ? parseFloat((secs / 3600).toFixed(2)) : null
    }
    return entry
  })

  // Compute max seconds across all data to pick axis unit
  let maxSeconds = 0
  for (const label of orderedLabels) {
    for (const cat of relevantCats) {
      const secs = groupData[label]?.[cat.id] ?? 0
      if (secs > maxSeconds) maxSeconds = secs
    }
  }
  const yAxis = buildYAxis(maxSeconds)

  const chartLabel =
    grouping === 'day' ? `Time per day` :
    grouping === 'week' ? `Time per week` :
    `Time per month`

  const showDots = orderedLabels.length <= 14
  const tickInterval = orderedLabels.length > 10 ? Math.ceil(orderedLabels.length / 8) - 1 : 0

  return (
    <div>
      <p className="text-xs text-muted font-medium uppercase tracking-wide mb-3">{chartLabel}</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'var(--muted)' }}
            interval={tickInterval}
          />
          <YAxis
            ticks={yAxis.ticks}
            tickFormatter={yAxis.tickFormatter}
            unit={yAxis.unit}
            tick={{ fontSize: 10, fill: 'var(--muted)' }}
            domain={[0, yAxis.ticks[yAxis.ticks.length - 1]]}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: 0,
              fontSize: 12,
              color: 'var(--foreground)',
            }}
            labelStyle={{ color: 'var(--foreground)' }}
            itemStyle={{ color: 'var(--foreground)' }}
            formatter={(val: number, key: string) => [
              val !== null ? formatDurationHuman(Math.round(val * 3600)) : '—',
              categoryMap[key]?.name ?? key,
            ]}
          />
          {relevantCats.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(val: string) => categoryMap[val]?.name ?? val}
            />
          )}
          {relevantCats.map((cat, i) => (
            <Line
              key={cat.id}
              type="monotone"
              dataKey={cat.id}
              name={cat.id}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              dot={showDots ? { r: 3 } : false}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
