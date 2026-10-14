import { Suspense } from 'react'
import { ListSkeleton } from '@/common/apps/shell/Skeleton'
import { CompanyPage } from '@/common/apps/ladder/pages/CompanyPage'

export default function Page() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <CompanyPage />
    </Suspense>
  )
}
