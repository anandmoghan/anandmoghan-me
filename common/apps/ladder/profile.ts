// The tracker profile: who the candidate is and what they want, read by the Mac worker's agents.
// Mirrors profileFieldsSchema in anandmoghan-me-api modules/ladder/schema.mjs (JSON Schema:
// modules/ladder/profile.schema.json); firebase/rules/ladder.rules checks keys, types and sizes.
//
//   ladder/{tracker}/profile/current                ProfileDoc (the whole doc is written on save)
//   ladder/{tracker}/profile/current/history/{id}   ProfileHistoryEntry (earlier resumeTex, append-only)

export const SENIORITY = [
  'entry',
  'mid',
  'senior',
  'staff',
  'principal',
  'lead',
  'manager',
  'senior_manager',
  'director',
  'executive',
] as const
export const ROLE_TYPE = ['individual_contributor', 'people_manager', 'either'] as const
export const WORK_MODE = ['remote', 'hybrid', 'onsite'] as const
export const SALARY_PERIOD = ['year', 'month', 'day', 'hour'] as const
export const CONTRACT_TYPE = ['permanent', 'fixed_term', 'contract', 'freelance', 'part_time', 'internship'] as const

export type Seniority = (typeof SENIORITY)[number]
export type RoleType = (typeof ROLE_TYPE)[number]
export type WorkMode = (typeof WORK_MODE)[number]
export type SalaryPeriod = (typeof SALARY_PERIOD)[number]
export type ContractType = (typeof CONTRACT_TYPE)[number]

export const MAX_RESUME_TEX = 200_000
export const MAX_ABOUT = 5_000
export const MAX_WORK_AUTHORISATION = 2_000
export const MAX_LIST = 100
export const MAX_ITEM = 500

export const LABELS: Record<Seniority | RoleType | WorkMode | SalaryPeriod | ContractType, string> = {
  entry: 'Entry',
  mid: 'Mid',
  senior: 'Senior',
  staff: 'Staff',
  principal: 'Principal',
  lead: 'Lead',
  manager: 'Manager',
  senior_manager: 'Senior manager',
  director: 'Director',
  executive: 'Executive',
  individual_contributor: 'Individual contributor',
  people_manager: 'People manager',
  either: 'Either',
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On site',
  year: 'per year',
  month: 'per month',
  day: 'per day',
  hour: 'per hour',
  permanent: 'Permanent',
  fixed_term: 'Fixed term',
  contract: 'Contract',
  freelance: 'Freelance',
  part_time: 'Part time',
  internship: 'Internship',
}

export interface TargetRole {
  title: string
  seniority: Seniority
  roleType: RoleType
}

export interface SalaryFloor {
  amount: number
  currency: string
  period: SalaryPeriod
}

/** The string-list fields, in the order the form shows them. */
export const LIST_FIELDS = [
  'highlights',
  'skills',
  'industries',
  'companiesPrefer',
  'companiesAvoid',
  'locations',
  'dealBreakers',
  'searchSources',
  'keywords',
] as const
export type ListField = (typeof LIST_FIELDS)[number]

export type ProfileFields = {
  resumeTex: string
  about: string
  targetRoles: TargetRole[]
  workMode: WorkMode[]
  workAuthorisation: string
  salaryFloor: SalaryFloor | null
  contractTypes: ContractType[]
} & Record<ListField, string[]>

export interface ProfileHistoryEntry {
  id: string
  resumeTex: string
  savedAt: Date | null
  savedBy: string
}

export function emptyProfile(): ProfileFields {
  return {
    resumeTex: '',
    about: '',
    highlights: [],
    skills: [],
    targetRoles: [],
    industries: [],
    companiesPrefer: [],
    companiesAvoid: [],
    locations: [],
    workMode: [],
    workAuthorisation: '',
    salaryFloor: null,
    contractTypes: [],
    dealBreakers: [],
    searchSources: [],
    keywords: [],
  }
}

