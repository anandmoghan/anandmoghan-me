'use client'

import type { ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Card } from '../../shell/Card'
import { PageSkeleton } from '../../shell/Skeleton'
import { TabBar, type Tab } from '../../shell/TabBar'
import { LadderIcon } from '../../shell/icons'
import { useLadder } from '../LadderProvider'
import { TRACKER_CONFIG } from '../trackers'

const navIcon = (path: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    width={22}
    height={22}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {path}
  </svg>
)

const BuildingIcon = navIcon(<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18M8 8h3M8 12h3M8 16h3" />)
const DocIcon = navIcon(<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm7 0v5h5M9 13h6M9 17h6" />)

function TrackerSwitcher() {
  const { trackers, tracker, setTracker } = useLadder()
  const router = useRouter()
  const pathname = usePathname()
  if (trackers.length < 2) return null

  return (
    <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Tracker">
      <span className="text-sm font-bold text-muted">Tracker</span>
      {trackers.map((t) => (
        <button
          key={t}
          type="button"
          aria-pressed={tracker === t}
          className="chip"
          onClick={() => {
            if (t === tracker) return
            setTracker(t)
            // Job and company ids belong to one tracker: go back to that section's list.
            router.replace(pathname.startsWith('/apps/ladder/compan') ? '/apps/ladder/companies' : pathname === '/apps/ladder/resume' ? pathname : '/apps/ladder')
          }}
        >
          {TRACKER_CONFIG[t].label}
        </button>
      ))}
    </div>
  )
}

// Chrome for every /apps/ladder page: access gate, tracker switcher and bottom tabs.
export function LadderShell({ children }: { children: ReactNode }) {
  const { trackers, accessReady, loading, error } = useLadder()
  const pathname = usePathname()

  const tabs: Tab[] = [
    {
      href: '/apps/ladder',
      label: 'Jobs',
      icon: <LadderIcon />,
      active: pathname === '/apps/ladder' || pathname === '/apps/ladder/' || pathname.startsWith('/apps/ladder/job'),
    },
    { href: '/apps/ladder/companies', label: 'Companies', icon: BuildingIcon, active: pathname.startsWith('/apps/ladder/compan') },
    { href: '/apps/ladder/resume', label: 'Resume', icon: DocIcon },
  ]

  let body: ReactNode
  if (!accessReady) {
    body = <PageSkeleton />
  } else if (trackers.length === 0) {
    body = (
      <div className="site-container py-12">
        <Card className="max-w-xl">
          <h1 className="text-xl font-extrabold">No ladder access</h1>
          <p className="mt-2 text-sm text-muted">
            This account has the ladder app but no job trackers. Ask Anand to add a tracker to your role.
          </p>
        </Card>
      </div>
    )
  } else {
    body = (
      <>
        <div className="site-container pt-3">
          <TrackerSwitcher />
          {error && <p className="field-error mt-2">Could not load ladder data: {error}</p>}
        </div>
        {loading ? <PageSkeleton /> : children}
      </>
    )
  }

  // The jobs split fits the viewport on desktop and scrolls its two panes; other pages scroll as a page.
  const fitsViewport = pathname === '/apps/ladder' || pathname === '/apps/ladder/'

  return (
    <div
      className={`with-tab-bar relative flex-1 ${
        fitsViewport ? 'md:flex md:h-[calc(100dvh-var(--topbar-height))] md:flex-none md:flex-col' : ''
      }`}
    >
      {body}
      {trackers.length > 0 && <TabBar tabs={tabs} label="Ladder" />}
    </div>
  )
}
