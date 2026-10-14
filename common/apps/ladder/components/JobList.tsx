'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { STATUS_SECTIONS } from '../lib'
import type { JobDoc } from '../types'

function JobListItem({ job, href, active }: { job: JobDoc; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={`block border-l-2 px-3 py-2.5 ${active ? 'border-l-domain bg-domain/10' : 'border-l-transparent hover:bg-subtle'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-sm font-bold">{job.title}</h3>
        {job.viewed && <span className="shrink-0 text-[10px] text-muted">Viewed</span>}
      </div>
      <p className="truncate text-xs text-muted">{job.company}</p>
      {job.location && <p className="truncate text-xs text-muted">{job.location}</p>}
    </Link>
  )
}

interface JobListProps {
  /** Already filtered, status included. */
  jobs: JobDoc[]
  /** The active status tab; empty groups the list by status. */
  status: string
  selected: string | null
  hrefFor: (slug: string) => string
}

export function JobList({ jobs, status, selected, hrefFor }: JobListProps) {
  if (jobs.length === 0) return <p className="text-sm italic text-muted">No jobs match the current filters.</p>

  const item = (job: JobDoc) => <JobListItem key={job.slug} job={job} href={hrefFor(job.slug)} active={job.slug === selected} />

  return (
    <div className="card card--flush divide-y divide-border md:max-h-full md:overflow-y-auto">
      {status
        ? jobs.map(item)
        : STATUS_SECTIONS.map(({ status: s, label }) => {
            const section = jobs.filter((job) => job.status === s)
            if (section.length === 0) return null
            return (
              <Fragment key={s}>
                <div className="bg-subtle px-3 py-1.5 text-xs font-bold text-muted">
                  {label} ({section.length})
                </div>
                {section.map(item)}
              </Fragment>
            )
          })}
    </div>
  )
}
