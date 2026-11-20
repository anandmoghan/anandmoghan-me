// Energy for the Home app: the shape of GET /home/energy (and the stream's {type:"energy"} event)
// and the pure formatting and derivation the Energy tab draws from. Every field may be missing or
// null while the Home Mini has not reported; anything unknown renders as DASH. Unit tested in
// tests/home/energy.test.ts.

export const DASH = '—'

type Num = number | null | undefined

export interface EnergyRates {
  electricity_per_kwh?: number | null
  gas_per_kwh?: number | null
  electricity_standing?: number | null
  gas_standing?: number | null
  tariff?: string | null
  currency?: string | null
}

export interface EnergyDay {
  electricity_kwh?: number | null
  electricity_cost?: number | null
  gas_kwh?: number | null
  gas_cost?: number | null
  total_cost?: number | null
}

export interface EnergyHour {
  /** 0 to 23, or an ISO time whose hour is used. */
  hour: number | string
  electricity_kwh?: number | null
  gas_kwh?: number | null
}

export interface EnergyDate {
  /** "YYYY-MM-DD". */
  date: string
  electricity_kwh?: number | null
  gas_kwh?: number | null
}

export interface EnergyDevice {
  entity_id: string
  name: string
  room?: string | null
  power_w?: number | null
  kwh_today?: number | null
  cost_today?: number | null
  kwh_month?: number | null
  cost_month?: number | null
  estimated?: boolean
  note?: string | null
}

export interface Energy {
  updated?: string | null
  rates?: EnergyRates | null
  now?: { electricity_w?: number | null } | null
  today?: EnergyDay | null
  yesterday?: EnergyDay | null
  hourly_today?: EnergyHour[] | null
  daily_7d?: EnergyDate[] | null
  devices?: EnergyDevice[] | null
  other_today?: { electricity_kwh?: number | null } | null
}

const known = (value: Num): value is number => typeof value === 'number' && Number.isFinite(value)

/** A stream reading laid over what the page holds: fields the event carries replace, the rest stay. */
export function mergeEnergy(current: Energy | null, reading: Energy & { type?: string }): Energy {
  const next: Energy = { ...current }
  for (const key of ENERGY_KEYS) if (reading[key] !== undefined) Object.assign(next, { [key]: reading[key] })
  return next
}

const ENERGY_KEYS = [
  'updated', 'rates', 'now', 'today', 'yesterday', 'hourly_today', 'daily_7d', 'devices', 'other_today',
] as const satisfies readonly (keyof Energy)[]

/** "640 W" under a kilowatt, "1.24 kW" from there. */
export function formatPower(watts: Num): string {
  if (!known(watts)) return DASH
  if (Math.abs(watts) < 1000) return `${Math.round(watts)} W`
  return `${(watts / 1000).toFixed(2)} kW`
}

/** "0.42 kWh", "9.8 kWh", "142 kWh": about three significant figures. */
export function formatKwh(kwh: Num): string {
  if (!known(kwh)) return DASH
  const abs = Math.abs(kwh)
  const digits = abs < 1 && abs > 0 ? 2 : abs < 100 ? 1 : 0
  return `${kwh.toFixed(digits)} kWh`
}

/** "£3.12" (GBP unless the rates name another currency). */
export function formatMoney(amount: Num, currency?: string | null): string {
  if (!known(amount)) return DASH
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'GBP' }).format(amount)
}

/** A unit rate: "26.6p/kWh" in pounds, "€0.27/kWh" otherwise. */
export function formatRate(perKwh: Num, currency?: string | null): string {
  if (!known(perKwh)) return DASH
  if ((currency || 'GBP') === 'GBP') return `${(perKwh * 100).toFixed(1)}p/kWh`
  return `${formatMoney(perKwh, currency)}/kWh`
}

/** The page subtitle: "Flexible Octopus · 26.6p/kWh"; null when neither is known. */
export function tariffLine(rates: EnergyRates | null | undefined): string | null {
  const parts = [
    rates?.tariff?.trim() || null,
    known(rates?.electricity_per_kwh) ? formatRate(rates?.electricity_per_kwh, rates?.currency) : null,
  ].filter((part): part is string => Boolean(part))
  return parts.length ? parts.join(' · ') : null
}

/** "£0.40 less than yesterday", "£0.40 more than yesterday", "Same as yesterday", or null. */
export function compareWithYesterday(energy: Energy | null | undefined): string | null {
  const today = energy?.today?.total_cost
  const yesterday = energy?.yesterday?.total_cost
  if (!known(today) || !known(yesterday)) return null
  const diff = today - yesterday
  if (Math.abs(diff) < 0.005) return 'Same as yesterday'
  return `${formatMoney(Math.abs(diff), energy?.rates?.currency)} ${diff < 0 ? 'less' : 'more'} than yesterday`
}

/** A part of today's electricity, 0 to 1; null when either side is unknown or today is zero. */
export function shareOf(kwh: Num, total: Num): number | null {
  if (!known(kwh) || !known(total) || total <= 0) return null
  return Math.min(1, Math.max(0, kwh / total))
}

