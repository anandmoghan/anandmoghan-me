'use client'

import { useElapsedTicker } from '../hooks/useElapsedTicker'
import { formatDuration } from '../schema'
import type { Category, Session } from '../types'

interface ActiveTimerProps {
  session: Session
  category: Category | undefined
}

export function ActiveTimer({ session, category }: ActiveTimerProps) {
  const elapsed = useElapsedTicker(session.startedAt)

  return (
    <div className="flex flex-col items-center py-6">
      {/* Pulsing ring */}
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
        <div className="relative w-20 h-20 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center">
          <span className="text-3xl">{category?.icon ?? '⏱️'}</span>
        </div>
      </div>

      <p className="text-sm font-medium text-muted mb-1">
        {category?.name ?? 'Unknown'}
      </p>

      <p className="text-4xl font-bold tracking-tight tabular-nums text-foreground">
        {formatDuration(elapsed)}
      </p>

      <p className="text-xs text-muted mt-1">
        started {session.startedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  )
}
