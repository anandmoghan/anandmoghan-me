// Doc layout from global shell.css (sticky left pane, centred column, chapter nav) under the
// apps header. The article is either JSX or a rendered HTML string; with a string the
// fragments' <section>s stay direct children of .content, which shell.css relies on.
import type { ReactNode } from 'react';
import { MaterialsBehaviour } from './MaterialsBehaviour';

interface MaterialsShellProps {
  sidebar: ReactNode;
  children?: ReactNode;
  html?: string;
  footer?: ReactNode;
}

export function MaterialsShell({ sidebar, children, html, footer }: MaterialsShellProps) {
  return (
    <div className="materials prose">
      <div className="layout">
        <aside className="sidebar" id="sidebar" aria-label="Navigation">
          <nav className="pane" aria-label="Navigation">
            {sidebar}
          </nav>
        </aside>
        <div className="drawer-backdrop" />
        <div className="main">
          {html !== undefined ? (
            <article className="content" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <article className="content">{children}</article>
          )}
          {footer}
        </div>
      </div>
      <MaterialsBehaviour />
    </div>
  );
}
