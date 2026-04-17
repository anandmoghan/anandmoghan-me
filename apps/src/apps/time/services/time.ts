import { getISOWeek, getISOWeekYear } from 'date-fns'

/** Returns YYYYMMDD integer for the given date in the given IANA timezone. */
export function localDayKey(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const year = parts.find(p => p.type === 'year')!.value
  const month = parts.find(p => p.type === 'month')!.value
  const day = parts.find(p => p.type === 'day')!.value
  return parseInt(`${year}${month}${day}`, 10)
}

/**
 * Returns 'YYYY-Www' ISO week key for the given date in the given IANA timezone.
 * Uses date-fns getISOWeek / getISOWeekYear on a "fake local" Date.
 */
export function isoWeekKey(date: Date, tz: string): string {
  const local = toLocalDate(date, tz)
  const week = getISOWeek(local)
  const year = getISOWeekYear(local)
  return `${year}-W${String(week).padStart(2, '0')}`
}

/** Returns 'YYYYMM' month key for the given date in the given IANA timezone. */
export function monthKey(date: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date)
  const year = parts.find(p => p.type === 'year')!.value
  const month = parts.find(p => p.type === 'month')!.value
  return `${year}${month}`
}

/**
 * Converts a YYYYMMDD dayKey to a Date object (noon UTC).
 * Noon UTC ensures formatting in most timezones returns the intended local date.
 */
export function dayKeyToDate(dk: number): Date {
  const year = Math.floor(dk / 10000)
  const month = Math.floor((dk % 10000) / 100) - 1
  const day = dk % 100
  return new Date(Date.UTC(year, month, day, 12, 0, 0))
}

/** Returns the YYYYMMDD for the day after dk. */
export function nextDayKey(dk: number): number {
  const date = dayKeyToDate(dk)
  date.setUTCDate(date.getUTCDate() + 1)
  return localDayKey(date, 'UTC')
}

/** Derives week key directly from a dayKey (no tz conversion needed for same-day). */
export function isoWeekKeyFromDk(dk: number, tz: string): string {
  return isoWeekKey(dayKeyToDate(dk), tz)
}

/** Derives month key directly from a dayKey. */
export function monthKeyFromDk(dk: number): string {
  const year = Math.floor(dk / 10000)
  const month = Math.floor((dk % 10000) / 100)
  return `${year}${String(month).padStart(2, '0')}`
}

export interface SessionPiece {
  dk: number
  s: Date
  e: Date
}

/**
 * Splits a session spanning multiple local days into per-day pieces.
 * Each piece has its own dk, s, e.
 */
export function splitAcrossMidnight(startedAt: Date, endedAt: Date, tz: string): SessionPiece[] {
  const pieces: SessionPiece[] = []
  let current = startedAt

  while (true) {
    const dk = localDayKey(current, tz)
    const midnight = nextLocalMidnightUtc(current, tz)

    if (endedAt.getTime() <= midnight.getTime()) {
      pieces.push({ dk, s: current, e: endedAt })
      break
    } else {
      pieces.push({ dk, s: current, e: midnight })
      current = midnight
    }
  }

  return pieces
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Converts a UTC Date to a "fake local" Date object suitable for date-fns functions.
 * The fake date has the same year/month/day/hour/minute/second as the local time in tz,
 * but is a plain JavaScript Date (which date-fns treats as local).
 */
function toLocalDate(date: Date, tz: string): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)!.value
  const y = parseInt(get('year'))
  const mo = parseInt(get('month')) - 1
  const d = parseInt(get('day'))
  const h = parseInt(get('hour'))
  const mi = parseInt(get('minute'))
  const s = parseInt(get('second'))
  return new Date(y, mo, d, h, mi, s)
}

/**
 * Returns the UTC timestamp of the next local midnight after `date` in `tz`.
 * Uses the "shift" method: compute the offset by comparing a base UTC time
 * against its timezone-formatted representation.
 */
function nextLocalMidnightUtc(date: Date, tz: string): Date {
  // Parse local date parts
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const y = parseInt(parts.find(p => p.type === 'year')!.value)
  const mo = parseInt(parts.find(p => p.type === 'month')!.value)
  const d = parseInt(parts.find(p => p.type === 'day')!.value)

  // Next day in UTC (handles month/year rollover)
  const nextDay = new Date(Date.UTC(y, mo - 1, d + 1))
  const ny = nextDay.getUTCFullYear()
  const nm = nextDay.getUTCMonth() + 1
  const nd = nextDay.getUTCDate()

  // Treat local midnight as UTC base, then find the actual UTC offset
  const baseUtcMs = Date.UTC(ny, nm - 1, nd, 0, 0, 0)
  const tzParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(baseUtcMs))
  const tGet = (t: string) => parseInt(tzParts.find(p => p.type === t)!.value)
  const tzMs = Date.UTC(tGet('year'), tGet('month') - 1, tGet('day'), tGet('hour'), tGet('minute'), tGet('second'))
  const offsetMs = baseUtcMs - tzMs

  return new Date(baseUtcMs + offsetMs)
}
