'use client'

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { barsSummary, barTotal, formatKwh, hasReadings, niceMax, type Bar } from './energy'

// A stacked column chart drawn as inline SVG at the plot's measured width (so text never scales):
// electricity at the baseline, gas above it with a 2px surface gap, 4px rounded tops, a recessive
// grid at the top and middle of a clean scale. A pointer or the arrow keys pick a column for the
// tooltip; the visually hidden table holds every value.

const PLOT_H = 132
const TOP = 8
const TICKS_H = 20
const AXIS_W = 56
const GAP = 2
const RADIUS = 4
const MAX_BAR = 24

/** A column segment with a rounded top (or square when it is not the top of its stack). */
function segment(x: number, y: number, w: number, h: number, rounded: boolean): string {
  const r = rounded ? Math.min(RADIUS, w / 2, h) : 0
  if (r <= 0) return `M${x},${y}h${w}v${h}h${-w}Z`
  return `M${x},${y + h}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h}Z`
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

const axisLabel = (kwh: number) => `${Number.isInteger(kwh) ? kwh : kwh.toFixed(1)} kWh`

export function Legend() {
  return (
    <ul className="home-legend" aria-label="Legend">
      <li><span className="home-legend__swatch" data-series="electricity" aria-hidden />Electricity</li>
      <li><span className="home-legend__swatch" data-series="gas" aria-hidden />Gas</li>
    </ul>
  )
}

/** `rowHeader` names the table's first column ("Hour", "Day"); `empty` shows before any reading. */
export function EnergyChart({ title, bars, rowHeader, empty }: { title: string; bars: Bar[]; rowHeader: string; empty: string }) {
  const [plot, width] = useWidth()
  const [active, setActive] = useState<number | null>(null)
  const readings = hasReadings(bars)
  const max = niceMax(Math.max(0, ...bars.map(barTotal)))
  const plotW = Math.max(0, width - AXIS_W)
  const slot = bars.length ? plotW / bars.length : 0
  const barW = Math.min(MAX_BAR, Math.max(3, slot * 0.62))
  const scale = (kwh: number) => (kwh / max) * PLOT_H
  const base = TOP + PLOT_H
  const picked = active !== null ? bars[active] : null

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const step = e.key === 'ArrowRight' ? 1 : -1
    setActive((i) => Math.min(bars.length - 1, Math.max(0, (i ?? (step > 0 ? -1 : bars.length)) + step)))
  }

  return (
    <figure className="home-chart">
      <figcaption className="home-chart__head">
        <span className="home-chart__title">{title}</span>
        <Legend />
      </figcaption>
      {readings ? (
        <div
          ref={plot}
          className="home-chart__plot"
          tabIndex={0}
          aria-label={`${title} chart. Use the arrow keys to read each column.`}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') setActive(null)
          }}
        >
          {width > 0 && (
            <svg
              role="img"
              aria-label={barsSummary(title, bars)}
              width={width}
              height={base + TICKS_H}
              viewBox={`0 0 ${width} ${base + TICKS_H}`}
            >
              {[max, max / 2, 0].map((v) => (
                <g key={v} className="home-chart__grid" data-baseline={v === 0 || undefined}>
                  <line x1={0} x2={plotW} y1={base - scale(v)} y2={base - scale(v)} />
                  {v > 0 && (
                    <text x={plotW + 6} y={base - scale(v)} dominantBaseline="middle">{axisLabel(v)}</text>
                  )}
                </g>
              ))}
              {bars.map((bar, i) => {
                const x = i * slot + (slot - barW) / 2
                const e = scale(bar.electricity ?? 0)
                const g = scale(bar.gas ?? 0)
                const gGap = e > 0 && g > 0 ? GAP : 0
                return (
                  <g key={bar.key} className="home-chart__col" data-dim={(active !== null && active !== i) || undefined}>
                    {e > 0 && <path data-series="electricity" d={segment(x, base - e, barW, e, g <= 0)} />}
                    {g > 0 && <path data-series="gas" d={segment(x, base - e - gGap - g, barW, g, true)} />}
                    {bar.tick && (
                      <text className="home-chart__tick" x={x + barW / 2} y={base + 14} textAnchor="middle">{bar.tick}</text>
                    )}
                    <rect
                      className="home-chart__hit"
                      x={i * slot}
                      y={0}
                      width={slot}
                      height={base}
                      onPointerEnter={() => setActive(i)}
                      onPointerDown={() => setActive(i)}
                    />
                  </g>
                )
              })}
            </svg>
          )}
          {picked && active !== null && (
            <div
              className="home-chart__tip"
              role="status"
              style={{ '--x': `${Math.min(Math.max(active * slot + slot / 2, 70), Math.max(70, plotW - 70))}px` } as CSSProperties}
            >
              <span className="home-chart__tip-title">{picked.label}</span>
              <span><span className="home-legend__swatch" data-series="electricity" aria-hidden />Electricity {formatKwh(picked.electricity)}</span>
              <span><span className="home-legend__swatch" data-series="gas" aria-hidden />Gas {formatKwh(picked.gas)}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="home-chart__empty">{empty}</p>
      )}
      <table className="sr-only">
        <caption>{title}, kWh</caption>
        <thead>
          <tr>
            <th scope="col">{rowHeader}</th>
            <th scope="col">Electricity</th>
            <th scope="col">Gas</th>
          </tr>
        </thead>
        <tbody>
          {bars.map((bar) => (
            <tr key={bar.key}>
              <th scope="row">{bar.label}</th>
              <td>{formatKwh(bar.electricity)}</td>
              <td>{formatKwh(bar.gas)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
