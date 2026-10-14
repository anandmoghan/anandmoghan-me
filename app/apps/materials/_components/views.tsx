'use client';

// Page bodies of the materials routes: home, landing, chapter and all-chapters views. Pages,
// chapters and sections come from the Storage index; article HTML from Storage per route.
import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { InlineSpinner } from '@/common/apps/components/Spinner';
import type { MaterialsIndexPage } from '@/common/types/materials';
import {
  allHref,
  allObject,
  chapterHref,
  chapterObject,
  pageHref,
} from '@/common/utils/materials-paths';
import { ReadingTracker } from '@/common/visitors/reads/ReadingTracker';
import { materialsSlug } from '@/common/visitors/reads/reads';
import { useMaterialsHtml, useMaterialsIndex } from './MaterialsData';
import { MaterialsShell } from './MaterialsShell';
import { PaneAll, PaneChapter, PaneHome, PaneLanding, pad2 } from './Pane';

const DESCRIPTION = 'Long-form notes and preparation documents.';

function useDocumentTitle(title: string | null) {
  useEffect(() => {
    if (title) document.title = `${title} | Materials`;
  }, [title]);
}

function Message({ children }: { children: ReactNode }) {
  return <p className="nav-empty">{children}</p>;
}

const LOAD_FAILED = 'Could not load materials. Reload the page to try again.';

// Index states shared by every route: loading, failed, or the page is not in the index.
function IndexGate({
  pageSlug,
  children,
}: {
  pageSlug: string | null;
  children: (pages: MaterialsIndexPage[], page: MaterialsIndexPage | null) => ReactNode;
}) {
  const index = useMaterialsIndex();
  if (index.status !== 'ready') {
    return (
      <MaterialsShell sidebar={null}>
        {index.status === 'loading' ? <InlineSpinner text="Loading" /> : <Message>{LOAD_FAILED}</Message>}
      </MaterialsShell>
    );
  }
  const page = pageSlug ? (index.data.pages.find((p) => p.slug === pageSlug) ?? null) : null;
  if (pageSlug && !page) {
    return (
      <MaterialsShell sidebar={<PaneHome pages={index.data.pages} />}>
        <h1>Not found</h1>
        <Message>This page is not in the materials index.</Message>
      </MaterialsShell>
    );
  }
  return <>{children(index.data.pages, page)}</>;
}

function HomeBody({ pages }: { pages: MaterialsIndexPage[] }) {
  useDocumentTitle('Home');
  return (
    <MaterialsShell sidebar={<PaneHome pages={pages} />}>
      <h1>Materials</h1>
      <p className="page-lede">{DESCRIPTION}</p>
      <ul className="card-grid">
        {pages.map((page) => (
          <li key={page.slug}>
            <Link className="card" href={pageHref(page)}>
              <h2 className="card__title">{page.title}</h2>
              {page.description && <p className="card__text">{page.description}</p>}
              <p className="card__meta">
                {page.chapters.length} chapter{page.chapters.length === 1 ? '' : 's'}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </MaterialsShell>
  );
}

function LandingBody({ page }: { page: MaterialsIndexPage }) {
  useDocumentTitle(page.title);
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
function ChapterNav({ page, index }: { page: MaterialsIndexPage; index: number }) {
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

// Sidebar straight away from the index; the article once its HTML has loaded.
function ArticleShell({ sidebar, objectPath, footer }: { sidebar: ReactNode; objectPath: string; footer?: ReactNode }) {
  const article = useMaterialsHtml(objectPath);
  if (article.status !== 'ready') {
    return (
      <MaterialsShell sidebar={sidebar}>
        {article.status === 'loading' ? <InlineSpinner text="Loading" /> : <Message>{LOAD_FAILED}</Message>}
      </MaterialsShell>
    );
  }
  return <MaterialsShell sidebar={sidebar} html={article.data} footer={footer} />;
}

function ChapterBody({ page, index }: { page: MaterialsIndexPage; index: number }) {
  const chapter = page.chapters[index];
  const multi = page.chapters.length > 1;
  useDocumentTitle(multi ? `${chapter.title} | ${page.title}` : page.title);
  return (
    <ArticleShell
      key={chapter.slug}
      sidebar={<PaneChapter page={page} index={index} sections={chapter.sections} />}
      objectPath={chapterObject(page.slug, chapter.slug)}
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

function NotFoundBody({ page }: { page: MaterialsIndexPage }) {
  return (
    <MaterialsShell sidebar={<PaneLanding page={page} />}>
      <h1>Not found</h1>
      <Message>This chapter is not in the materials index.</Message>
    </MaterialsShell>
  );
}

export function HomeView() {
  return <IndexGate pageSlug={null}>{(pages) => <HomeBody pages={pages} />}</IndexGate>;
}

// Multi-chapter pages get a landing listing chapters; a single-chapter page is its chapter.
export function PageView({ pageSlug }: { pageSlug: string }) {
  return (
    <IndexGate pageSlug={pageSlug}>
      {(_pages, page) =>
        page && (page.chapters.length > 1 ? <LandingBody page={page} /> : <ChapterBody page={page} index={0} />)
      }
    </IndexGate>
  );
}

export function ChapterView({ pageSlug, chapterSlug }: { pageSlug: string; chapterSlug: string }) {
  return (
    <IndexGate pageSlug={pageSlug}>
      {(_pages, page) => {
        if (!page) return null;
        const index = page.chapters.length > 1 ? page.chapters.findIndex((c) => c.slug === chapterSlug) : -1;
        return index < 0 ? <NotFoundBody page={page} /> : <ChapterBody page={page} index={index} />;
      }}
    </IndexGate>
  );
}

// Every chapter on one page, for print and search.
function AllBody({ page }: { page: MaterialsIndexPage }) {
  useDocumentTitle(`All chapters | ${page.title}`);
  return <ArticleShell sidebar={<PaneAll page={page} />} objectPath={allObject(page.slug)} />;
}

export function AllView({ pageSlug }: { pageSlug: string }) {
  return <IndexGate pageSlug={pageSlug}>{(_pages, page) => page && <AllBody page={page} />}</IndexGate>;
}
