'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/common/firebase/AuthProvider'
import { Spinner } from './Spinner'

// Client-side guard (static export has no server to redirect). Wrap the page
// content of every route that needs a signed-in user.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/apps/login?return=${encodeURIComponent(pathname)}`)
    }
  }, [loading, user, router, pathname])

  if (loading || !user) return <Spinner text="Loading" />

  return <>{children}</>
}
