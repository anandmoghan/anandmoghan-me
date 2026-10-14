import type { Metadata } from 'next'
import { RequireApp } from '@/common/apps/components/RequireApp'
import { PlannerProvider } from '@/common/apps/planner/PlannerProvider'
import { PlannerShell } from '@/common/apps/planner/PlannerShell'

// Planner: a shared calendar (mirrored from the iPhone by a Shortcut and the Mac server) and
// private habits. One static page per route:
//   /apps/planner          calendar, one week at a time
//   /apps/planner/habits   habit list with this week's ticks
//   /apps/planner/setup    colour, Shortcut keys and the Shortcut steps
export const metadata: Metadata = {
  title: 'Planner',
}

export default function PlannerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireApp app="planner">
      <PlannerProvider>
        <PlannerShell>{children}</PlannerShell>
      </PlannerProvider>
    </RequireApp>
  )
}
