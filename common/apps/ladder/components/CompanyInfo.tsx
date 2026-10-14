import Link from 'next/link'
import { formatDate } from '../lib'
import type { CompanyHistoryEntry, Confidence, EmailThread, Sponsorship } from '../types'
import { StatusBadge } from './badges'

function isUrl(text: string): boolean {
  return /^https?:\/\/\S+$/.test(text)
}

const SPONSORSHIP_LABELS: Record<Sponsorship, string> = { yes: 'Yes', no: 'No', unknown: 'Unknown' }

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-sm font-extrabold">{children}</h3>
}

function InfoSection({ heading, notes, source, empty }: { heading: string; notes?: string; source?: string; empty: string }) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-extrabold">{heading}</h3>
      {notes ? (
        <>
          <p className="text-sm leading-relaxed">{notes}</p>
          {source && <p className="mt-1 break-words text-xs text-muted">{source}</p>}
        </>
      ) : (
        <p className="text-sm italic text-muted">{empty}</p>
      )}
    </div>
  )
}

interface CompanyInfoProps {
  sponsorship?: Sponsorship
  sponsorship_confidence?: Confidence
  sponsorship_source?: string
  products?: string
  products_source?: string
  funding_notes?: string
  funding_source?: string
  financials_notes?: string
  financials_source?: string
}

// Sponsorship, products, funding and financials (shared by the job and company pages).
export function CompanyInfoCard({ info, profileHref }: { info: CompanyInfoProps; profileHref?: string }) {
  return (
    <div className="card space-y-4">
      {profileHref && (
        <Link href={profileHref} className="inline-block text-sm font-bold text-domain hover:underline">
          View full company profile
        </Link>
      )}
      <p className="text-sm">
        <span className="font-bold">Sponsors visas:</span>{' '}
        {info.sponsorship ? SPONSORSHIP_LABELS[info.sponsorship] : 'Unknown'}
        {info.sponsorship_confidence && <span className="ml-1 text-xs text-muted">({info.sponsorship_confidence})</span>}
      </p>
      {info.sponsorship_source && (
        <p className="break-words text-xs text-muted">
          {isUrl(info.sponsorship_source) ? (
            <a href={info.sponsorship_source} target="_blank" rel="noopener noreferrer" className="text-domain hover:underline">
              {info.sponsorship_source}
            </a>
          ) : (
            info.sponsorship_source
          )}
        </p>
      )}
      <InfoSection heading="Products" notes={info.products} source={info.products_source} empty="No product information yet" />
      <InfoSection heading="Funding" notes={info.funding_notes} source={info.funding_source} empty="No funding information yet" />
      <InfoSection
        heading="Financials"
        notes={info.financials_notes}
        source={info.financials_source}
        empty="No financial information yet"
      />
    </div>
  )
}

/** Other jobs at the same company, linking to the job page. */
export function JobHistoryList({ entries, empty }: { entries: CompanyHistoryEntry[]; empty?: string }) {
  if (entries.length === 0) return empty ? <p className="text-sm italic text-muted">{empty}</p> : null
  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li key={entry.slug}>
          <Link href={`/apps/ladder?job=${encodeURIComponent(entry.slug)}`} className="card card--compact tap block">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">{entry.title}</span>
              <StatusBadge status={entry.status} />
            </div>
            <div className="mt-1 flex flex-col gap-0.5 text-xs tabular-nums text-muted">
              <span>Discovered {formatDate(entry.discovered_date)}</span>
              {entry.applied_date && <span>Applied {formatDate(entry.applied_date)}</span>}
              {entry.decision_date && <span>Decided {formatDate(entry.decision_date)}</span>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function EmailThreadsList({ threads }: { threads: EmailThread[] }) {
  if (threads.length === 0) return <p className="text-sm italic text-muted">No linked email threads yet</p>
  return (
    <ul className="space-y-3">
      {threads.map((thread) => (
        <li key={thread.thread_id} className="rounded-lg border border-border p-3">
          <div className="flex items-baseline justify-between gap-2">
            {thread.link ? (
              <a href={thread.link} target="_blank" rel="noopener noreferrer" className="font-bold text-domain hover:underline">
                {thread.subject}
              </a>
            ) : (
              <span className="font-bold">{thread.subject}</span>
            )}
            <span className="shrink-0 text-xs tabular-nums text-muted">{formatDate(thread.date)}</span>
          </div>
          <p className="mt-1 text-sm text-muted">{thread.snippet}</p>
        </li>
      ))}
    </ul>
  )
}
