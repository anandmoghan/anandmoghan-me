'use client'

import { useAuth } from '@/common/firebase/AuthProvider'
import { apps } from '../registry'
import { Badge } from '../shell/Badge'
import { HubCard } from '../shell/Card'
import { DOMAIN_ICON } from '../shell/icons'

export function AppsHub() {
  const { user, isAnonymous, isAdmin } = useAuth()
  const listed = apps.filter((app) => !app.adminOnly || isAdmin)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-[1.65rem] font-extrabold leading-tight">Apps</h1>
      <p className="mt-1 text-[0.95rem] text-muted">Tools and dashboards by Anand.</p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {listed.map((app) => {
          const needsLogin = app.requiresAuth && (!user || isAnonymous)
          const href = needsLogin
            ? `/apps/login?return=${encodeURIComponent(app.path)}`
            : app.path
          const Icon = DOMAIN_ICON[app.domain]
          return (
            <li key={app.id}>
              <HubCard
                href={href}
                title={app.name}
                domain={app.domain}
                icon={Icon && <Icon />}
                badge={needsLogin && <Badge tone="muted">Login required</Badge>}
                lines={[app.description]}
              />
            </li>
          )
        })}
      </ul>

      {listed.length === 0 && (
        <p className="py-20 text-center text-sm text-muted">No apps available yet.</p>
      )}
    </div>
  )
}
