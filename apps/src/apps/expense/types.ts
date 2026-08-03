// ── Domain types ──────────────────────────────────────────────────────────────

export type Issuer = 'hsbc' | 'amex'
export type AccountType = 'bank' | 'cc'
export type Currency = 'GBP' | 'USD' | 'INR' | 'EUR'
export type TxSign = 'd' | 'c' // debit (money out) | credit (money in)

export interface Account {
  id: string
  institution: Issuer
  type: AccountType
  last4: string          // last 4 of account number / card
  currency: Currency
  nickname: string
  createdAt: Date
  updatedAt: Date
}

export interface AccountInput {
  institution: Issuer
  type: AccountType
  last4: string
  currency: Currency
  nickname: string
}

export interface Vendor {
  id: string
  name: string           // display name
  aliases: string[]      // matched against normalised raw description
  category: string
  color: string          // hex
  createdAt: Date
  updatedAt: Date
}

export interface VendorInput {
  name: string
  aliases: string[]
  category: string
  color: string
}

export interface Statement {
  id: string
  accountId: string
  hash: string           // SHA-256 of file bytes
  periodStart: string    // YYYY-MM-DD
  periodEnd: string
  issuer: Issuer
  txCount: number
  importedAt: Date
}

export interface Transaction {
  id: string
  statementId: string
  accountId: string
  date: string           // YYYY-MM-DD
  amount: number         // signed; negative = money out, positive = money in
  currency: Currency
  rawDescription: string
  vendorName: string     // cleaned display string; defaults to normalised raw
  vendorId: string | null
  transferGroupId: string | null
  sign: TxSign
  metadata: TxMetadata
  userOverrides: UserOverrides
  createdAt: Date
  updatedAt: Date
}

export interface TxMetadata {
  reference?: string     // bank/card reference
  location?: string      // city/country if parsed
  mcc?: string           // merchant category code if available
  fxAmount?: number      // original foreign currency amount
  fxCurrency?: Currency
}

export interface UserOverrides {
  vendorName?: boolean   // user has manually set vendorName
  vendorId?: boolean
  transferGroupId?: boolean
  category?: boolean
}

export interface TransactionInput {
  statementId?: string   // 'manual' for manually-entered
  accountId: string
  date: string
  amount: number
  currency: Currency
  rawDescription: string
  vendorName?: string
  vendorId?: string | null
  metadata?: TxMetadata
}

// ── Wire format (stored in Firestore, abbreviated keys) ──────────────────────

export interface WireAccount {
  i: Issuer              // institution
  t: AccountType         // type
  l4: string             // last 4
  c: Currency            // currency
  nm: string             // nickname
  ca: unknown            // createdAt
  ua: unknown            // updatedAt
}

export interface WireVendor {
  n: string              // name
  a: string[]            // aliases
  cat: string            // category
  col: string            // color hex
  ca: unknown
  ua: unknown
}

export interface WireStatement {
  aId: string            // accountId
  h: string              // file hash
  ps: string             // periodStart
  pe: string             // periodEnd
  iss: Issuer            // issuer
  tc: number             // tx count
  ia: unknown            // importedAt
}

export interface WireTxMetadata {
  ref?: string
  loc?: string
  mcc?: string
  fxa?: number
  fxc?: Currency
}

export interface WireUserOverrides {
  vn?: boolean
  vId?: boolean
  tg?: boolean
  cat?: boolean
}

export interface WireTransaction {
  sId: string            // statementId
  aId: string            // accountId
  d: string              // date YYYY-MM-DD
  m: number              // amount (signed)
  c: Currency            // currency
  r: string              // raw description
  vn: string             // vendor display name
  vId: string | null     // vendor id
  tg: string | null      // transfer group id
  sg: TxSign             // sign
  mt: WireTxMetadata     // metadata
  uo: WireUserOverrides  // user overrides
  ca: unknown
  ua: unknown
}

// ── Adapters ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDate = (v: unknown): Date => (v as any)?.toDate?.() ?? new Date()

export function accountFromWire(id: string, d: WireAccount): Account {
  return {
    id,
    institution: d.i,
    type: d.t,
    last4: d.l4 ?? '',
    currency: d.c,
    nickname: d.nm ?? '',
    createdAt: toDate(d.ca),
    updatedAt: toDate(d.ua),
  }
}

export function accountInputToWire(input: AccountInput): Omit<WireAccount, 'ca' | 'ua'> {
  return {
    i: input.institution,
    t: input.type,
    l4: input.last4,
    c: input.currency,
    nm: input.nickname,
  }
}

export function vendorFromWire(id: string, d: WireVendor): Vendor {
  return {
    id,
    name: d.n ?? '',
    aliases: d.a ?? [],
    category: d.cat ?? 'uncategorised',
    color: d.col ?? '#6b7280',
    createdAt: toDate(d.ca),
    updatedAt: toDate(d.ua),
  }
}

export function vendorInputToWire(input: VendorInput): Omit<WireVendor, 'ca' | 'ua'> {
  return {
    n: input.name,
    a: input.aliases,
    cat: input.category,
    col: input.color,
  }
}

export function statementFromWire(id: string, d: WireStatement): Statement {
  return {
    id,
    accountId: d.aId,
    hash: d.h,
    periodStart: d.ps,
    periodEnd: d.pe,
    issuer: d.iss,
    txCount: d.tc ?? 0,
    importedAt: toDate(d.ia),
  }
}

export function transactionFromWire(id: string, d: WireTransaction): Transaction {
  return {
    id,
    statementId: d.sId,
    accountId: d.aId,
    date: d.d,
    amount: d.m,
    currency: d.c,
    rawDescription: d.r,
    vendorName: d.vn,
    vendorId: d.vId ?? null,
    transferGroupId: d.tg ?? null,
    sign: d.sg,
    metadata: {
      reference: d.mt?.ref,
      location: d.mt?.loc,
      mcc: d.mt?.mcc,
      fxAmount: d.mt?.fxa,
      fxCurrency: d.mt?.fxc,
    },
    userOverrides: {
      vendorName: d.uo?.vn,
      vendorId: d.uo?.vId,
      transferGroupId: d.uo?.tg,
      category: d.uo?.cat,
    },
    createdAt: toDate(d.ca),
    updatedAt: toDate(d.ua),
  }
}

export function transactionInputToWire(input: TransactionInput): Omit<WireTransaction, 'ca' | 'ua'> {
  const mt: WireTxMetadata = {}
  if (input.metadata?.reference) mt.ref = input.metadata.reference
  if (input.metadata?.location) mt.loc = input.metadata.location
  if (input.metadata?.mcc) mt.mcc = input.metadata.mcc
  if (input.metadata?.fxAmount !== undefined) mt.fxa = input.metadata.fxAmount
  if (input.metadata?.fxCurrency) mt.fxc = input.metadata.fxCurrency
  return {
    sId: input.statementId ?? 'manual',
    aId: input.accountId,
    d: input.date,
    m: input.amount,
    c: input.currency,
    r: input.rawDescription,
    vn: input.vendorName ?? input.rawDescription,
    vId: input.vendorId ?? null,
    tg: null,
    sg: input.amount < 0 ? 'd' : 'c',
    mt,
    uo: {},
  }
}

// ── Display helpers ──────────────────────────────────────────────────────────

export const ISSUER_LABEL: Record<Issuer, string> = {
  hsbc: 'HSBC',
  amex: 'American Express',
}

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  bank: 'Bank Account',
  cc: 'Credit Card',
}

export const ACCOUNT_TYPE_ICON: Record<AccountType, string> = {
  bank: '🏦',
  cc: '💳',
}
