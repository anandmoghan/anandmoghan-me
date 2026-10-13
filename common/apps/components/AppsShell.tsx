'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/common/firebase/AuthProvider'
import { ThemeToggle } from '@/common/components/ThemeToggle'
import { ProfileMenu } from './ProfileMenu'
import { ThemeSync } from './ThemeSync'
import { apps } from '../registry'

function Header() {
  const { user, displayName, signOut } = useAuth()
  const pathname = usePathname()
  const appName = apps.find(app => pathname.startsWith(app.path))?.name ?? null
  const isShareRoute = pathname.startsWith('/apps/share')

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm pt-[env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2 text-sm">
            {!isShareRoute && (
              <>
                <Link href="/apps" className="font-semibold hover:text-muted transition-colors">
                  Apps
                </Link>
                {appName && (
                  <>
                    <span className="text-muted">/</span>
                    <span className="text-muted">{appName}</span>
                  </>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user?.isAnonymous ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">Viewing as {displayName}</span>
                <button
                  onClick={() => signOut()}
                  className="text-sm font-medium px-3 py-1.5 rounded-md border border-border hover:bg-muted/20 transition-colors"
                >
                  Log out
                </button>
              </div>
            ) : user ? (
              <ProfileMenu />
            ) : (
              pathname !== '/apps/login' && !isShareRoute && (
                <Link
                  href="/apps/login"
                  className="text-sm font-medium px-3 py-1.5 rounded-md border border-border hover:bg-muted/20 transition-colors"
                >
                  Sign in
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

// Client chrome for everything under /apps: auth context, theme sync, header.
export function AppsShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ThemeSync />
      <div className="apps-shell min-h-screen bg-background text-foreground flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    </AuthProvider>
  )
}
