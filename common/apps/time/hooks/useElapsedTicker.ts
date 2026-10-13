'use client'

import { useState, useEffect } from 'react'

/**
 * Returns elapsed seconds since `startedAt`, updating every second.
 * IMPORTANT: elapsed is always derived from startedAt on each render tick,
 * never accumulated in state — this prevents drift when the tab is backgrounded.
 */
export function useElapsedTicker(startedAt: Date | null): number {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!startedAt) return
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [startedAt?.getTime()])

  if (!startedAt) return 0
  return Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000))
}
