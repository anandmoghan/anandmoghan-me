import { Suspense } from 'react'
import { ListSkeleton } from '@/common/apps/shell/Skeleton'
import { JobsPage } from '@/common/apps/ladder/pages/JobsPage'

export default function Page() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <JobsPage />
    </Suspense>
  )
}
