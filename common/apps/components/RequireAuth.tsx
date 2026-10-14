'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/common/firebase/AuthProvider'
import { Spinner } from './Spinner'

// Client-side guard (static export has no server to redirect). Wrap the page
// content of every route that needs a signed-in user. An anonymous session counts as
// signed out.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isAnonymous, loading } = useAuth()
  const signedIn = !!user && !isAnonymous
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !signedIn) {
      router.replace(`/apps/login?return=${encodeURIComponent(pathname)}`)
    }
  }, [loading, signedIn, router, pathname])

  if (loading || !signedIn) return <Spinner text="Loading" />

  return <>{children}</>
}
