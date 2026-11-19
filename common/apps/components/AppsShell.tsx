'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { DomainScope, type Domain } from '../shell/DomainScope'
import { apps } from '../registry'

const SHARE_PATH = '/apps/share'

function scopeFor(pathname: string): { domain: Domain; accent?: string } {
  if (pathname.startsWith(SHARE_PATH)) return { domain: 'share' }
  const app = apps.find((a) => pathname.startsWith(a.path))
  return { domain: app?.domain ?? 'home', accent: app?.accent }
}

// App scope for everything under /apps: .app plus the current area's .domain-<name>.
// Header, footer, progress bar and theme sync come from the root layout.
export function AppsShell({ children }: { children: ReactNode }) {
  const { domain, accent } = scopeFor(usePathname())

  return (
    <DomainScope domain={domain} accent={accent} app className="apps-shell flex flex-1 flex-col">
      {children}
    </DomainScope>
  )
}
