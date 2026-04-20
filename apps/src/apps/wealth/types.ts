// ── Wire format (stored in Firestore) ─────────────────────────────────────────

export interface WireAsset {
  n: string           // name
  t: AssetType        // type
  c: AssetCurrency    // currency
  iv: number          // initialValue
  cv: number          // currentValue
  gr: number          // growthRate
  yc: number          // yearlyContribution
  pd: string          // purchaseDate
  ed?: string         // contributionEndDate (optional)
  ca: unknown         // createdAt (Firestore Timestamp)
  ua: unknown         // updatedAt (Firestore Timestamp)
}

export function assetFromWire(id: string, d: WireAsset): Asset {
  return {
    id,
    name: d.n,
    type: d.t,
    currency: d.c,
    initialValue: d.iv ?? 0,
    currentValue: d.cv ?? 0,
    growthRate: d.gr ?? 0,
    yearlyContribution: d.yc ?? 0,
    purchaseDate: d.pd ?? '',
    contributionEndDate: d.ed,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createdAt: (d.ca as any)?.toDate?.() ?? new Date(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updatedAt: (d.ua as any)?.toDate?.() ?? new Date(),
  }
}

export function assetInputToWire(input: AssetInput): Omit<WireAsset, 'ca' | 'ua'> {
  const wire: Omit<WireAsset, 'ca' | 'ua'> = {
    n: input.name,
    t: input.type,
    c: input.currency,
    iv: input.initialValue,
    cv: input.currentValue,
    gr: input.growthRate,
    yc: input.yearlyContribution,
    pd: input.purchaseDate,
  }
  if (input.contributionEndDate) wire.ed = input.contributionEndDate
  return wire
}

// ── App types ──────────────────────────────────────────────────────────────────

export interface MemberData {
  uid: string
  displayName: string
  email: string
  photoURL: string
}

export interface GroupMemberPortfolio {
  member: MemberData
  portfolio: import('./services/trading212').Position[]
  cash: import('./services/trading212').AccountCash | null
  orders: import('./services/trading212').Order[]
  loading: boolean
  error: string | null
}

export type AssetType = 'stocks' | 'real_estate' | 'crypto' | 'bonds' | 'cash' | 'mutual_funds' | 'pension' | 'insurance' | 'gold' | 'vehicle' | 'other'
export type AssetCurrency = 'GBP' | 'USD' | 'INR'

export interface Asset {
  id: string
  name: string
  type: AssetType
  currency: AssetCurrency
  initialValue: number
  currentValue: number
  growthRate: number       // annual %, used for projection
  yearlyContribution: number
  purchaseDate: string     // YYYY-MM-DD
  contributionEndDate?: string
  createdAt: Date
  updatedAt: Date
}

export interface AssetInput {
  name: string
  type: AssetType
  currency: AssetCurrency
  initialValue: number
  currentValue: number
  growthRate: number
  yearlyContribution: number
  purchaseDate: string
  contributionEndDate?: string
}
