'use client'

import type { ReactNode } from 'react'
import { useAuth } from '@/common/firebase/AuthProvider'
import { RequireAuth } from '../components/RequireAuth'
import { Card } from '../shell/Card'

function AdminGate({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  if (isAdmin) return <>{children}</>
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <Card className="space-y-2 text-center">
        <h1 className="text-lg font-extrabold">Admins only</h1>
        <p className="text-sm text-muted">
          This account has no admin role. If one was just granted, reload the page.
        </p>
      </Card>
    </div>
  )
}

// Signed-in user with the admin claim (verified email). The rules enforce the same check, so
// this only spares non-admins a page of permission errors.
export function RequireAdmin({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AdminGate>{children}</AdminGate>
    </RequireAuth>
  )
}
