import type { Currency } from '../types'

const CURRENCY_FMT: Record<string, Intl.NumberFormat> = {
  GBP: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  INR: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  EUR: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
}

const CURRENCY_FMT_WHOLE: Record<string, Intl.NumberFormat> = {
  GBP: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
  INR: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }),
  EUR: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
}

export function fmt(n: number, currency: Currency | string = 'GBP') {
  return (CURRENCY_FMT[currency] ?? CURRENCY_FMT.GBP).format(n)
}

export function fmtWhole(n: number, currency: Currency | string = 'GBP') {
  return (CURRENCY_FMT_WHOLE[currency] ?? CURRENCY_FMT_WHOLE.GBP).format(n)
}

export function fmtDate(yyyymmdd: string): string {
  if (!yyyymmdd) return ''
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  if (!y || !m || !d) return yyyymmdd
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtDateShort(yyyymmdd: string): string {
  if (!yyyymmdd) return ''
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  if (!y || !m || !d) return yyyymmdd
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}
