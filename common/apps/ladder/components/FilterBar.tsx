'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLadder } from '../LadderProvider'
import { STATUS_SECTIONS, formatPayThreshold, type CurrencyPreference } from '../lib'
import type { JobDoc } from '../types'

const SPONSORSHIP_OPTIONS = ['yes', 'no', 'unknown'] as const

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

interface Option {
  value: string
  label: string
}

// A pill that opens a small panel. Closes on an outside click or Escape.
function Popover({ label, active, children }: { label: string; active: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="popover" ref={root}>
      <button
        type="button"
        className={`chip chip--sm${active ? ' is-active' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <span aria-hidden>▾</span>
      </button>
      {open && <div className="popover__panel">{children}</div>}
    </div>
  )
}

function OptionPopover({
  name,
  value,
  options,
  onChange,
}: {
  name: string
  value: string
  options: Option[]
  onChange: (value: string) => void
}) {
  const current = options.find((o) => o.value === value)
  return (
    <Popover label={value && current ? `${name}: ${current.label}` : name} active={Boolean(value)}>
      <div role="menu" aria-label={name}>
        {[{ value: '', label: 'Any' }, ...options].map((o) => (
          <button
            key={o.value || 'any'}
            type="button"
            role="menuitemradio"
            aria-checked={o.value === value}
            className="popover__item"
            onClick={() => onChange(o.value)}
          >
            {o.label}
            {o.value === value && <span aria-hidden>✓</span>}
          </button>
        ))}
      </div>
    </Popover>
  )
}

interface FilterBarProps {
  params: URLSearchParams
  /** `replace` edits the current history entry (typing in the search box). */
  setParam: (key: string, value: string, replace?: boolean) => void
  clearAll: () => void
}

// Search, filter pills with popovers, and the active filters as removable chips. State lives in the
// URL (FILTER_KEYS in lib.ts); the tag filter stays hidden, as in the markdown app.
export function FilterBar({ params, setParam, clearAll }: FilterBarProps) {
  const { config, currency, setCurrency } = useLadder()
  const q = params.get('q') ?? ''
  const [text, setText] = useState(q)
  const [filtersOpen, setFiltersOpen] = useState(false)
  useEffect(() => setText(q), [q])
  if (!config) return null

  const rating = params.get('rating') ?? ''
  const status = params.get('status') ?? ''
  const sponsorship = params.get('sponsorship') ?? ''
  const region = params.get('region') ?? ''
  const rawPayMin = params.get('payMin')
  const payMin = rawPayMin ?? (config.defaultPayMin != null ? String(config.defaultPayMin) : '')
  const payMax = params.get('payMax') ?? ''
  const payMinNumber = Number(payMin) || 0

  const ratingOptions = [
    { value: 'up', label: '▲ Up' },
    { value: 'down', label: '▼ Down' },
  ]
  const statusOptions = STATUS_SECTIONS.map((s) => ({ value: s.status as string, label: s.label }))
  const sponsorshipOptions = SPONSORSHIP_OPTIONS.map((s) => ({ value: s, label: cap(s) }))
  const labelOf = (options: Option[], value: string) => options.find((o) => o.value === value)?.label ?? value

  const payChip = (payMinNumber > 0 ? [`Pay ≥ ${formatPayThreshold(payMinNumber, currency)}`] : []).concat(
    payMax ? [`Pay ≤ ${formatPayThreshold(Number(payMax), currency)}`] : [],
  )
  const payActive = payChip.length > 0

  const chips: { key: string; label: string; remove: () => void }[] = [
    ...(q ? [{ key: 'q', label: `"${q}"`, remove: () => setParam('q', '') }] : []),
    ...(rating ? [{ key: 'rating', label: `Rating: ${labelOf(ratingOptions, rating)}`, remove: () => setParam('rating', '') }] : []),
    ...(status ? [{ key: 'status', label: `Status: ${labelOf(statusOptions, status)}`, remove: () => setParam('status', '') }] : []),
    ...(sponsorship
      ? [{ key: 'sponsorship', label: `Sponsorship: ${labelOf(sponsorshipOptions, sponsorship)}`, remove: () => setParam('sponsorship', '') }]
      : []),
    ...(region ? [{ key: 'region', label: `Region: ${labelOf(config.regions, region)}`, remove: () => setParam('region', '') }] : []),
    ...(payMinNumber > 0
      ? [{ key: 'payMin', label: payChip[0], remove: () => setParam('payMin', config.defaultPayMin != null ? '0' : '') }]
      : []),
    ...(payMax ? [{ key: 'payMax', label: payChip[payChip.length - 1], remove: () => setParam('payMax', '') }] : []),
  ]

  return (
    <div className="mb-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          className="field field--sm min-w-0 flex-1 sm:max-w-72"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setParam('q', e.target.value, true)
          }}
          placeholder="Search title or company"
          aria-label="Search jobs"
        />
        <button
          type="button"
          className={`chip chip--sm sm:hidden${chips.length > 0 ? ' is-active' : ''}`}
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((o) => !o)}
        >
          Filters
          {chips.length > 0 && <span className="chip__count">{chips.length}</span>}
        </button>
        <div className={`${filtersOpen ? 'flex' : 'hidden'} w-full flex-wrap items-center gap-2 sm:ml-auto sm:flex sm:w-auto`}>
          <OptionPopover name="Rating" value={rating} options={ratingOptions} onChange={(v) => setParam('rating', v)} />
          <OptionPopover name="Status" value={status} options={statusOptions} onChange={(v) => setParam('status', v)} />
          <OptionPopover
            name="Sponsorship"
            value={sponsorship}
            options={sponsorshipOptions}
            onChange={(v) => setParam('sponsorship', v)}
          />
          <OptionPopover name="Region" value={region} options={config.regions} onChange={(v) => setParam('region', v)} />
          <Popover label={payActive ? payChip.join(', ') : 'Pay'} active={payActive}>
            <div className="space-y-2 p-1.5">
              <label className="block text-xs font-bold text-muted">
                Minimum
                <input
                  type="number"
                  className="field field--sm mt-1"
                  value={payMin}
                  onChange={(e) => setParam('payMin', e.target.value, true)}
                  placeholder={config.payMinPlaceholder}
                  title={config.payMinTitle}
                />
              </label>
              <label className="block text-xs font-bold text-muted">
                Maximum
                <input
                  type="number"
                  className="field field--sm mt-1"
                  value={payMax}
                  onChange={(e) => setParam('payMax', e.target.value, true)}
                />
              </label>
              <label className="block text-xs font-bold text-muted">
                Show pay in
                <select
                  className="field field--sm mt-1"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyPreference)}
                >
                  <option value="native">As posted</option>
                  {config.currencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Popover>
          {chips.length > 0 && (
            <span className="hidden sm:inline-flex">
              <button type="button" className="btn btn--ghost btn--sm" onClick={clearAll}>
                Clear all
              </button>
            </span>
          )}
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 sm:hidden" aria-label="Active filters" role="group">
          {chips.map((chip) => (
            <span key={chip.key} className="chip chip--sm chip--removable is-active">
              {chip.label}
              <button type="button" className="chip__remove" aria-label={`Remove ${chip.label}`} onClick={chip.remove}>
                ×
              </button>
            </span>
          ))}
          <button type="button" className="btn btn--ghost btn--sm" onClick={clearAll}>
            Clear all
          </button>
        </div>
      )}
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
    <div className="tabs-line" role="toolbar" aria-label="Status">
      {tabs.map((tab) => (
        <button key={tab.value || 'all'} type="button" onClick={() => setStatus(tab.value)} aria-pressed={active === tab.value}>
          {tab.label}
          <span className="chip__count">{tab.count}</span>
        </button>
      ))}
    </div>
  )
}
