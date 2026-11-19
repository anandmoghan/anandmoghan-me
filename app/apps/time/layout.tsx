import type { Metadata, Viewport } from 'next'
import { standaloneMetadata, standaloneViewport } from '@/common/apps/standalone/metadata'
import { RequireAuth } from '@/common/apps/components/RequireAuth'
import { BottomTabBar } from '@/common/apps/time/components/BottomTabBar'

export const metadata: Metadata = standaloneMetadata('time')

export const viewport: Viewport = standaloneViewport('time')

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