/** The form's fields from a stored document; the audit fields (updatedAt, updatedBy) are dropped. */
export function profileFromDoc(data: Record<string, unknown>): ProfileFields {
  const profile = emptyProfile()
  for (const key of Object.keys(profile) as (keyof ProfileFields)[]) {
    if (key in data) (profile as Record<string, unknown>)[key] = data[key]
  }
  return profile
}

/** List items are trimmed and empty ones dropped, as the backend schema trims before validating. */
export function normaliseProfile(p: ProfileFields): ProfileFields {
  const lists = Object.fromEntries(
    LIST_FIELDS.map((k) => [k, p[k].map((s) => s.trim()).filter(Boolean)]),
  ) as Record<ListField, string[]>
  return {
    ...p,
    ...lists,
    targetRoles: p.targetRoles.map((r) => ({ ...r, title: r.title.trim() })),
    salaryFloor: p.salaryFloor && { ...p.salaryFloor, currency: p.salaryFloor.currency.trim().toUpperCase() },
  }
}

export type ProfileErrors = Partial<Record<keyof ProfileFields, string>>

function listError(items: string[]): string | undefined {
  if (items.length > MAX_LIST) return `At most ${MAX_LIST} items.`
  if (items.some((s) => s.length > MAX_ITEM)) return `Each item is at most ${MAX_ITEM} characters.`
  return undefined
}

const unique = (values: string[]) => new Set(values).size === values.length

/** Field errors for a normalised profile, matching the backend schema; empty when it is valid. */
export function validateProfile(p: ProfileFields): ProfileErrors {
  const errors: ProfileErrors = {}
  if (p.resumeTex.length > MAX_RESUME_TEX) errors.resumeTex = `At most ${MAX_RESUME_TEX.toLocaleString()} characters.`
  if (p.about.length > MAX_ABOUT) errors.about = `At most ${MAX_ABOUT.toLocaleString()} characters.`
  if (p.workAuthorisation.length > MAX_WORK_AUTHORISATION) {
    errors.workAuthorisation = `At most ${MAX_WORK_AUTHORISATION.toLocaleString()} characters.`
  }
  for (const key of LIST_FIELDS) {
    const error = listError(p[key])
    if (error) errors[key] = error
  }
  if (p.targetRoles.length > MAX_LIST) errors.targetRoles = `At most ${MAX_LIST} roles.`
  else if (p.targetRoles.some((r) => r.title.length === 0 || r.title.length > MAX_ITEM)) {
    errors.targetRoles = `Every role needs a title of at most ${MAX_ITEM} characters.`
  } else if (
    p.targetRoles.some(
      (r) => !(SENIORITY as readonly string[]).includes(r.seniority) || !(ROLE_TYPE as readonly string[]).includes(r.roleType),
    )
  ) {
    errors.targetRoles = 'Pick a seniority and role type for every role.'
  }
  if (!unique(p.workMode) || p.workMode.some((m) => !(WORK_MODE as readonly string[]).includes(m))) {
    errors.workMode = 'Pick each work mode at most once.'
  }
  if (!unique(p.contractTypes) || p.contractTypes.some((c) => !(CONTRACT_TYPE as readonly string[]).includes(c))) {
    errors.contractTypes = 'Pick each contract type at most once.'
  }
  const floor = p.salaryFloor
  if (floor) {
    if (!Number.isFinite(floor.amount) || floor.amount < 0) errors.salaryFloor = 'The amount must be zero or more.'
    else if (!/^[A-Z]{3}$/.test(floor.currency)) errors.salaryFloor = 'The currency must be an ISO 4217 code such as GBP.'
    else if (!(SALARY_PERIOD as readonly string[]).includes(floor.period)) errors.salaryFloor = 'Pick a period.'
  }
  return errors
}

/** A key-order-independent JSON form (Firestore returns map keys in its own order). */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([a], [b]) => (a < b ? -1 : 1))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export const sameProfile = (a: ProfileFields, b: ProfileFields) => canonical(a) === canonical(b)
