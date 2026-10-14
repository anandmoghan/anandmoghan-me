'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Domain } from './DomainScope'

export interface Tab {
  href: string
  label: string
  icon: ReactNode
  /** Active only on this exact path; otherwise on any path under it. */
  exact?: boolean
  /** Overrides the path match, for tabs driven by query parameters. */
  active?: boolean
  /** Shows an unread dot on the icon. */
  dot?: boolean
  /** A link into another area: tints its icon in that area's colour. */
  domain?: Domain
}

function isActive(tab: Tab, pathname: string): boolean {
  if (tab.active !== undefined) return tab.active
  if (tab.exact) return pathname === tab.href || pathname === `${tab.href}/`
  return pathname.startsWith(tab.href)
}

// Fixed bottom tabs (global app.css .tab-bar). Pair with .with-tab-bar on the page body.
export function TabBar({ tabs, label = 'App' }: { tabs: Tab[]; label?: string }) {
  const pathname = usePathname()

  return (
    <nav aria-label={label} className={tabs.length > 5 ? 'tab-bar tab-bar--dense' : 'tab-bar'}>
      <ul className="tab-bar__list">
        {tabs.map((tab) => {
          const active = isActive(tab, pathname)
          const classes = ['tab-bar__link', tab.domain ? `tab-bar__link--tinted domain-${tab.domain}` : '']
            .filter(Boolean)
            .join(' ')
          return (
            <li key={tab.href} className="tab-bar__item">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                onClick={() => window.scrollTo({ top: 0 })}
                className={classes}
              >
                <span className="tab-bar__icon">
                  {tab.icon}
                  {tab.dot && <span className="tab-bar__dot" aria-hidden />}
                </span>
                <span className="tab-bar__label">{tab.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
