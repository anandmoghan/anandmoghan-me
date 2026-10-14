import { getMaterialsRoutes } from '@/common/utils/materials';
import { AllView } from '../../_components/views';

interface Props {
  params: Promise<{ page: string }>;
}

// Slugs only: the article renders from Storage on the client (see ../../layout.tsx).
export function generateStaticParams() {
  return getMaterialsRoutes().map((route) => ({ page: route.page }));
}

export default async function MaterialsAllRoute({ params }: Props) {
  return <AllView pageSlug={(await params).page} />;
}
