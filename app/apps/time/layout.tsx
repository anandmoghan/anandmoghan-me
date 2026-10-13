import type { Metadata, Viewport } from 'next'
import { RequireAuth } from '@/common/apps/components/RequireAuth'
import { BottomTabBar } from '@/common/apps/time/components/BottomTabBar'

export const metadata: Metadata = {
  title: 'Time',
  manifest: '/apps/manifest-time.json',
  icons: {
    icon: { url: '/apps/icon-time.svg', type: 'image/svg+xml' },
    apple: '/apps/icon-time.svg',
  },
  appleWebApp: { capable: true, title: 'Time', statusBarStyle: 'black-translucent' },
  other: { 'mobile-web-app-capable': 'yes' },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
}

export default function TimeLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="relative min-h-[calc(100vh-56px-env(safe-area-inset-top))] pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {children}
        <BottomTabBar />
      </div>
    </RequireAuth>
  )
}
