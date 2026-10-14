import type { Metadata } from 'next';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import './materials.css';

// Materials is public and indexed, unlike the rest of /apps. shell.css (the doc layout) is
// linked here rather than in the root layout so only materials routes load it.
export const metadata: Metadata = {
  title: 'Materials',
  robots: { index: true, follow: true },
};

export default function MaterialsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/global/styles/shell.css" precedence="default" />
      {children}
    </>
  );
}
