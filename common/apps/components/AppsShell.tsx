'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { DomainScope, type Domain } from '../shell/DomainScope'
import { apps } from '../registry'

const SHARE_PATH = '/apps/share'

function domainFor(pathname: string): Domain {
  if (pathname.startsWith(SHARE_PATH)) return 'share'
  return apps.find((a) => pathname.startsWith(a.path))?.domain ?? 'home'
}

// App scope for everything under /apps: .app plus the current area's .domain-<name>.
// Header, footer, progress bar and theme sync come from the root layout.
export function AppsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <DomainScope domain={domainFor(pathname)} app className="apps-shell flex flex-1 flex-col">
      {children}
    </DomainScope>
  )
}
