'use client'

import type { CSSProperties } from 'react'
import { EnergyChart } from '../EnergyChart'
import {
  compareWithYesterday,
  dailyBars,
  formatKwh,
  formatMoney,
  formatPower,
  hasReadings,
  hourlyBars,
  tariffLine,
  usageRows,
  type Energy,
  type UsageRow,
} from '../energy'
import { EnergyTabGlyph } from '../glyphs'
import { useHome } from '../HomeProvider'
import { ranAgo } from '../lib'
import { useNow } from '../useNow'

/** True once the meter has sent anything worth drawing. */
function hasAnyReading(energy: Energy | null): boolean {
  if (!energy) return false
  const { now, today } = energy
  return now?.electricity_w != null
    || today?.total_cost != null
    || today?.electricity_kwh != null
    || hasReadings(hourlyBars(energy.hourly_today))
    || hasReadings(dailyBars(energy.daily_7d))
}

function Waiting({ checking }: { checking: boolean }) {
  return (
    <section className="home-energy-card home-energy-waiting" aria-live="polite">
      <span className="home-energy-waiting__glyph" aria-hidden><EnergyTabGlyph size={28} /></span>
      <p className="home-energy-waiting__title">{checking ? 'Checking your meter' : 'Waiting for your Home Mini'}</p>
      <p>
        Live use and today&apos;s cost show here once the Octopus Home Mini sends its first reading.
      </p>
    </section>
  )
}

function SplitChip({ series, label, kwh, cost, currency }: {
  series: 'electricity' | 'gas'
  label: string
  kwh: number | null | undefined
  cost: number | null | undefined
  currency: string | null | undefined
}) {
  return (
    <li className="home-chip home-energy-split">
      <span className="home-legend__swatch" data-series={series} aria-hidden />
      <span className="home-chip__label">{label}</span>
      <span className="home-chip__value">{formatKwh(kwh)} · {formatMoney(cost, currency)}</span>
    </li>
  )
}

function Hero({ energy, live }: { energy: Energy; live: boolean }) {
  const { now, today, rates } = energy
  const currency = rates?.currency
  const watts = now?.electricity_w
  const comparison = compareWithYesterday(energy)
  return (
    <section className="home-energy-card home-energy-hero" aria-label="Now and today">
      <p className="home-energy-hero__label">
        Using now
        {live && watts != null && <span className="home-energy-live" title="Live" aria-label="Live" />}
      </p>
      <p className="home-energy-hero__now" aria-live="polite">{formatPower(watts)}</p>
      <div className="home-energy-hero__today">
        <p className="home-energy-hero__label">Today</p>
        <p className="home-energy-hero__cost">{formatMoney(today?.total_cost, currency)}</p>
      </div>
      <ul className="home-chips" aria-label="Today by fuel">
        <SplitChip series="electricity" label="Electricity" kwh={today?.electricity_kwh} cost={today?.electricity_cost} currency={currency} />
        <SplitChip series="gas" label="Gas" kwh={today?.gas_kwh} cost={today?.gas_cost} currency={currency} />
      </ul>
      {comparison && <p className="home-energy-hero__compare">{comparison}</p>}
    </section>
  )
}

function UsageItem({ row, currency }: { row: UsageRow; currency: string | null | undefined }) {
  const pct = row.share !== null ? Math.round(row.share * 100) : null
  const month = row.kwhMonth !== null || row.costMonth !== null
    ? `This month ${formatKwh(row.kwhMonth)} · ${formatMoney(row.costMonth, currency)}`
    : null
  return (
    <li className="home-usage">
      <div className="home-usage__row">
        <div className="home-usage__text">
          <p className="home-usage__name">
            {row.name}
            {row.estimated && <span className="home-badge">Estimate</span>}
          </p>
          {(row.room || month) && <p className="home-usage__meta">{[row.room, month].filter(Boolean).join(' · ')}</p>}
        </div>
        <div className="home-usage__figures">
          <p className="home-usage__kwh">{formatKwh(row.kwhToday)}</p>
          <p className="home-usage__cost">{formatMoney(row.costToday, currency)}</p>
        </div>
      </div>
      <div className="home-usage__share" aria-hidden>
        <span className="home-usage__fill" style={{ '--share': `${pct ?? 0}%` } as CSSProperties} />
      </div>
      <p className="sr-only">{pct !== null ? `${pct}% of today's electricity` : 'Share of today unknown'}</p>
      {row.note && <p className="home-usage__note">{row.note}</p>}
    </li>
  )
}

// The Energy tab: what the house draws now and has cost today (live over the event stream), today
// by hour and the last week by day, and which metered devices used it.
export function EnergyPage() {
  const { energy, energyStatus, stream } = useHome()
  const now = useNow()
  const subtitle = tariffLine(energy?.rates)
  const waiting = !hasAnyReading(energy)
  const rows = usageRows(energy)
  const updated = ranAgo(energy?.updated ?? null, now)

  return (
    <div className="home-page">
      <header className="site-container home-hero">
        <h1 className="home-hero__name">Energy</h1>
        {subtitle && <p className="home-hero__sub">{subtitle}</p>}
      </header>

      <div className="site-container home-energy">
        {waiting || !energy ? (
          <Waiting checking={energyStatus === 'loading'} />
        ) : (
          <>
            <Hero energy={energy} live={stream === 'live'} />
            <section className="home-energy-card" aria-label="Today by hour">
              <EnergyChart
                title="Today by hour"
                rowHeader="Hour"
                bars={hourlyBars(energy.hourly_today)}
                empty="No hourly readings yet today."
              />
            </section>
            <section className="home-energy-card" aria-label="Last 7 days">
              <EnergyChart
                title="Last 7 days"
                rowHeader="Day"
                bars={dailyBars(energy.daily_7d)}
                empty="Daily totals appear after the first full day."
              />
            </section>
            {rows.length > 0 && (
              <section aria-labelledby="home-energy-where">
                <h2 id="home-energy-where" className="home-group__title">Where it went today</h2>
                <ul className="home-inset">
                  {rows.map((row) => <UsageItem key={row.key} row={row} currency={energy.rates?.currency} />)}
                </ul>
              </section>
            )}
            {updated && <p className="home-energy__updated">Updated {updated}</p>}
          </>
        )}
      </div>
    </div>
  )
}
