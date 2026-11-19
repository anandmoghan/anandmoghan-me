'use client'

import { useAuth } from '@/common/firebase/AuthProvider'
import { apps, isListed } from '../registry'
import { Badge } from '../shell/Badge'
import { HubCard } from '../shell/Card'
import { DOMAIN_ICON } from '../shell/icons'

export function AppsHub() {
  const { user, isAnonymous, isAdmin, apps: granted } = useAuth()
  const listed = apps.filter((app) => isListed(app, isAdmin, granted))

  return (
    <div className="site-container py-8 sm:py-12">
      <h1 className="text-[1.65rem] font-extrabold leading-tight">Apps</h1>
      <p className="mt-1 text-[0.95rem] text-muted">Tools and dashboards by Anand.</p>

      <ul className="mt-6 grid auto-rows-fr gap-3 sm:grid-cols-2">
        {listed.map((app) => {
          const needsLogin = app.requiresAuth && (!user || isAnonymous)
          const href = needsLogin
            ? `/login?return=${encodeURIComponent(app.path)}`
            : app.path
          const Icon = DOMAIN_ICON[app.domain]
          return (
            <li key={app.id} className="flex">
              <HubCard
                href={href}
                title={app.name}
                domain={app.domain}
                accent={app.accent}
                icon={Icon && <Icon />}
                badge={
                  (needsLogin || app.restricted) && (
                    <>
                      {app.restricted && <Badge tone="gold">Restricted</Badge>}
                      {needsLogin && <Badge tone="muted">Login required</Badge>}
                    </>
                  )
                }
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
