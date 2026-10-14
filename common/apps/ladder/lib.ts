import type { BadgeTone } from '../shell/Badge'
import type { DisplayCurrency, TrackerConfig } from './trackers'
import type { CompanyHistoryEntry, JobDoc, JobStatus, ProgressStage } from './types'

// Pure helpers ported from ladder/lib/jobs (filters, currency, formatDate, company history).

export const STATUS_SECTIONS: { status: JobStatus; label: string }[] = [
  { status: 'new', label: 'New' },
  { status: 'saved', label: 'Saved' },
  { status: 'applied', label: 'Applied' },
  { status: 'interviewing', label: 'Interviewing' },
  { status: 'declined', label: 'Declined' },
  { status: 'archived', label: 'Archived' },
]

export const STATUS_LABELS = Object.fromEntries(STATUS_SECTIONS.map((s) => [s.status, s.label])) as Record<
  JobStatus,
  string
>

export const STATUS_TONE: Record<JobStatus, BadgeTone> = {
  new: 'accent',
  saved: 'gold',
  applied: 'warn',
  interviewing: 'success',
  declined: 'destructive',
  archived: 'muted',
}

/** Filter keys kept in the URL query of the jobs view. */
export const FILTER_KEYS = ['rating', 'status', 'sponsorship', 'region', 'tags', 'payMin', 'payMax'] as const

export interface JobFilters {
  rating?: string
  status?: string
  sponsorship?: string
  region?: string
  tags: string[]
  payMin?: number
  payMax?: number
}

export function parseFilters(params: URLSearchParams, config: TrackerConfig): JobFilters {
  const tags = params.get('tags')
  const payMin = params.get('payMin')
  const payMax = params.get('payMax')
  return {
    rating: params.get('rating') || undefined,
    status: params.get('status') || undefined,
    sponsorship: params.get('sponsorship') || undefined,
    region: params.get('region') || undefined,
    tags: tags ? tags.split(',').filter(Boolean) : [],
    payMin: payMin ? Number(payMin) : config.defaultPayMin,
    payMax: payMax ? Number(payMax) : undefined,
  }
}

export function matchesFilters(job: JobDoc, filters: JobFilters): boolean {
  if (filters.status && job.status !== filters.status) return false
  if (filters.rating && job.rating !== filters.rating) return false
  if (filters.sponsorship && (job.sponsorship ?? 'unknown') !== filters.sponsorship) return false
  if (filters.region && job.region !== filters.region) return false
  if (filters.tags.length > 0) {
    const jobTags = job.tags ?? []
    if (!filters.tags.every((tag) => jobTags.includes(tag))) return false
  }
  // Jobs with no pay info are not held to a pay filter; only jobs that state a number are.
  const hasPay = job.pay_min != null || job.pay_max != null
  if (hasPay) {
    if (filters.payMin != null && (job.pay_max ?? job.pay_min ?? 0) < filters.payMin) return false
    if (filters.payMax != null && (job.pay_min ?? job.pay_max ?? Infinity) > filters.payMax) return false
  }
  return true
}

/** Newest first, as the markdown app sorted by filename (the slug starts with the date). */
export function compareJobs(a: JobDoc, b: JobDoc): number {
  return b.slug.localeCompare(a.slug)
}

// == Currency ==

const SYMBOLS: Record<DisplayCurrency, string> = { GBP: '£', USD: '$', CHF: 'CHF ', EUR: '€', SEK: 'kr ' }

/** Static, approximate rates to GBP for comparing pay ranges; not live exchange rates. */
const RATE_TO_GBP: Record<DisplayCurrency, number> = { GBP: 1, USD: 0.79, CHF: 0.89, EUR: 0.86, SEK: 0.075 }

export type CurrencyPreference = DisplayCurrency | 'native'

function isDisplayCurrency(value: string, allowed: DisplayCurrency[]): value is DisplayCurrency {
  return (allowed as string[]).includes(value)
}

function formatMoney(amount: number, currency: DisplayCurrency): string {
  const rounded = amount >= 1000 ? `${Math.round(amount / 1000)}k` : `${Math.round(amount)}`
  return `${SYMBOLS[currency]}${rounded}`
}

