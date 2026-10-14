import type { Tracker } from './types'

// The per-tracker differences between ~/workspace/code/ladder (anand) and ladder-kavya (kavya):
// region and hiring-scope enums, display currencies and the default pay filter.

export type DisplayCurrency = 'GBP' | 'USD' | 'CHF' | 'EUR' | 'SEK'

interface Option {
  value: string
  label: string
}

export interface TrackerConfig {
  id: Tracker
  /** Name in the tracker switcher. */
  label: string
  regions: Option[]
  /** Region badge labels (the filter labels differ slightly for US Onsite). */
  regionBadge: Record<string, string>
  /** Badge per hiring scope: `restricted` is the red one. `unclear` shows nothing. */
  hiringScope: { restricted: string; restrictedLabel: string; labels: Record<string, string> }
  currencies: DisplayCurrency[]
  /** Pay min filter when the URL has none (anand 100000; kavya none). */
  defaultPayMin?: number
  payMinPlaceholder: string
  payMinTitle: string
}

export const TRACKER_CONFIG: Record<Tracker, TrackerConfig> = {
  anand: {
    id: 'anand',
    label: 'Anand',
    regions: [
      { value: 'uk', label: 'UK' },
      { value: 'switzerland', label: 'Switzerland' },
      { value: 'germany', label: 'Germany' },
      { value: 'france', label: 'France' },
      { value: 'sweden', label: 'Sweden' },
      { value: 'netherlands', label: 'Netherlands' },
      { value: 'us_remote', label: 'US Remote' },
      { value: 'us', label: 'US Onsite' },
      { value: 'other', label: 'Other' },
    ],
    regionBadge: {
      uk: 'UK',
      switzerland: 'Switzerland',
      germany: 'Germany',
      france: 'France',
      sweden: 'Sweden',
      netherlands: 'Netherlands',
      us_remote: 'US Remote',
      us: 'US',
      other: 'Other',
    },
    hiringScope: {
      restricted: 'us_only',
      restrictedLabel: 'US-only, worth a stretch apply',
      labels: { global: 'Hiring globally', open_to_uk_eu: 'Open to UK/EU hires' },
    },
    currencies: ['GBP', 'USD', 'CHF', 'EUR', 'SEK'],
    defaultPayMin: 100000,
    payMinPlaceholder: 'e.g. 150000',
    payMinTitle: 'Defaults to 100000; enter 0 to see jobs below that too',
  },
  kavya: {
    id: 'kavya',
    label: 'Kavya',
    regions: [
      { value: 'uk', label: 'UK' },
      { value: 'switzerland', label: 'Switzerland' },
      { value: 'other', label: 'Other' },
    ],
    regionBadge: { uk: 'UK', switzerland: 'Switzerland', other: 'Other' },
    hiringScope: {
      restricted: 'local_only',
      restrictedLabel: 'Local hires only',
      labels: { global: 'Hiring globally', open_to_relocation: 'Open to relocation' },
    },
    currencies: ['GBP', 'CHF', 'EUR'],
    payMinPlaceholder: 'e.g. 50000',
    payMinTitle: 'No pay filter applied unless set',
  },
}

export function isTracker(value: string | null | undefined): value is Tracker {
  return value === 'anand' || value === 'kavya'
}
