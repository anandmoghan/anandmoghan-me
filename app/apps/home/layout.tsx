import type { Metadata, Viewport } from 'next'
import { standaloneMetadata, standaloneViewport } from '@/common/apps/standalone/metadata'
import { RequireApp } from '@/common/apps/components/RequireApp'
import { HomeProvider } from '@/common/apps/home/HomeProvider'
import { HomeShell } from '@/common/apps/home/HomeShell'
import './home.css'

// Home: lights, switches, scenes and automations from Home Assistant, through the home-server
// API (/home on api.anandmoghan.me), live over its event stream. One static page per tab:
//   /apps/home              rooms, scenes and device tiles
//   /apps/home/automations  every automation, with enable, disable and Run now
export const metadata: Metadata = standaloneMetadata('home')

export const viewport: Viewport = standaloneViewport('home')

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireApp app="home">
      <HomeProvider>
        <HomeShell>{children}</HomeShell>
      </HomeProvider>
    </RequireApp>
  )
}
