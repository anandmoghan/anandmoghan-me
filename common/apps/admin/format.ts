import type { Timestamp } from 'firebase/firestore'

export function toDate(value: unknown): Date | null {
  if (value && typeof (value as Timestamp).toDate === 'function') return (value as Timestamp).toDate()
  return null
}

export function formatDateTime(value: unknown): string {
  const date = toDate(value)
  if (!date) return '-'
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Local calendar day, YYYY-MM-DD. */
export function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
