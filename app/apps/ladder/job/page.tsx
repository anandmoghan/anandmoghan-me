import { Suspense } from 'react'
import { ListSkeleton } from '@/common/apps/shell/Skeleton'
import { JobPage } from '@/common/apps/ladder/pages/JobPage'

export default function Page() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <JobPage />
    </Suspense>
  )
}
