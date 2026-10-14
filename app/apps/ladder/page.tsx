import { Suspense } from 'react'
import { PageSkeleton } from '@/common/apps/shell/Skeleton'
import { JobsPage } from '@/common/apps/ladder/pages/JobsPage'

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <JobsPage />
    </Suspense>
  )
}
