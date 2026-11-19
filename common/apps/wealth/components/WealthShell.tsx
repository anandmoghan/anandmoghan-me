'use client'

import type { ReactNode } from 'react'
import { BottomTabBar } from './BottomTabBar'

export function WealthShell({ children }: { children: ReactNode }) {
  return (
    <div className="with-tab-bar relative min-h-[calc(100vh-56px-env(safe-area-inset-top))]">
      {children}
      <BottomTabBar />
    </div>
  )
}
