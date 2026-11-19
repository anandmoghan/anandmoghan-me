import type { Metadata, Viewport } from 'next';
import { standaloneMetadata, standaloneViewport } from '@/common/apps/standalone/metadata';
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
  ...standaloneMetadata('materials'),
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export const viewport: Viewport = standaloneViewport('materials');

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
