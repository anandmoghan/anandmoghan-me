'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// The old app settings route; Settings now lives at /settings.
export default function Page() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/settings')
  }, [router])
  return null
}
