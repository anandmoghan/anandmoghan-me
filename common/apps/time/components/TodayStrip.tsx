'use client'

import { formatDurationHuman, duration } from '../schema'
import type { Category, Session } from '../types'

interface TodayStripProps {
  sessions: Session[]
  categoryMap: Record<string, Category>
}

export function TodayStrip({ sessions, categoryMap }: TodayStripProps) {
  if (sessions.length === 0) return null

  // Aggregate by category (sealed sessions only for totals)
  const byCat: Record<string, { seconds: number; count: number }> = {}
  for (const s of sessions) {
    if (s.endedAt === null) continue // active session shown separately
    const dur = duration(s)
    if (!byCat[s.categoryId]) byCat[s.categoryId] = { seconds: 0, count: 0 }
    byCat[s.categoryId].seconds += dur
    byCat[s.categoryId].count += 1
  }

  const entries = Object.entries(byCat)
  if (entries.length === 0) return null

  return (
    <div className="px-4">
      <p className="text-xs text-muted uppercase tracking-wide font-medium mb-2">Today</p>
      <div className="flex flex-col gap-1.5">
        {entries.map(([cid, { seconds, count }]) => {
          const cat = categoryMap[cid]
          return (
            <div key={cid} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span>{cat?.icon ?? '?'}</span>
                <span className="text-foreground">{cat?.name ?? cid}</span>
              </div>
              <div className="flex items-center gap-3 text-muted">
                <span>{formatDurationHuman(seconds)}</span>
                <span className="text-xs">{count}×</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
