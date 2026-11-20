'use client'

import { useEffect, type ReactNode } from 'react'
import { ProfileMenu } from '../components/ProfileMenu'
import { PageSkeleton } from '../shell/Skeleton'
import { TabBar, type Tab } from '../shell/TabBar'
import { AutomationTabGlyph, EnergyTabGlyph, HomeTabGlyph } from './glyphs'
import { useHome } from './HomeProvider'

// Chrome for every /apps/home page: the wallpaper, an account button in place of the site header
// (hidden while Home is open, see home.css), bottom tabs, the failed-action notice and the first load.
export function HomeShell({ children }: { children: ReactNode }) {
  const { state, loadError, notice, dismissNotice, reload } = useHome()
  const base = '/apps/home'

  useEffect(() => {
    document.body.classList.add('home-immersive')
    return () => document.body.classList.remove('home-immersive')
  }, [])

  const tabs: Tab[] = [
    { href: base, label: 'Home', icon: <HomeTabGlyph size={26} />, exact: true },
    { href: `${base}/automations`, label: 'Automation', icon: <AutomationTabGlyph size={26} /> },
    { href: `${base}/energy`, label: 'Energy', icon: <EnergyTabGlyph size={26} /> },
  ]

  return (
    <div className="home-app with-tab-bar relative flex-1">
      <div className="home-topbar site-container">
        <ProfileMenu />
      </div>
      <div className="home-notice-slot site-container" aria-live="assertive">
        {notice && (
          <p className="home-notice" role="alert">
            <span className="min-w-0 flex-1">{notice}</span>
            <button type="button" className="home-notice__dismiss" onClick={dismissNotice}>Dismiss</button>
          </p>
        )}
      </div>
      {state ? (
        children
      ) : loadError ? (
        <div className="site-container home-empty">
          <p className="home-empty__title">Could not load your home</p>
          <p>{loadError}</p>
          <button type="button" className="home-empty__retry" onClick={reload}>Try again</button>
        </div>
      ) : (
        <PageSkeleton rows={3} />
      )}
      <TabBar tabs={tabs} label="Home" />
    </div>
  )
}
