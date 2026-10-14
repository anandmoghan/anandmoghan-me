import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { allHref, getMaterialsPage, getMaterialsPages } from '@/common/utils/materials';
import { AllView, materialsMetadata } from '../../_components/views';

interface Props {
  params: Promise<{ page: string }>;
}

export function generateStaticParams() {
  return getMaterialsPages().map((page) => ({ page: page.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getMaterialsPage((await params).page);
  if (!page) return { title: 'Not found' };
  return materialsMetadata(`All chapters | ${page.title} | Materials`, page.description, allHref(page));
}

// Every chapter on one page, for print and search.
export default async function MaterialsAllRoute({ params }: Props) {
  const page = getMaterialsPage((await params).page);
  if (!page) notFound();
  return <AllView page={page} />;
}
