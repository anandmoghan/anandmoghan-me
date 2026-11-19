import type { Metadata, Viewport } from 'next'
import { RequireAdmin } from '@/common/apps/admin/RequireAdmin'
import { AdminTabBar } from '@/common/apps/admin/AdminTabBar'

export const metadata: Metadata = {
  title: 'Admin',
  manifest: '/apps/manifest-admin.json',
  icons: {
    icon: { url: '/apps/icons/admin.svg', type: 'image/svg+xml' },
    apple: '/apps/icons/admin-180.png',
  },
  appleWebApp: { capable: true, title: 'Admin', statusBarStyle: 'default' },
  other: { 'mobile-web-app-capable': 'yes' },
}

export const viewport: Viewport = {
  // The page background of the light and dark themes (global tokens.css --bg).
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f4ef' },
    { media: '(prefers-color-scheme: dark)', color: '#1b1815' },
  ],
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAdmin>
      <div className="with-tab-bar relative min-h-[calc(100vh-56px-env(safe-area-inset-top))]">
        {children}
        <AdminTabBar />
      </div>
    </RequireAdmin>
  )
}
