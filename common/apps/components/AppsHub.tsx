'use client'

import Link from 'next/link'
import { useAuth } from '@/common/firebase/AuthProvider'
import { apps } from '../registry'

export function AppsHub() {
  const { user } = useAuth()

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Apps</h1>
        <p className="mt-2 text-muted">Tools and dashboards by Anand.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {apps.map((app) => {
          const needsLogin = app.requiresAuth && !user
          const href = needsLogin
            ? `/apps/login?return=${encodeURIComponent(app.path)}`
            : app.path
          return (
            <div
              key={app.id}
              className="group flex flex-col rounded-lg border border-border bg-background p-6 shadow-sm hover:shadow-md hover:border-accent/30 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-3xl">{app.icon}</span>
                {needsLogin && (
                  <span className="text-xs text-muted border border-border rounded-full px-2 py-0.5">
                    Login required
                  </span>
                )}
              </div>
              <h2 className="font-semibold text-lg mb-1">{app.name}</h2>
              <p className="text-sm text-muted flex-1 mb-4">{app.description}</p>
              <Link
                href={href}
                className="mt-auto w-full py-2 px-4 rounded-md bg-foreground text-background text-sm font-medium text-center hover:bg-foreground/90 transition-colors"
              >
                Launch
              </Link>
            </div>
          )
        })}
      </div>

      {apps.length === 0 && (
        <p className="text-muted text-center py-20">No apps available yet.</p>
      )}
    </div>
  )
}
