'use client'

import { useCallback, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { JobDetail } from '../components/JobDetail'
import { FilterBar, StatusTabs } from '../components/FilterBar'
import { JobList } from '../components/JobList'
import { useLadder } from '../LadderProvider'
import { matchesFilters, parseFilters } from '../lib'

// Split view at /apps/ladder: filters and status tabs on top, the job list on the left and the
// selected job (?job=<slug>) on the right. Without ?job the first listed job shows on wide
// screens; on phones the list shows until a job is picked, then the detail with a back link.
export function JobsPage() {
  const { jobs, config } = useLadder()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const params = useMemo(() => new URLSearchParams(query), [query])

  const filters = config ? parseFilters(params, config) : null
  const ignoringStatus = filters ? jobs.filter((job) => matchesFilters(job, { ...filters, status: undefined })) : []
  const filtered = filters?.status ? ignoringStatus.filter((job) => job.status === filters.status) : ignoringStatus

  const picked = params.get('job')
  const explicit = picked ? jobs.find((job) => job.slug === picked) : undefined
  const shown = explicit ?? filtered[0]

  // A filter change drops ?job, so the first job of the new list is shown (as the old app did).
  const setParam = useCallback(
    (key: string, value: string, replace = false) => {
      const next = new URLSearchParams(query)
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete('job')
      const qs = next.toString()
      const href = qs ? `${pathname}?${qs}` : pathname
      if (replace) router.replace(href)
      else router.push(href)
    },
    [query, pathname, router],
  )

  const hrefFor = useCallback(
    (slug: string) => {
      const next = new URLSearchParams(query)
      next.set('job', slug)
      return `${pathname}?${next.toString()}`
    },
    [query, pathname],
  )

  const listHref = useMemo(() => {
    const next = new URLSearchParams(query)
    next.delete('job')
    const qs = next.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }, [query, pathname])

  if (!config) return null

  return (
    <div className="site-container flex flex-col pb-6 pt-3 md:min-h-0 md:flex-1">
      <div className={`shrink-0 ${explicit ? 'hidden md:block' : ''}`}>
        <FilterBar params={params} setParam={setParam} clearAll={() => router.push(pathname)} />
        <StatusTabs jobs={ignoringStatus} active={filters?.status ?? ''} setStatus={(s) => setParam('status', s)} />
      </div>

      <div className="mt-3 flex gap-6 md:min-h-0 md:flex-1">
        <aside
          className={`w-full md:block md:min-h-0 md:w-80 md:shrink-0 ${
            explicit ? 'hidden' : ''
          }`}
        >
          <JobList jobs={filtered} status={filters?.status ?? ''} selected={shown?.slug ?? null} hrefFor={hrefFor} />
        </aside>

        <section className={`min-w-0 flex-1 md:min-h-0 md:overflow-y-auto ${explicit ? '' : 'hidden md:block'}`} aria-label="Job detail">
          {explicit && (
            <Link href={listHref} className="back-link mb-3 md:hidden">
              Job list
            </Link>
          )}
          {picked && !explicit ? (
            <p className="card text-sm text-muted">This job is not in the current tracker.</p>
          ) : shown ? (
            <JobDetail key={shown.slug} job={shown} />
          ) : (
            <div className="flex min-h-[300px] items-center justify-center rounded-card border border-dashed border-border text-sm text-muted">
              {jobs.length === 0 ? 'No jobs yet.' : 'No jobs match the current filters.'}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
