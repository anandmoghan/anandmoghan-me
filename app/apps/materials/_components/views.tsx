// Page bodies shared by the materials routes: landing, chapter and all-chapters views.
import Link from 'next/link';
import type { Metadata } from 'next';
import type { MaterialsPage } from '@/common/types/materials';
import {
  allHref,
  chapterHref,
  pageHref,
  renderAllChapters,
  renderChapter,
} from '@/common/utils/materials';
import { ReadingTracker } from '@/common/visitors/reads/ReadingTracker';
import { materialsSlug } from '@/common/visitors/reads/reads';
import { MaterialsShell } from './MaterialsShell';
import { PaneAll, PaneChapter, PaneLanding, pad2 } from './Pane';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Indexed, with a canonical URL per route (the /apps layout defaults to noindex).
export function materialsMetadata(title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: 'Anand Mohan', type: 'article' },
  };
}

export function LandingView({ page }: { page: MaterialsPage }) {
  return (
    <MaterialsShell sidebar={<PaneLanding page={page} />}>
      <h1>{page.title}</h1>
      {page.description && <p className="page-lede">{page.description}</p>}
      <p>
        <Link className="btn" href={allHref(page)}>
          Read all chapters on one page
        </Link>
      </p>
      <ul className="card-grid">
        {page.chapters.map((chapter) => (
          <li key={chapter.slug}>
            <Link className="card" href={chapterHref(page, chapter)}>
              <h2 className="card__title">
                {chapter.number}. {chapter.title}
              </h2>
              {chapter.summary && <p className="card__text">{chapter.summary}</p>}
              <p className="card__meta">
                {chapter.sectionCount} section{chapter.sectionCount === 1 ? '' : 's'}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </MaterialsShell>
  );
}

// Bottom-of-chapter prev/next cards with chapter numbers and names.
function ChapterNav({ page, index }: { page: MaterialsPage; index: number }) {
  if (page.chapters.length < 2) return null;
  const prev = page.chapters[index - 1];
  const next = page.chapters[index + 1];
  return (
    <nav className="chapter-nav" aria-label="Chapter navigation">
      {prev ? (
        <Link className="btn chapter-nav__prev" href={chapterHref(page, prev)} rel="prev">
          <small>&larr; Previous</small>
          <span className="chapter-nav__name">
            {pad2(prev.number)} {prev.title}
          </span>
        </Link>
      ) : (
        <Link className="btn chapter-nav__prev" href={pageHref(page)}>
          <small>&larr; Back to</small>
          <span className="chapter-nav__name">All chapters</span>
        </Link>
      )}
      {next ? (
        <Link className="btn chapter-nav__next" href={chapterHref(page, next)} rel="next">
          <small>Next &rarr;</small>
          <span className="chapter-nav__name">
            {pad2(next.number)} {next.title}
          </span>
        </Link>
      ) : (
        <span className="chapter-nav__spacer" />
      )}
    </nav>
  );
}

export function ChapterView({ page, index }: { page: MaterialsPage; index: number }) {
  const chapter = renderChapter(page, page.chapters[index].slug);
  const multi = page.chapters.length > 1;
  const head = [
    '<header class="chapter-head">',
    multi ? `<p class="kicker">${escapeHtml(page.title)}</p>` : '',
    `<h1>${escapeHtml(chapter.title)}</h1>`,
    '</header>',
  ].join('');
  return (
    <MaterialsShell
      sidebar={<PaneChapter page={page} index={index} headings={chapter.headings} />}
      html={`${head}\n${chapter.html}`}
      footer={
        <>
          <ChapterNav page={page} index={index} />
          <ReadingTracker
            slug={materialsSlug(page.slug, multi ? chapter.slug : null)}
            title={multi ? `${page.title}: ${chapter.title}` : page.title}
            container=".materials .content"
          />
        </>
      }
    />
  );
}

export function AllView({ page }: { page: MaterialsPage }) {
  const html = renderAllChapters(page)
    .map((chapter, index) =>
      [
        `<div class="chapter" id="chapter-${chapter.slug}">`,
        `<header class="chapter-head${index > 0 ? ' break-before' : ''}">`,
        `<p class="kicker">Chapter ${chapter.number}</p>`,
        `<h1>${escapeHtml(chapter.title)}</h1>`,
        '</header>',
        chapter.html,
        '</div>',
      ].join('\n')
    )
    .join('\n\n');
  return <MaterialsShell sidebar={<PaneAll page={page} />} html={html} />;
}
