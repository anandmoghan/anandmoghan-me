import { getMaterialsRoutes } from '@/common/utils/materials';
import { ChapterView } from '../../_components/views';

interface Props {
  params: Promise<{ page: string; chapter: string }>;
}

// Only multi-chapter pages have chapter routes; a single-chapter page lives at /<page>.
// Slugs only: the chapter renders from Storage on the client (see ../../layout.tsx).
export function generateStaticParams() {
  return getMaterialsRoutes()
    .filter((route) => route.chapters.length > 1)
    .flatMap((route) => route.chapters.map((chapter) => ({ page: route.page, chapter })));
}

export default async function MaterialsChapterRoute({ params }: Props) {
  const { page, chapter } = await params;
  return <ChapterView pageSlug={page} chapterSlug={chapter} />;
}
