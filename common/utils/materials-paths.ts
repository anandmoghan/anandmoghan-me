// Client-safe materials routes and Storage object paths. The content itself lives in Cloud
// Storage under materials/ (scripts/publish-materials.ts), readable by admins and users with
// the materials app only.

export const MATERIALS_PATH = '/apps/materials';

/** Storage object with the pages, chapters and section titles (MaterialsIndex). */
export const MATERIALS_INDEX_OBJECT = 'materials/index.json';

interface PageRef {
  slug: string;
  chapters: { length: number };
}

/** Storage object with one chapter's article HTML (chapter head plus sections). */
export function chapterObject(pageSlug: string, chapterSlug: string): string {
  return `materials/${pageSlug}/${chapterSlug}.html`;
}

/** Storage object with every chapter of a page on one page. */
export function allObject(pageSlug: string): string {
  return `materials/${pageSlug}/all.html`;
}

export function pageHref(page: PageRef): string {
  return `${MATERIALS_PATH}/${page.slug}`;
}

// A single-chapter page is its chapter; multi-chapter pages have /<page>/<chapter>.
export function chapterHref(page: PageRef, chapter: { slug: string }): string {
  return page.chapters.length === 1 ? pageHref(page) : `${pageHref(page)}/${chapter.slug}`;
}

export function allHref(page: PageRef): string {
  return `${pageHref(page)}/all`;
}
