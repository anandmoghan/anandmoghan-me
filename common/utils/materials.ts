// Loads the materials pages (content/materials/pages, synced from the materials repo with
// `npm run sync-materials`) and renders chapters with the shared fragment renderer.
// Content model and validation follow materials/scripts/build.mjs.
import 'server-only';
import fs from 'fs';
import path from 'path';
import { checkDuplicateIds, listSections, renderSections } from './html';
import type {
  MaterialsChapter,
  MaterialsChapterJson,
  MaterialsChapterMeta,
  MaterialsPage,
  MaterialsPageJson,
} from '../types/materials';

const ROOT = process.cwd();
const PAGES_DIR = path.join(ROOT, 'content/materials/pages');

export const MATERIALS_PATH = '/apps/materials';

function rel(file: string): string {
  return path.relative(ROOT, file);
}

function readJson<T>(file: string): T {
  if (!fs.existsSync(file)) throw new Error(`missing file: ${rel(file)}`);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch (error) {
    throw new Error(`invalid JSON in ${rel(file)}: ${(error as Error).message}`);
  }
}

function chapterDir(pageSlug: string, chapterSlug: string): string {
  return path.join(PAGES_DIR, pageSlug, chapterSlug);
}

// Section files, checked the way materials does: every .html needs a numeric prefix.
function chapterSections(pageSlug: string, chapterSlug: string): string[] {
  const dir = chapterDir(pageSlug, chapterSlug);
  const files = listSections(dir);
  const html = fs.readdirSync(dir).filter((name) => name.endsWith('.html'));
  const unnumbered = html.filter((name) => !files.includes(path.join(dir, name)));
  if (unnumbered.length) {
    throw new Error(`${rel(dir)}: section files need a numeric prefix: ${unnumbered.join(', ')}`);
  }
  if (!files.length) throw new Error(`${rel(dir)}: no section fragments (*.html)`);
  return files;
}

function loadChapterMeta(pageSlug: string, chapterSlug: string, index: number): MaterialsChapterMeta {
  const file = path.join(chapterDir(pageSlug, chapterSlug), 'chapter.json');
  const meta = readJson<MaterialsChapterJson>(file);
  if (typeof meta.title !== 'string' || !meta.title) {
    throw new Error(`${rel(file)}: "title" is required`);
  }
  return {
    slug: chapterSlug,
    number: index + 1,
    title: meta.title,
    summary: meta.summary ?? '',
    sectionCount: chapterSections(pageSlug, chapterSlug).length,
  };
}

function loadPage(slug: string): MaterialsPage {
  const file = path.join(PAGES_DIR, slug, 'page.json');
  const meta = readJson<MaterialsPageJson>(file);
  const where = rel(file);
  if (typeof meta.title !== 'string' || !meta.title) throw new Error(`${where}: "title" is required`);
  if (typeof meta.order !== 'number') throw new Error(`${where}: "order" must be a number`);
  if (!Array.isArray(meta.chapters) || !meta.chapters.length) {
    throw new Error(`${where}: "chapters" must be a non-empty array of folder names`);
  }
  for (const folder of meta.chapters) {
    const dir = chapterDir(slug, folder);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      throw new Error(`${where}: chapter folder not found: ${folder}`);
    }
  }
  for (const entry of fs.readdirSync(path.join(PAGES_DIR, slug), { withFileTypes: true })) {
    if (entry.isDirectory() && !meta.chapters.includes(entry.name)) {
      console.warn(`${rel(chapterDir(slug, entry.name))}: folder is not listed in page.json chapters`);
    }
  }
  return {
    slug,
    title: meta.title,
    description: meta.description ?? '',
    order: meta.order,
    chapters: meta.chapters.map((folder, i) => loadChapterMeta(slug, folder, i)),
  };
}

// Pages sorted by page.json order, then title (metadata only; nothing is rendered).
export function getMaterialsPages(): MaterialsPage[] {
  if (!fs.existsSync(PAGES_DIR)) return [];
  return fs
    .readdirSync(PAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => loadPage(entry.name))
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export function getMaterialsPage(slug: string): MaterialsPage | null {
  return getMaterialsPages().find((page) => page.slug === slug) ?? null;
}

// Renders one chapter: includes, ids, maths, arXiv links. Duplicate ids warn, as in materials.
export function renderChapter(page: MaterialsPage, chapterSlug: string): MaterialsChapter {
  const meta = page.chapters.find((chapter) => chapter.slug === chapterSlug);
  if (!meta) throw new Error(`materials: no chapter ${chapterSlug} in ${page.slug}`);
  const owner = path.join(chapterDir(page.slug, chapterSlug), 'chapter.json');
  const { html, headings } = renderSections(chapterSections(page.slug, chapterSlug), {
    arxivLinks: true,
    duplicateIds: 'warn',
    owner,
  });
  return { ...meta, html, headings };
}

// Every chapter of a page, for /all. Ids repeated across chapters warn, as in materials.
export function renderAllChapters(page: MaterialsPage): MaterialsChapter[] {
  const chapters = page.chapters.map((chapter) => renderChapter(page, chapter.slug));
  checkDuplicateIds(
    chapters.map((chapter) => chapter.html).join('\n'),
    path.join(PAGES_DIR, page.slug, 'page.json'),
    'warn'
  );
  return chapters;
}

export function pageHref(page: MaterialsPage): string {
  return `${MATERIALS_PATH}/${page.slug}`;
}

// A single-chapter page is its chapter; multi-chapter pages have /<page>/<chapter>.
export function chapterHref(page: MaterialsPage, chapter: MaterialsChapterMeta): string {
  return page.chapters.length === 1 ? pageHref(page) : `${pageHref(page)}/${chapter.slug}`;
}

export function allHref(page: MaterialsPage): string {
  return `${pageHref(page)}/all`;
}
