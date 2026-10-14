import { getMaterialsRoutes } from '@/common/utils/materials';
import { PageView } from '../_components/views';

interface Props {
  params: Promise<{ page: string }>;
}

// Slugs only: the page renders from Storage on the client (see ../layout.tsx).
export function generateStaticParams() {
  return getMaterialsRoutes().map((route) => ({ page: route.page }));
}

export default async function MaterialsPageRoute({ params }: Props) {
  return <PageView pageSlug={(await params).page} />;
}