export function formatPayRange(
  job: Pick<JobDoc, 'pay_min' | 'pay_max' | 'pay_currency' | 'pay_period'>,
  preference: CurrencyPreference,
  allowed: DisplayCurrency[],
): string | null {
  const { pay_min: min, pay_max: max } = job
  if (min == null && max == null) return null
  const native = job.pay_currency || 'GBP'
  const suffix = job.pay_period === 'hour' ? '/hr' : '/yr'
  const convert =
    preference !== 'native' && isDisplayCurrency(native, allowed) && preference !== native ? preference : null
  const shown = convert ?? native
  const format = (amount: number) => {
    if (!isDisplayCurrency(shown, allowed)) return `${shown} ${Math.round(amount)}`
    const value = convert ? (amount * RATE_TO_GBP[native as DisplayCurrency]) / RATE_TO_GBP[convert] : amount
    return formatMoney(value, shown)
  }
  return min != null && max != null ? `${format(min)}–${format(max)}${suffix}` : `${format((min ?? max) as number)}${suffix}`
}

// == Dates ==

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function ordinal(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`
  switch (day % 10) {
    case 1:
      return `${day}st`
    case 2:
      return `${day}nd`
    case 3:
      return `${day}rd`
    default:
      return `${day}th`
  }
}

/** "7th April 2026" from YYYY-MM-DD; the input unchanged if it does not parse. */
export function formatDate(iso: string | undefined): string {
  if (!iso) return ''
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return iso
  const [, year, month, day] = match
  const name = MONTHS[Number(month) - 1]
  return name ? `${ordinal(Number(day))} ${name} ${year}` : iso
}

/** Today in the user's time zone, YYYY-MM-DD. */
export function todayIso(): string {
  return new Date().toLocaleDateString('sv-SE')
}

/** A declined job whose decision is more than 180 days old. */
export function isWorthRevisiting(status: JobStatus, decisionDate?: string): boolean {
  if (status !== 'declined' || !decisionDate) return false
  return (Date.now() - new Date(decisionDate).getTime()) / 86_400_000 > 180
}

export function companyHistory(jobs: JobDoc[], company: string, excludeSlug: string): CompanyHistoryEntry[] {
  return jobs
    .filter((job) => job.company === company && job.slug !== excludeSlug)
    .map((job) => ({
      slug: job.slug,
      title: job.title,
      status: job.status,
      discovered_date: job.discovered_date,
      applied_date: job.applied_date,
      decision_date: job.decision_date,
    }))
    .sort((a, b) => b.discovered_date.localeCompare(a.discovered_date))
}

// == Status changes (the old POST /api/jobs/[slug]/status) ==

export const STAGE_TO_STATUS: Record<ProgressStage, JobStatus> = {
  applied: 'applied',
  online_assessment: 'interviewing',
  phone_screen: 'interviewing',
  onsite: 'interviewing',
  offer: 'interviewing',
  declined: 'declined',
}

export interface StatusAction {
  value: string
  label: string
  status?: JobStatus
  stage?: ProgressStage
}

export const STATUS_ACTIONS: StatusAction[] = [
  { value: 'new', label: 'New', status: 'new' },
  { value: 'saved', label: 'Saved', status: 'saved' },
  { value: 'applied', label: 'Applied', stage: 'applied' },
  { value: 'online_assessment', label: 'Online Assessment', stage: 'online_assessment' },
  { value: 'phone_screen', label: 'Phone Screen', stage: 'phone_screen' },
  { value: 'onsite', label: 'Onsite', stage: 'onsite' },
  { value: 'offer', label: 'Offer', stage: 'offer' },
  { value: 'declined', label: 'Declined', stage: 'declined' },
  { value: 'archived', label: 'Archived', status: 'archived' },
]

/** The fields an action changes: status, stage and the first applied or decision date. */
export function statusPatch(
  job: Pick<JobDoc, 'applied_date' | 'decision_date'>,
  action: StatusAction,
): Partial<Pick<JobDoc, 'status' | 'progress_stage' | 'applied_date' | 'decision_date'>> {
  const today = todayIso()
  if (action.stage) {
    const patch: ReturnType<typeof statusPatch> = { progress_stage: action.stage, status: STAGE_TO_STATUS[action.stage] }
    if (action.stage === 'declined') {
      if (!job.decision_date) patch.decision_date = today
    } else if (!job.applied_date) {
      patch.applied_date = today
    }
    return patch
  }
  const status = action.status as JobStatus
  const patch: ReturnType<typeof statusPatch> = { status }
  if ((status === 'applied' || status === 'interviewing') && !job.applied_date) patch.applied_date = today
  if (status === 'declined' && !job.decision_date) patch.decision_date = today
  return patch
}
