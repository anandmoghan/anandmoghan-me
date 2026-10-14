'use client'

import { useId } from 'react'
import { useLadder } from '../LadderProvider'
import { STATUS_SECTIONS, type CurrencyPreference } from '../lib'
import type { JobDoc } from '../types'

const SPONSORSHIP_OPTIONS = ['yes', 'no', 'unknown'] as const

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="field-label text-xs">
        {label}
      </label>
      <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

interface FilterBarProps {
  params: URLSearchParams
  setParam: (key: string, value: string) => void
  clearAll: () => void
}

// Rating, status, sponsorship, region, currency and pay filters (the tag filter stays hidden,
// as in the markdown app).
export function FilterBar({ params, setParam, clearAll }: FilterBarProps) {
  const { config, currency, setCurrency } = useLadder()
  const payId = useId()
  if (!config) return null

  const rawPayMin = params.get('payMin')
  const payMin = rawPayMin ?? (config.defaultPayMin != null ? String(config.defaultPayMin) : '')
  const any = { value: '', label: 'Any' }
  const active = ['rating', 'status', 'sponsorship', 'region', 'payMin', 'payMax', 'tags'].some((k) => params.get(k))

  return (
    // .card sets display: block, so the grid sits on an inner element.
    <div className="card mb-4">
      <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <Select
          label="Rating"
          value={params.get('rating') ?? ''}
          onChange={(v) => setParam('rating', v)}
          options={[any, { value: 'up', label: '▲ Up' }, { value: 'down', label: '▼ Down' }]}
        />
        <Select
          label="Status"
          value={params.get('status') ?? ''}
          onChange={(v) => setParam('status', v)}
          options={[any, ...STATUS_SECTIONS.map((s) => ({ value: s.status, label: s.label }))]}
        />
        <Select
          label="Sponsorship"
          value={params.get('sponsorship') ?? ''}
          onChange={(v) => setParam('sponsorship', v)}
          options={[any, ...SPONSORSHIP_OPTIONS.map((s) => ({ value: s, label: cap(s) }))]}
        />
        <Select label="Region" value={params.get('region') ?? ''} onChange={(v) => setParam('region', v)} options={[any, ...config.regions]} />
        <Select
          label="Currency"
          value={currency}
          onChange={(v) => setCurrency(v as CurrencyPreference)}
          options={[{ value: 'native', label: 'As posted' }, ...config.currencies.map((c) => ({ value: c, label: c }))]}
        />
        <div>
          <label htmlFor={payId} className="field-label text-xs">
            Pay min
          </label>
          <input
            id={payId}
            type="number"
            className="field"
            value={payMin}
            onChange={(e) => setParam('payMin', e.target.value)}
            placeholder={config.payMinPlaceholder}
            title={config.payMinTitle}
          />
        </div>
        {active && (
          <button type="button" onClick={clearAll} className="btn btn--outline btn--sm">
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}

/** `jobs` should match every filter except status, so the counts stay per status bucket. */
export function StatusTabs({ jobs, active, setStatus }: { jobs: JobDoc[]; active: string; setStatus: (s: string) => void }) {
  const tabs = [
    { value: '', label: 'All', count: jobs.length },
    ...STATUS_SECTIONS.map(({ status, label }) => ({
      value: status as string,
      label,
      count: jobs.filter((job) => job.status === status).length,
    })),
  ]
  return (
    <div className="mb-3 flex flex-wrap gap-2" role="toolbar" aria-label="Status">
      {tabs.map((tab) => (
        <button
          key={tab.value || 'all'}
          type="button"
          onClick={() => setStatus(tab.value)}
          aria-pressed={active === tab.value}
          className="chip"
        >
          {tab.label}
          <span className="chip__count">{tab.count}</span>
        </button>
      ))}
    </div>
  )
}
