import type { Metadata, Viewport } from 'next'
import { RequireApp } from '@/common/apps/components/RequireApp'
import { LadderProvider } from '@/common/apps/ladder/LadderProvider'
import { LadderShell } from '@/common/apps/ladder/components/LadderShell'

// Ladder job tracker. The site is a static export, so every route here is one static page and
// ids travel in the query string; no Firebase Hosting rewrite is needed (cleanUrls serves
// /apps/ladder/job from job.html):
//   /apps/ladder                 jobs split view; ?job=<slug> plus filters (status, rating,
//                                sponsorship, region, payMin, payMax, tags)
//   /apps/ladder/job?slug=       one job on its own page
//   /apps/ladder/companies       company watchlist
//   /apps/ladder/company?slug=   one company
//   /apps/ladder/resume          base resume and generated PDFs
// The tracker is chosen in the app (stored in localStorage); ?t=anand|kavya preselects it.
export const metadata: Metadata = {
  title: 'Ladder',
  manifest: '/apps/manifest-ladder.json',
  icons: {
    icon: { url: '/apps/icon-ladder.svg', type: 'image/svg+xml' },
    apple: '/apps/icon-ladder-180.png',
  },
  appleWebApp: { capable: true, title: 'Ladder', statusBarStyle: 'default' },
  other: { 'mobile-web-app-capable': 'yes' },
}

export const viewport: Viewport = {
  // The page background of the light and dark themes (global tokens.css --bg).
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f4ef' },
    { media: '(prefers-color-scheme: dark)', color: '#1b1815' },
  ],
}

export default function LadderLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireApp app="ladder">
      <LadderProvider>
        <LadderShell>{children}</LadderShell>
      </LadderProvider>
    </RequireApp>
  )
}
