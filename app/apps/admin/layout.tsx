import type { Metadata, Viewport } from 'next'
import { standaloneMetadata, standaloneViewport } from '@/common/apps/standalone/metadata'
import { RequireAdmin } from '@/common/apps/admin/RequireAdmin'
import { AdminTabBar } from '@/common/apps/admin/AdminTabBar'

export const metadata: Metadata = standaloneMetadata('admin')

export const viewport: Viewport = standaloneViewport('admin')

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
