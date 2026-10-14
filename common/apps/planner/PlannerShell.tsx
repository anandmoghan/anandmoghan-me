'use client'

import type { ReactNode } from 'react'
import { PageSkeleton } from '../shell/Skeleton'
import { TabBar, type Tab } from '../shell/TabBar'
import { CalendarIcon, ClockIcon, GearIcon } from '../shell/icons'
import { usePlanner } from './PlannerProvider'

// Chrome for every /apps/planner page: bottom tabs and the wait for the user's profile.
export function PlannerShell({ children }: { children: ReactNode }) {
  const { ready, error } = usePlanner()
  const base = '/apps/planner'

  const tabs: Tab[] = [
    { href: base, label: 'Calendar', icon: <CalendarIcon />, exact: true },
    { href: `${base}/habits`, label: 'Habits', icon: <ClockIcon /> },
    { href: `${base}/setup`, label: 'Setup', icon: <GearIcon /> },
  ]

  return (
    <div className="with-tab-bar relative flex-1">
      {error && <p className="field-error site-container pt-3">Could not load the planner: {error}</p>}
      {ready ? children : error ? null : <PageSkeleton />}
      <TabBar tabs={tabs} label="Planner" />
    </div>
  )
}
