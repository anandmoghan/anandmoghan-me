'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS } from '../../constants'
import { formatDurationHuman, duration } from '../../schema'
import type { Category, Session } from '../../types'

interface CategoryTotalsProps {
  sessions: Session[]
  categories: Category[]
  filteredCategoryId: string | null
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

export function CategoryTotals({ sessions, categories, filteredCategoryId }: CategoryTotalsProps) {
  const byCat: Record<string, { seconds: number; count: number }> = {}
  for (const s of sessions) {
    if (!byCat[s.categoryId]) byCat[s.categoryId] = { seconds: 0, count: 0 }
    byCat[s.categoryId].seconds += duration(s)
    byCat[s.categoryId].count += 1
  }

  const relevantCats = (filteredCategoryId
    ? categories.filter(c => c.id === filteredCategoryId)
    : categories
  ).filter(c => byCat[c.id])

  if (relevantCats.length === 0) return null

  const maxSeconds = Math.max(...Object.values(byCat).map(v => v.seconds), 0)
  const yAxis = buildYAxis(maxSeconds)

  const data = relevantCats.map((cat, i) => ({
    name: cat.name,
    icon: cat.icon,
    hours: parseFloat(((byCat[cat.id]?.seconds ?? 0) / 3600).toFixed(2)),
    seconds: byCat[cat.id]?.seconds ?? 0,
    count: byCat[cat.id]?.count ?? 0,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }))

  return (
    <div>
      <p className="text-xs text-muted font-medium uppercase tracking-wide mb-3">Total by category</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 16, left: -16, bottom: 4 }}
          barCategoryGap="35%"
          maxBarSize={56}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="icon"
            tick={{ fontSize: 20, dy: 2 }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            ticks={yAxis.ticks}
            tickFormatter={yAxis.tickFormatter}
            unit={yAxis.unit}
            domain={[0, yAxis.ticks[yAxis.ticks.length - 1]]}
            tick={{ fontSize: 10, fill: 'var(--muted)' }}
            axisLine={false}
            tickLine={false}
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
            cursor={{ fill: 'var(--border)', opacity: 0.25 }}
            formatter={(_val: number, _name: string, entry) => [
              `${formatDurationHuman(entry.payload.seconds)} · ${entry.payload.count} sessions`,
              entry.payload.name,
            ]}
          />
          <Bar dataKey="hours" radius={0}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend: name + time per category */}
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 mt-3">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2 h-2 shrink-0" style={{ background: d.color }} />
            <span className="text-xs text-muted">{d.name}</span>
            <span className="text-xs font-medium tabular-nums">{formatDurationHuman(d.seconds)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
