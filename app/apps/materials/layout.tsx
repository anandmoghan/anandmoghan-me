import type { Metadata, Viewport } from 'next';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import { RequireApp } from '@/common/apps/components/RequireApp';
import { MaterialsIndexProvider } from './_components/MaterialsData';
import './materials.css';

// Materials is restricted to admins and the materials app (roles/{email}). The static export
// holds only route shells: generateStaticParams emits page and chapter slugs (names, not
// content) so the URLs stay /apps/materials/<page>[/<chapter>|/all], and every route loads
// materials/index.json and its article HTML from Cloud Storage after sign-in. storage.rules
// enforces the access; publish with scripts/publish-materials.ts. Not indexed (firebase.json
// also sends X-Robots-Tag). shell.css (the doc layout) is linked here rather than in the root
// layout so only materials routes load it.
export const metadata: Metadata = {
  title: 'Materials',
  manifest: '/apps/manifest-materials.json',
  icons: {
    icon: { url: '/apps/icons/materials.svg', type: 'image/svg+xml' },
    apple: '/apps/icons/materials-180.png',
  },
  appleWebApp: { capable: true, title: 'Materials', statusBarStyle: 'default' },
  other: { 'mobile-web-app-capable': 'yes' },
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export const viewport: Viewport = {
  // The page background of the light and dark themes (global tokens.css --bg).
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f4ef' },
    { media: '(prefers-color-scheme: dark)', color: '#1b1815' },
  ],
};

export default function MaterialsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/global/styles/shell.css" precedence="default" />
      <RequireApp app="materials">
        <MaterialsIndexProvider>{children}</MaterialsIndexProvider>
      </RequireApp>
    </>
  );
}
