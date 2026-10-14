import { Badge } from '../../shell/Badge'
import { STATUS_LABELS, STATUS_TONE, isWorthRevisiting } from '../lib'
import type { TrackerConfig } from '../trackers'
import type { JobDoc, JobSource, JobStatus } from '../types'

const SOURCE_LABELS: Record<JobSource, string> = {
  linkedin: 'LinkedIn',
  company_site: 'Company site',
  referral: 'Referral',
  other: 'Other source',
}

export function StatusBadge({ status }: { status: JobStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABELS[status] ?? status}</Badge>
}

/** Where the posting was found; LinkedIn links to the source posting. */
export function SourceBadge({ source, url }: { source?: JobSource; url: string }) {
  if (!source) return null
  if (source === 'linkedin') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="tap">
        <Badge tone="accent">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden>
            <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56z" />
          </svg>
          {SOURCE_LABELS.linkedin}
        </Badge>
      </a>
    )
  }
  return <Badge tone="muted">{SOURCE_LABELS[source] ?? source}</Badge>
}

export function RegionBadge({ region, config }: { region?: string; config: TrackerConfig }) {
  if (!region) return null
  return <Badge tone="fg">{config.regionBadge[region] ?? region}</Badge>
}

export function HiringScopeBadge({ scope, config }: { scope?: string; config: TrackerConfig }) {
  if (!scope || scope === 'unclear') return null
  if (scope === config.hiringScope.restricted) {
    return <Badge tone="destructive">{config.hiringScope.restrictedLabel}</Badge>
  }
  const label = config.hiringScope.labels[scope]
  return label ? <Badge tone="warn">{label}</Badge> : null
}

export function ResuggestBadge({ job }: { job: JobDoc }) {
  if (!isWorthRevisiting(job.status, job.decision_date)) return null
  return <Badge tone="warn">Worth revisiting: declined 180+ days ago</Badge>
}

export function TagList({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <Badge key={tag} tone="muted">
          {tag}
        </Badge>
      ))}
    </div>
  )
}
