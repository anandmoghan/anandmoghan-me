import type { Metadata, Viewport } from 'next'
import { RequireApp } from '@/common/apps/components/RequireApp'
import { PlannerProvider } from '@/common/apps/planner/PlannerProvider'
import { PlannerShell } from '@/common/apps/planner/PlannerShell'

// Planner: a shared calendar (mirrored from the iPhone by a Shortcut and the Mac server) and
// private habits. One static page per route:
//   /apps/planner          calendar, one week at a time
//   /apps/planner/tasks    tasks, yours and the ones shared with the household
//   /apps/planner/habits   habit list with this week's ticks
//   /apps/planner/setup    colour, Shortcut keys and the Shortcut steps
export const metadata: Metadata = {
  title: 'Planner',
  manifest: '/apps/manifest-planner.json',
  icons: {
    icon: { url: '/apps/icon-planner.svg', type: 'image/svg+xml' },
    apple: '/apps/icon-planner-180.png',
  },
  appleWebApp: { capable: true, title: 'Planner', statusBarStyle: 'default' },
  other: { 'mobile-web-app-capable': 'yes' },
}

export const viewport: Viewport = {
  // The page background of the light and dark themes (global tokens.css --bg).
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f4ef' },
    { media: '(prefers-color-scheme: dark)', color: '#1b1815' },
  ],
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
