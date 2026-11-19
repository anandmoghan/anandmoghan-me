'use client'

import type { ReactNode } from 'react'
import { HomeGlyph } from '../icons/home'
import { PageSkeleton } from '../shell/Skeleton'
import { TabBar, type Tab } from '../shell/TabBar'
import { AutomationGlyph } from './glyphs'
import { useHome } from './HomeProvider'

// Chrome for every /apps/home page: bottom tabs, the failed-action notice and the first load.
export function HomeShell({ children }: { children: ReactNode }) {
  const { state, loadError, notice, dismissNotice, reload } = useHome()
  const base = '/apps/home'

  const tabs: Tab[] = [
    { href: base, label: 'Home', icon: <HomeGlyph />, exact: true },
    { href: `${base}/automations`, label: 'Automations', icon: <AutomationGlyph /> },
  ]

  return (
    <div className="home-app with-tab-bar relative flex-1">
      <div className="home-notice-slot site-container" aria-live="assertive">
        {notice && (
          <p className="home-notice" role="alert">
            <span className="min-w-0 flex-1">{notice}</span>
            <button type="button" className="btn btn--sm btn--ghost" onClick={dismissNotice}>Dismiss</button>
          </p>
        )}
      </div>
      {state ? (
        children
      ) : loadError ? (
        <div className="site-container py-16 text-center">
          <p className="font-bold">Could not load your home</p>
          <p className="mt-1 text-sm text-muted">{loadError}</p>
          <button type="button" className="btn btn--primary mt-4" onClick={reload}>Try again</button>
        </div>
      ) : (
        <PageSkeleton rows={3} />
      )}
      <TabBar tabs={tabs} label="Home" />
    </div>
  )
}