export interface UsageRow {
  key: string
  name: string
  room: string | null
  kwhToday: number | null
  costToday: number | null
  kwhMonth: number | null
  costMonth: number | null
  share: number | null
  estimated: boolean
  note: string | null
}

/** "Where it went today": the metered devices, most used first, then "Everything else", priced at
 * the unit rate when the API gives no cost for it. */
export function usageRows(energy: Energy | null | undefined): UsageRow[] {
  const total = energy?.today?.electricity_kwh
  const value = (n: Num) => (known(n) ? n : null)
  const devices: UsageRow[] = (energy?.devices ?? [])
    .map((d) => ({
      key: d.entity_id,
      name: d.name,
      room: d.room?.trim() || null,
      kwhToday: value(d.kwh_today),
      costToday: value(d.cost_today),
      kwhMonth: value(d.kwh_month),
      costMonth: value(d.cost_month),
      share: shareOf(d.kwh_today, total),
      estimated: Boolean(d.estimated),
      note: d.note?.trim() || null,
    }))
    .sort((a, b) => (b.kwhToday ?? -1) - (a.kwhToday ?? -1))
  const other = energy?.other_today?.electricity_kwh
  if (!known(other)) return devices
  const rate = energy?.rates?.electricity_per_kwh
  return [
    ...devices,
    {
      key: 'other',
      name: 'Everything else',
      room: null,
      kwhToday: other,
      costToday: known(rate) ? other * rate : null,
      kwhMonth: null,
      costMonth: null,
      share: shareOf(other, total),
      estimated: false,
      note: null,
    },
  ]
}

/** The hour 0 to 23 of an hourly reading, or null. */
export function hourOf(hour: number | string): number | null {
  if (typeof hour === 'number') return Number.isInteger(hour) && hour >= 0 && hour < 24 ? hour : null
  const iso = /T(\d{2}):/.exec(hour) ?? /^(\d{1,2})(?::|$)/.exec(hour)
  if (!iso) return null
  const h = Number(iso[1])
  return h >= 0 && h < 24 ? h : null
}

/** "Mon" for "2026-11-16" (read as a local calendar date, never shifted by time zone). */
export function weekday(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return date
  return new Date(y, m - 1, d, 12).toLocaleDateString('en-GB', { weekday: 'short' })
}

/** "16 Nov" for "2026-11-16". */
export function shortDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return date
  return new Date(y, m - 1, d, 12).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export interface Bar {
  key: string
  /** Under the bar when shown, e.g. "06" or "Mon". */
  tick: string
  /** In the tooltip and the table, e.g. "06:00" or "Mon 16 Nov". */
  label: string
  electricity: number | null
  gas: number | null
}

/** Today's 24 hours (hours with no reading stay empty). */
export function hourlyBars(hours: EnergyHour[] | null | undefined): Bar[] {
  const byHour = new Map<number, EnergyHour>()
  for (const h of hours ?? []) {
    const hour = hourOf(h.hour)
    if (hour !== null) byHour.set(hour, h)
  }
  return Array.from({ length: 24 }, (_, hour) => {
    const reading = byHour.get(hour)
    const hh = String(hour).padStart(2, '0')
    return {
      key: hh,
      tick: hour % 6 === 0 ? hh : '',
      label: `${hh}:00`,
      electricity: known(reading?.electricity_kwh) ? reading.electricity_kwh : null,
      gas: known(reading?.gas_kwh) ? reading.gas_kwh : null,
    }
  })
}

export function dailyBars(days: EnergyDate[] | null | undefined): Bar[] {
  return [...(days ?? [])]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => ({
      key: day.date,
      tick: weekday(day.date),
      label: `${weekday(day.date)} ${shortDate(day.date)}`,
      electricity: known(day.electricity_kwh) ? day.electricity_kwh : null,
      gas: known(day.gas_kwh) ? day.gas_kwh : null,
    }))
}

export const barTotal = (bar: Bar) => (bar.electricity ?? 0) + (bar.gas ?? 0)

export const hasReadings = (bars: Bar[]) => bars.some((b) => b.electricity !== null || b.gas !== null)

/** A clean axis top at or above `value`: 1, 2, 2.5 or 5 times a power of ten. */
export function niceMax(value: number): number {
  if (!(value > 0)) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= value - 1e-9) ?? 10
  return step * power
}

/** The chart's accessible summary: totals of each series and the busiest bar. */
export function barsSummary(title: string, bars: Bar[]): string {
  if (!hasReadings(bars)) return `${title}: no readings yet.`
  const sum = (pick: (b: Bar) => number | null) => bars.reduce((t, b) => t + (pick(b) ?? 0), 0)
  const peak = bars.reduce((best, b) => (barTotal(b) > barTotal(best) ? b : best), bars[0])
  return `${title}: ${formatKwh(sum((b) => b.electricity))} electricity and ${formatKwh(sum((b) => b.gas))} gas. `
    + `Highest ${peak.label}, ${formatKwh(barTotal(peak))}.`
}
