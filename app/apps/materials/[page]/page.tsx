import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getMaterialsPage, getMaterialsPages, pageHref } from '@/common/utils/materials';
import { ChapterView, LandingView, materialsMetadata } from '../_components/views';

interface Props {
  params: Promise<{ page: string }>;
}

export function generateStaticParams() {
  return getMaterialsPages().map((page) => ({ page: page.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getMaterialsPage((await params).page);
  if (!page) return { title: 'Not found' };
  if (page.chapters.length > 1) {
    return materialsMetadata(`${page.title} | Materials`, page.description, pageHref(page));
  }
  const chapter = page.chapters[0];
  return materialsMetadata(
    `${chapter.title} | ${page.title} | Materials`,
    chapter.summary || page.description,
    pageHref(page)
  );
}

// Multi-chapter pages get a landing listing chapters; a single-chapter page is its chapter.
export default async function MaterialsPageRoute({ params }: Props) {
  const page = getMaterialsPage((await params).page);
  if (!page) notFound();
  if (page.chapters.length > 1) return <LandingView page={page} />;
  return <ChapterView page={page} index={0} />;
}
