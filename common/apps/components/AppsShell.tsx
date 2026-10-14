'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/common/firebase/AuthProvider'
import { ThemeToggle } from '@/common/components/ThemeToggle'
import { AppHeader } from '../shell/AppHeader'
import { DomainScope, type Domain } from '../shell/DomainScope'
import { NavProgress } from '../shell/NavProgress'
import { DOMAIN_ICON } from '../shell/icons'
import { ProfileMenu } from './ProfileMenu'
import { ThemeSync } from './ThemeSync'
import { apps } from '../registry'

const SHARE_PATH = '/apps/share'

function Header() {
  const { user, isAnonymous, displayName, signOut } = useAuth()
  const pathname = usePathname()
  const app = apps.find((a) => pathname.startsWith(a.path))
  const isShareRoute = pathname.startsWith(SHARE_PATH)
  const HubIcon = DOMAIN_ICON.home
  const AppIcon = app ? DOMAIN_ICON[app.domain] : undefined

  const actions = (
    <>
      <ThemeToggle />
      {isAnonymous && isShareRoute && displayName ? (
        <>
          <span className="hidden text-sm text-muted sm:inline">Viewing as {displayName}</span>
          <button type="button" onClick={() => signOut()} className="btn btn--sm">
            Log out
          </button>
        </>
      ) : user && !isAnonymous ? (
        <ProfileMenu />
      ) : (
        pathname !== '/apps/login' &&
        !isShareRoute && (
          <Link href="/apps/login" className="btn btn--sm">
            Sign in
          </Link>
        )
      )}
    </>
  )

  if (isShareRoute) return <AppHeader actions={actions} />

  if (app) {
    return (
      <AppHeader
        parent={{ href: '/apps', label: 'Apps' }}
        title={app.name}
        href={app.path}
        icon={AppIcon && <AppIcon size={20} />}
        actions={actions}
      />
    )
  }

  return (
    <AppHeader title="Apps" href="/apps" icon={HubIcon && <HubIcon size={20} />} actions={actions} />
  )
}

function domainFor(pathname: string): Domain {
  if (pathname.startsWith(SHARE_PATH)) return 'share'
  return apps.find((a) => pathname.startsWith(a.path))?.domain ?? 'home'
}

// Client chrome for everything under /apps: theme sync, the app root (.app plus the
// current area's .domain-<name>), progress bar and header. AuthProvider is in the root layout.
export function AppsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <>
      <ThemeSync />
      <DomainScope domain={domainFor(pathname)} app className="apps-shell flex min-h-screen flex-col">
        <NavProgress />
        <Header />
        <main className="flex flex-1 flex-col">{children}</main>
      </DomainScope>
    </>
  )
}
