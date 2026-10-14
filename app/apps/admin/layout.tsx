import type { Metadata } from 'next'
import { RequireAdmin } from '@/common/apps/admin/RequireAdmin'
import { AdminTabBar } from '@/common/apps/admin/AdminTabBar'

export const metadata: Metadata = { title: 'Admin' }

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
