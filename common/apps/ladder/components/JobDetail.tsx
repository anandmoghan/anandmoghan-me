'use client'

import { useState } from 'react'
import { useLadder } from '../LadderProvider'
import { companyHistory, formatPayRange } from '../lib'
import type { JobDoc } from '../types'
import { ApplyPrepEditor } from './ApplyPrepEditor'
import { HiringScopeBadge, RegionBadge, ResuggestBadge, SourceBadge } from './badges'
import { CompanyInfoCard, EmailThreadsList, JobHistoryList, SectionTitle } from './CompanyInfo'
import { PrepareMaterials, RatingToggle, ReloadButton, StatusActionControl, ViewedTracker } from './JobActions'
import { NotesPanel } from './NotesPanel'
import { ProgressBar } from './ProgressBar'

type TabKey = 'jd' | 'company' | 'apply'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'jd', label: 'Description' },
  { key: 'company', label: 'Company' },
  { key: 'apply', label: 'Apply' },
]

function FitSummary({ job }: { job: JobDoc }) {
  const { currency, config } = useLadder()
  const pay = config ? formatPayRange(job, currency, config.currencies) : null
  const note = [job.pay_confidence, job.pay_source].filter(Boolean).join(', ')
  return (
    <div>
      {job.fit_summary ? (
        <p className="leading-relaxed">{job.fit_summary}</p>
      ) : (
        <p className="italic text-muted">No fit summary yet</p>
      )}
      {pay && (
        <div className="mt-3">
          <p className="text-xl font-extrabold tabular-nums">{pay}</p>
          {note && <p className="break-words text-xs text-muted">{note}</p>}
        </div>
      )}
    </div>
  )
}

/** Header (title, badges, rating, reload, fit, pay, progress, actions), tabs and notes. */
export function JobDetail({ job }: { job: JobDoc }) {
  const { jobs, companies, config } = useLadder()
  const [tab, setTab] = useState<TabKey>('jd')
  if (!config) return null

  const history = companyHistory(jobs, job.company, job.slug)
  const company = companies.find((c) => c.name.toLowerCase() === job.company.toLowerCase())
  const where = [
    job.location,
    job.remote && !job.location?.toLowerCase().includes(job.remote) ? job.remote : null,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div>
      <ViewedTracker job={job} />
      <div className="card mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold leading-tight">{job.title}</h1>
            <p>{job.company}</p>
            {where && <p className="text-muted">{where}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              <SourceBadge source={job.source} url={job.url} />
              <RegionBadge region={job.region} config={config} />
              <HiringScopeBadge scope={job.hiring_scope} config={config} />
            </div>
            {(job.applicant_count != null || job.applicant_count_label) && (
              <p className="mt-1 text-xs text-muted">{job.applicant_count_label ?? `${job.applicant_count} applicants`}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <RatingToggle job={job} />
            <ReloadButton job={job} />
          </div>
        </div>

        <div className="mt-3 empty:hidden">
          <ResuggestBadge job={job} />
        </div>

        <div className="mt-4">
          <FitSummary job={job} />
        </div>

        <div className="mt-4">
          <ProgressBar status={job.status} stage={job.progress_stage} />
        </div>

        <div className="mt-3">
          <StatusActionControl key={job.slug} job={job} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a href={job.apply_url ?? job.url} target="_blank" rel="noopener noreferrer" className="btn btn--outline btn--sm">
            Apply
          </a>
          <PrepareMaterials job={job} />
        </div>
      </div>

      <div role="tablist" aria-label="Job details" className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            aria-pressed={tab === t.key}
            onClick={() => setTab(t.key)}
            className="chip"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {tab === 'jd' &&
          (job.body_html ? (
            // body_html is sanitised by the writer (migration, worker); clients cannot write it.
            <div className="card prose overflow-x-auto" dangerouslySetInnerHTML={{ __html: job.body_html }} />
          ) : (
            <p className="card text-sm italic text-muted">No description saved.</p>
          ))}
        {tab === 'company' && (
          <div className="space-y-4">
            <CompanyInfoCard
              info={job}
              profileHref={company ? `/apps/ladder/company?slug=${encodeURIComponent(company.slug)}` : undefined}
            />
            {history.length > 0 && (
              <div className="card">
                <SectionTitle>Your history with this company</SectionTitle>
                <JobHistoryList entries={history} />
              </div>
            )}
            <div className="card">
              <SectionTitle>Email threads</SectionTitle>
              <EmailThreadsList threads={job.email_threads ?? []} />
            </div>
          </div>
        )}
        {tab === 'apply' && (
          <div className="card">
            <ApplyPrepEditor key={job.slug} job={job} />
          </div>
        )}
      </div>

      <div className="card mt-6">
        <SectionTitle>Notes</SectionTitle>
        <NotesPanel key={job.slug} job={job} />
      </div>
    </div>
  )
}
