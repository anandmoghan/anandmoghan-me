export type BudgetKind = 't' | 'c'
export type BudgetWindow = 'd' | 'w' | 'm'

export interface Budget {
  kind: BudgetKind
  value: number        // hours if kind='t', occurrences if kind='c'
  window: BudgetWindow
}

export interface Category {
  id: string           // cid, e.g. 'c1'
  name: string
  icon: string         // emoji
  budgets: Budget[]
  minDuration?: number // optional, in seconds
  archived: boolean
  order: number
  lastRunAt?: Date     // written when a session for this category closes
}

export interface Session {
  id: string
  categoryId: string
  startedAt: Date
  endedAt: Date | null   // null = active session
  dayKey: number         // YYYYMMDD in user's local timezone
}

export interface RollupEntry {
  seconds: number
  count: number
}

// cid -> RollupEntry. Missing entry = zero.
export type RollupMap = Record<string, RollupEntry>
