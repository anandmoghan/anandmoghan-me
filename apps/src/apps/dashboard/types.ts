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
