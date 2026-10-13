'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker
      .register('/apps/expense-sw.js', { scope: '/apps/expense' })
      .catch(() => {})
  }, [])
  return null
}
