import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import { ProfileMenu } from './ProfileMenu'
import { useAuth } from '../hooks/useAuth'
import type { AppDefinition } from '../types'

interface LayoutProps {
  children: ReactNode
  apps: AppDefinition[]
}

function getAppName(pathname: string, apps: AppDefinition[]): string | null {
  for (const app of apps) {
    if (pathname.startsWith(app.path)) return app.name
  }
  return null
}

export function Layout({ children, apps }: LayoutProps) {
  const { user } = useAuth()
  const location = useLocation()
  const appName = getAppName(location.pathname, apps)

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2 text-sm">
              <Link to="/" className="font-semibold hover:text-muted transition-colors">
                Apps
              </Link>
              {appName && (
                <>
                  <span className="text-muted">/</span>
                  <span className="text-muted">{appName}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {user ? (
                <ProfileMenu />
              ) : (
                location.pathname !== '/login' && (
                  <Link
                    to="/login"
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
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
