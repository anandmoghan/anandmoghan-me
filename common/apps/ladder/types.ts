// Firestore model for ladder. Mirrors ladder/lib/jobs/types.ts and lib/companies/types.ts in both
// tracker repos, and anandmoghan-me-api/modules/ladder/schema.mjs (the worker and agent CLI validate
// against that file, strictly). Job and company fields stay snake_case as in the old frontmatter;
// request docs use camelCase.
//
//   ladder/{tracker}/jobs/{slug}        JobDoc
//   ladder/{tracker}/companies/{slug}   CompanyDoc
//   ladder/{tracker}/requests/{id}      RequestDoc (queue read by the Mac worker)
//   ladder/{tracker}/profile/current    ProfileFields (profile.ts)
//   Storage ladder/{tracker}/generated/{slug}/<file>.pdf
//   Storage ladder/{tracker}/resume/{requestId}.pdf (build-resume output)

export const TRACKERS = ['anand', 'kavya'] as const
export type Tracker = (typeof TRACKERS)[number]

export type JobStatus = 'new' | 'saved' | 'applied' | 'interviewing' | 'declined' | 'archived'
export type RemoteType = 'remote' | 'hybrid' | 'onsite' | 'unknown'
export type ProgressStage = 'applied' | 'online_assessment' | 'phone_screen' | 'onsite' | 'offer' | 'declined'
export type Rating = 'up' | 'down'
export type Sponsorship = 'yes' | 'no' | 'unknown'
export type Confidence = 'confirmed' | 'inferred' | 'unknown'
export type PayPeriod = 'year' | 'hour'
export type JobSource = 'linkedin' | 'company_site' | 'referral' | 'other'
export type CompanyAts = 'greenhouse' | 'ashby' | 'lever' | 'workday' | 'other' | 'unknown'
/** Region and hiring scope enums differ per tracker (see trackers.ts). */
export type JobRegion = string
export type HiringScope = string

export interface ApplyPrepItem {
  question: string
  answer: string
}

export interface JobNote {
  date: string // YYYY-MM-DD
  text: string
}

export interface EmailThread {
  thread_id: string
  subject: string
  date: string // YYYY-MM-DD
  snippet: string
  link?: string
}

export interface JobFields {
  title: string
  company: string
  url: string
  status: JobStatus
  discovered_date: string

  viewed?: boolean
  apply_url?: string
  source?: JobSource
  location?: string
  remote?: RemoteType
  applied_date?: string
  decision_date?: string
  progress_stage?: ProgressStage
  rating?: Rating
  tags?: string[]
  sponsorship?: Sponsorship
  sponsorship_confidence?: Confidence
  sponsorship_source?: string
  pay_min?: number
  pay_max?: number
  pay_currency?: string
  pay_period?: PayPeriod
  pay_confidence?: Confidence
  pay_source?: string
  fit_summary?: string
  products?: string
  products_source?: string
  funding_notes?: string
  funding_source?: string
  financials_notes?: string
  financials_source?: string
  region?: JobRegion
  hiring_scope?: HiringScope
  hiring_scope_confidence?: Confidence
  applicant_count?: number
  applicant_count_label?: string
  resume_requested?: boolean
  /** Storage path, ladder/{tracker}/generated/{slug}/<file>.pdf */
  resume_pdf?: string
  resume_tex?: string
  cover_letter_requested?: boolean
  cover_letter_pdf?: string
  cover_letter_tex?: string
  apply_prep?: ApplyPrepItem[]
  notes?: JobNote[]
  email_threads?: EmailThread[]
  refresh_requested?: boolean
  last_refreshed_date?: string
}

export interface JobDoc extends JobFields {
  slug: string
  tracker: Tracker
  /** Sanitised job description HTML, written only by the migration and the worker. */
  body_html: string
}

/** The fields a signed-in client may change on a job (firebase/rules/ladder.rules). */
export const USER_JOB_FIELDS = [
  'status',
  'rating',
  'viewed',
  'notes',
  'apply_prep',
  'applied_date',
  'decision_date',
  'progress_stage',
  'refresh_requested',
] as const
export type UserJobField = (typeof USER_JOB_FIELDS)[number]

export interface CompanyFields {
  name: string
  career_page_url: string
  ats?: CompanyAts
  tags?: string[]
  regions?: string[]
  last_verified_date?: string
  notes?: string
  products?: string
  products_source?: string
  funding_notes?: string
  funding_source?: string
  financials_notes?: string
  financials_source?: string
  sponsorship?: Sponsorship
  sponsorship_confidence?: Confidence
  sponsorship_source?: string
}

export interface CompanyDoc extends CompanyFields {
  slug: string
  tracker: Tracker
  body_html: string
}

/** Job request types carry the job's slug; scrape and build-resume carry none. */
export type RequestType = 'refresh-job' | 'prepare-materials' | 'score-fit' | 'scrape' | 'build-resume'
export type RequestStatus = 'queued' | 'running' | 'done' | 'failed'

export interface RequestDoc {
  id: string
  type: RequestType
  status: RequestStatus
  slug?: string
  createdBy?: string
  createdAt?: Date | null
  finishedAt?: Date | null
  error?: string | null
  /** build-resume: Storage path of the built PDF, ladder/{tracker}/resume/{id}.pdf (worker sets it). */
  pdf?: string
}

export interface CompanyHistoryEntry {
  slug: string
  title: string
  status: JobStatus
  discovered_date: string
  applied_date?: string
  decision_date?: string
}
