import type { Account, Transaction } from '../types'

export interface TransferCandidate {
  a: Transaction
  b: Transaction
  score: number
  dayDiff: number
}

const MAX_DAY_DIFF = 3
const AMOUNT_TOLERANCE = 0.01
const MIN_SCORE = 3

/**
 * Detects credit-card payments and other inter-account transfers.
 *
 * A pair (a, b) is a candidate when:
 *  - they belong to different accounts,
 *  - their amounts are exactly opposite (a.amount + b.amount == 0, within tolerance),
 *  - their dates are within MAX_DAY_DIFF days,
 *  - the description on at least one side contains a strong hint (payment keyword
 *    or the other account's identifier).
 *
 * The matcher is greedy from highest score downward: each transaction can only
 * appear in a single pair.
 */
export function detectTransfers(
  transactions: Transaction[],
  accounts: Account[]
): TransferCandidate[] {
  const accountById = new Map(accounts.map((a) => [a.id, a]))

  // Only consider transactions that aren't already in a transfer group.
  const eligible = transactions.filter((t) => !t.transferGroupId)

  // Index by absolute amount to keep matching cheap.
  const byAbs = new Map<number, Transaction[]>()
  for (const t of eligible) {
    const key = Math.round(Math.abs(t.amount) * 100)
    if (!byAbs.has(key)) byAbs.set(key, [])
    byAbs.get(key)!.push(t)
  }

  const candidates: TransferCandidate[] = []
  const seen = new Set<string>()

  for (const t of eligible) {
    const key = Math.round(Math.abs(t.amount) * 100)
    const peers = byAbs.get(key) ?? []
    for (const p of peers) {
      if (p.id === t.id) continue
      if (p.accountId === t.accountId) continue
      // Order pair so we don't double-process
      const pairKey = [t.id, p.id].sort().join('|')
      if (seen.has(pairKey)) continue
      seen.add(pairKey)
      // Sign check: must net to zero
      if (Math.abs(t.amount + p.amount) > AMOUNT_TOLERANCE) continue
      const dayDiff = daysBetween(t.date, p.date)
      if (dayDiff > MAX_DAY_DIFF) continue
      const score = scorePair(t, p, accountById)
      if (score < MIN_SCORE) continue
      candidates.push({ a: t, b: p, score, dayDiff })
    }
  }

  // Greedy claim: highest score first, smaller day diff as tiebreaker.
  candidates.sort((x, y) => y.score - x.score || x.dayDiff - y.dayDiff)
  const claimed = new Set<string>()
  const result: TransferCandidate[] = []
  for (const c of candidates) {
    if (claimed.has(c.a.id) || claimed.has(c.b.id)) continue
    claimed.add(c.a.id); claimed.add(c.b.id)
    result.push(c)
  }
  return result
}

function scorePair(a: Transaction, b: Transaction, accounts: Map<string, Account>): number {
  let score = 1
  const aDesc = a.rawDescription.toUpperCase()
  const bDesc = b.rawDescription.toUpperCase()
  const accA = accounts.get(a.accountId)
  const accB = accounts.get(b.accountId)

  // Payment keywords (these strongly indicate a CC payment receipt)
  if (/PAYMENT|THANK YOU|PAYMENT RECEIVED/.test(aDesc) || /PAYMENT|THANK YOU|PAYMENT RECEIVED/.test(bDesc)) {
    score += 4
  }

  // Bank-side description mentions the other account's last4 (HSBC CC payments)
  if (accB && a.amount < 0 && b.amount > 0) {
    if (accB.last4 && aDesc.includes(accB.last4)) score += 3
  }
  if (accA && b.amount < 0 && a.amount > 0) {
    if (accA.last4 && bDesc.includes(accA.last4)) score += 3
  }

  // Bank-side description mentions the other institution
  const issuerHints: Record<string, string[]> = {
    amex: ['AMERICAN EXP', 'AMEX', 'AMERICAN EXPRESS'],
    hsbc: ['HSBC', 'HSBC CC', 'HSBC PREMIER'],
  }
  if (accB) {
    for (const hint of issuerHints[accB.institution] ?? []) {
      if (aDesc.includes(hint)) { score += 2; break }
    }
  }
  if (accA) {
    for (const hint of issuerHints[accA.institution] ?? []) {
      if (bDesc.includes(hint)) { score += 2; break }
    }
  }

  // Same calendar date is a strong signal
  if (a.date === b.date) score += 2

  return score
}

function daysBetween(d1: string, d2: string): number {
  const [y1, m1, day1] = d1.split('-').map(Number)
  const [y2, m2, day2] = d2.split('-').map(Number)
  const t1 = Date.UTC(y1, m1 - 1, day1)
  const t2 = Date.UTC(y2, m2 - 1, day2)
  return Math.abs(Math.round((t1 - t2) / (1000 * 60 * 60 * 24)))
}
