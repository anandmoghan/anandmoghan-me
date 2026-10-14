import type { Metadata, Viewport } from 'next'
import { RequireAuth } from '@/common/apps/components/RequireAuth'
import { BottomTabBar } from '@/common/apps/time/components/BottomTabBar'

export const metadata: Metadata = {
  title: 'Time',
  manifest: '/apps/manifest-time.json',
  icons: {
    icon: { url: '/apps/icon-time.svg', type: 'image/svg+xml' },
    apple: '/apps/icon-time-180.png',
  },
  appleWebApp: { capable: true, title: 'Time', statusBarStyle: 'default' },
  other: { 'mobile-web-app-capable': 'yes' },
}

export const viewport: Viewport = {
  // The page background of the light and dark themes (global tokens.css --bg).
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f4ef' },
    { media: '(prefers-color-scheme: dark)', color: '#1b1815' },
  ],
}

export default function TimeLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="with-tab-bar relative min-h-[calc(100vh-56px-env(safe-area-inset-top))]">
        {children}
        <BottomTabBar />
      </div>
    </RequireAuth>
  )
}
