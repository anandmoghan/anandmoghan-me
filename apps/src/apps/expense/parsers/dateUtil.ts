const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

const MONTH_LONG: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

/** Parse "DD MMM YY" or "DD MMM YYYY" -> YYYY-MM-DD. */
export function parseDdMmmYy(input: string): string | null {
  const m = input.trim().match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{2,4})$/)
  if (!m) return null
  const day = parseInt(m[1])
  const mon = MONTHS[m[2].toLowerCase().slice(0, 3)]
  if (!mon) return null
  let year = parseInt(m[3])
  if (year < 100) year += 2000
  if (day < 1 || day > 31) return null
  return `${year}-${pad(mon)}-${pad(day)}`
}

/** Parse "MMM D" with assumed year (Amex format) -> YYYY-MM-DD. */
export function parseMmmD(input: string, assumedYear: number): string | null {
  const m = input.trim().match(/^([A-Za-z]{3,})\s+(\d{1,2})$/)
  if (!m) return null
  const mon = MONTHS[m[1].toLowerCase().slice(0, 3)]
  if (!mon) return null
  const day = parseInt(m[2])
  if (day < 1 || day > 31) return null
  return `${assumedYear}-${pad(mon)}-${pad(day)}`
}

/** Parse "1 March 2026" / "28 March 2026" / "14 April 2026" -> YYYY-MM-DD. */
export function parseDdMonthYyyy(input: string): string | null {
  const m = input.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (!m) return null
  const day = parseInt(m[1])
  const mon = MONTH_LONG[m[2].toLowerCase()]
  if (!mon) return null
  return `${parseInt(m[3])}-${pad(mon)}-${pad(day)}`
}

/** Subtract one month and clamp day. Used for HSBC CC where only end date is given. */
export function previousMonth(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  const prev = new Date(y, m - 2, d)
  return `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}-${pad(prev.getDate())}`
}
