'use client'

import { useEffect, type ReactNode } from 'react'
import { BottomTabBar } from './BottomTabBar'

// Registers the wealth service worker (scope limited to /apps/wealth/).
function useServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker
      .register('/apps/wealth-sw.js', { scope: '/apps/wealth' })
      .catch(() => {})
  }, [])
}

export function WealthShell({ children }: { children: ReactNode }) {
  useServiceWorker()

  return (
    <div className="relative min-h-[calc(100vh-56px-env(safe-area-inset-top))] pb-[calc(4rem+env(safe-area-inset-bottom))]">
      {children}
      <BottomTabBar />
    </div>
  )
}
