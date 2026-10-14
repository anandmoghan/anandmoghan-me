// Left pane of the materials pages, one variant per page type (as in materials/scripts/build.mjs):
// home lists pages, a landing lists chapters, a chapter lists its h2 sections with prev/next,
// /all lists chapters as anchors.
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { MaterialsChapterMeta, MaterialsPage, MaterialsSection } from '@/common/types/materials';
import { MATERIALS_PATH, chapterHref, pageHref } from '@/common/utils/materials-paths';

export const pad2 = (n: number) => String(n).padStart(2, '0');

export function PrevIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function NextIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface PaneItem {
  href: string;
  label: string;
  num?: string;
  summary?: string;
}

// In-page anchors stay plain links (scrollspy targets); routes use Next links.
function PaneList({ items }: { items: PaneItem[] }) {
  return (
    <ul className="pane__list">
      {items.map((item) => {
        const body = (
          <>
            {item.num && <span className="pane__num">{item.num}</span>}
            <span className="pane__text">
              {item.label}
              {item.summary && <small>{item.summary}</small>}
            </span>
          </>
        );
        return (
          <li key={item.href}>
            {item.href.startsWith('#') ? <a href={item.href}>{body}</a> : <Link href={item.href}>{body}</Link>}
          </li>
        );
      })}
    </ul>
  );
}

function PaneBack({ href, label }: { href: string; label: string }) {
  return (
    <Link className="btn pane__back" href={href}>
      <PrevIcon />
      <span>{label}</span>
    </Link>
  );
}

// Compact Prev / Next pair stuck to the pane bottom; a missing end renders disabled.
function PanePager({ page, index }: { page: MaterialsPage; index: number }) {
  const button = (chapter: MaterialsChapterMeta | undefined, dir: 'prev' | 'next') => {
    const label: ReactNode =
      dir === 'prev' ? (
        <>
          <PrevIcon />
          <span>Prev</span>
        </>
      ) : (
        <>
          <span>Next</span>
          <NextIcon />
        </>
      );
    if (!chapter) {
      return (
        <span className="btn pane__pager-btn is-disabled" aria-disabled="true">
          {label}
        </span>
      );
    }
    return (
      <Link
        className="btn pane__pager-btn"
        href={chapterHref(page, chapter)}
        rel={dir}
        title={chapter.title}
        aria-label={`${dir === 'prev' ? 'Previous' : 'Next'} chapter: ${chapter.title}`}
      >
        {label}
      </Link>
    );
  };
  return (
    <div className="pane__pager">
      {button(page.chapters[index - 1], 'prev')}
      {button(page.chapters[index + 1], 'next')}
    </div>
  );
}

export function PaneHome({ pages }: { pages: MaterialsPage[] }) {
  return (
    <>
      <h2 className="pane__label">Pages</h2>
      <PaneList items={pages.map((p) => ({ href: pageHref(p), label: p.title }))} />
    </>
  );
}

export function PaneLanding({ page }: { page: MaterialsPage }) {
  return (
    <>
      <h2 className="pane__label">Chapters</h2>
      <PaneList
        items={page.chapters.map((c) => ({
          href: chapterHref(page, c),
          label: c.title,
          num: pad2(c.number),
          summary: c.summary,
        }))}
      />
    </>
  );
}

// Chapter pane: back button, heading, h2 sections, prev/next at the bottom.
export function PaneChapter({
  page,
  index,
  sections,
}: {
  page: MaterialsPage;
  index: number;
  sections: MaterialsSection[];
}) {
  const chapter = page.chapters[index];
  const multi = page.chapters.length > 1;
  return (
    <>
      {multi ? (
        <PaneBack href={pageHref(page)} label="All chapters" />
      ) : (
        <PaneBack href={MATERIALS_PATH} label="All pages" />
      )}
      <h2 className="pane__title">
        {multi && <span className="pane__num">{pad2(chapter.number)}</span>}
        {chapter.title}
      </h2>
      {sections.length ? (
        <PaneList items={sections.map((h) => ({ href: `#${h.id}`, label: h.text }))} />
      ) : (
        <p className="nav-empty">No sections.</p>
      )}
      {multi && <PanePager page={page} index={index} />}
    </>
  );
}

// /all: the chapters are the entries, anchored within the page.
export function PaneAll({ page }: { page: MaterialsPage }) {
  const multi = page.chapters.length > 1;
  return (
    <>
      {multi ? (
        <PaneBack href={pageHref(page)} label="All chapters" />
      ) : (
        <PaneBack href={MATERIALS_PATH} label="All pages" />
      )}
      <h2 className="pane__label">On this page</h2>
      <PaneList
        items={page.chapters.map((c) => ({
          href: `#chapter-${c.slug}`,
          label: c.title,
          num: pad2(c.number),
        }))}
      />
    </>
  );
}
