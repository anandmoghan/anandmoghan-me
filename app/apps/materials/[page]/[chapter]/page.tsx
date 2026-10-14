import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { MaterialsPage } from '@/common/types/materials';
import { chapterHref, getMaterialsPage, getMaterialsPages } from '@/common/utils/materials';
import { ChapterView, materialsMetadata } from '../../_components/views';

interface Props {
  params: Promise<{ page: string; chapter: string }>;
}

// Only multi-chapter pages have chapter routes; a single-chapter page lives at /<page>.
export function generateStaticParams() {
  return getMaterialsPages()
    .filter((page) => page.chapters.length > 1)
    .flatMap((page) => page.chapters.map((chapter) => ({ page: page.slug, chapter: chapter.slug })));
}

function findChapter(pageSlug: string, chapterSlug: string): { page: MaterialsPage; index: number } | null {
  const page = getMaterialsPage(pageSlug);
  if (!page || page.chapters.length < 2) return null;
  const index = page.chapters.findIndex((chapter) => chapter.slug === chapterSlug);
  return index < 0 ? null : { page, index };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page: pageSlug, chapter: chapterSlug } = await params;
  const found = findChapter(pageSlug, chapterSlug);
  if (!found) return { title: 'Not found' };
  const chapter = found.page.chapters[found.index];
  return materialsMetadata(
    `${chapter.title} | ${found.page.title} | Materials`,
    chapter.summary || found.page.description,
    chapterHref(found.page, chapter)
  );
}

export default async function MaterialsChapterRoute({ params }: Props) {
  const { page: pageSlug, chapter: chapterSlug } = await params;
  const found = findChapter(pageSlug, chapterSlug);
  if (!found) notFound();
  return <ChapterView page={found.page} index={found.index} />;
}
