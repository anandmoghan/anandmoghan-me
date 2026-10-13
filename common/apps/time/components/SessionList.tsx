'use client'

import { useState } from 'react'
import { formatDuration, formatDurationHuman, duration } from '../schema'
import { SessionEditModal } from './SessionEditModal'
import type { Category, Session } from '../types'

const PAGE_SIZE = 20

interface SessionListProps {
  sessions: Session[]
  categories: Category[]
  categoryMap: Record<string, Category>
  uid: string
  tz: string
  filteredCategoryId: string | null
}

export function SessionList({ sessions, categories, categoryMap, uid, tz, filteredCategoryId }: SessionListProps) {
  const [editSession, setEditSession] = useState<Session | null>(null)
  const [page, setPage] = useState(1)

  const filtered = filteredCategoryId
    ? sessions.filter(s => s.categoryId === filteredCategoryId)
    : sessions

  // Sort newest first
  const sorted = [...filtered].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
  const visible = sorted.slice(0, page * PAGE_SIZE)
  const hasMore = sorted.length > visible.length

  if (sorted.length === 0) {
    return (
      <div className="text-center py-8 text-muted text-sm px-4">
        <p className="text-2xl mb-2">📋</p>
        <p>No sessions in this range.</p>
      </div>
    )
  }

  return (
    <div className="px-4">
      <div className="space-y-2">
        {visible.map(session => {
          const cat = categoryMap[session.categoryId]
          const dur = duration(session)
          const isActive = session.endedAt === null

          return (
            <button
              key={session.id}
              onClick={() => setEditSession(session)}
              className="w-full flex items-center gap-3 border border-border p-3 hover:bg-muted/10 transition-colors text-left"
            >
              <span className="text-xl shrink-0">{cat?.icon ?? '?'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{cat?.name ?? session.categoryId}</p>
                  {isActive && (
                    <span className="inline-flex items-center gap-0.5 border border-accent text-accent text-[8px] font-bold tracking-wider px-1 py-px shrink-0 uppercase leading-none">
                      <span className="w-1 h-1 rounded-full bg-accent animate-pulse shrink-0" />
                      Live
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted">
                  {session.startedAt.toLocaleString([], {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                  {session.endedAt && ` – ${session.endedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium tabular-nums">{formatDuration(dur)}</p>
              </div>
            </button>
          )
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setPage(p => p + 1)}
          className="mt-3 w-full py-2 text-sm text-muted hover:text-foreground border border-border transition-colors"
        >
          Load more ({sorted.length - visible.length} remaining)
        </button>
      )}

      {editSession && (
        <SessionEditModal
          session={editSession}
          categories={categories}
          uid={uid}
          tz={tz}
          onClose={() => setEditSession(null)}
        />
      )}
    </div>
  )
}
