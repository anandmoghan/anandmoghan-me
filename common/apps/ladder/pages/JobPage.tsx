'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { JobDetail } from '../components/JobDetail'
import { useLadder } from '../LadderProvider'

// One job on its own page: /apps/ladder/job?slug=<slug> (a shareable link without the list).
export function JobPage() {
  const { jobs } = useLadder()
  const slug = useSearchParams().get('slug')
  const job = slug ? jobs.find((j) => j.slug === slug) : undefined

  return (
    <div className="site-container site-container--wide pb-6 pt-3">
      <Link href={slug ? `/apps/ladder?job=${encodeURIComponent(slug)}` : '/apps/ladder'} className="back-link mb-3">
        All jobs
      </Link>
      {job ? <JobDetail key={job.slug} job={job} /> : <p className="card text-sm text-muted">Job not found in this tracker.</p>}
    </div>
  )
}
