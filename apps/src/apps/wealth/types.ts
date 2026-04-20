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

export type AssetType = 'stocks' | 'real_estate' | 'crypto' | 'bonds' | 'cash' | 'other'
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
