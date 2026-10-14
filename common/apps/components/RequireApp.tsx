'use client'

import type { ReactNode } from 'react'
import { useAuth } from '@/common/firebase/AuthProvider'
import { Card } from '../shell/Card'
import { RequireAuth } from './RequireAuth'

// Shown to signed-in users without the app. Renders before any data hook, so it makes no
// Firestore or Storage requests.
export function RestrictedNotice() {
  return (
    <div className="site-container py-16">
      <Card className="mx-auto max-w-md space-y-2 text-center">
        <h1 className="text-lg font-extrabold">Restricted</h1>
        <p className="text-sm text-muted">This area is restricted to Anand and family.</p>
        <p className="text-sm text-muted">
          If you were just given access, verify your email and reload the page.
        </p>
      </Card>
    </div>
  )
}

function AppGate({ app, children }: { app: string; children: ReactNode }) {
  const { isAdmin, apps } = useAuth()
  if (isAdmin || apps.includes(app)) return <>{children}</>
  return <RestrictedNotice />
}

// Signed-in user who is an admin or has `app` in the apps claim (verified email, mirrored from
// roles/{email}). Firestore and Storage rules enforce the same check; this only spares
// everyone else a page of permission errors.
export function RequireApp({ app, children }: { app: string; children: ReactNode }) {
  return (
    <RequireAuth>
      <AppGate app={app}>{children}</AppGate>
    </RequireAuth>
  )
}
