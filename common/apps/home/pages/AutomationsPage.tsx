'use client'

import { useEffect, useState } from 'react'
import { AutomationGlyph } from '../glyphs'
import { useHome } from '../HomeProvider'
import { ranAgo } from '../lib'

const TICK_MS = 30_000

/** The current time, refreshed often enough for "5 minutes ago". */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(timer)
  }, [])
  return now
}

// Every Home Assistant automation: when it last ran, a switch to enable or disable it, and Run now.
export function AutomationsPage() {
  const { state, act } = useHome()
  const now = useNow()
  const [ran, setRan] = useState<string | null>(null)
  if (!state) return null

  const automations = [...state.automations].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="site-container pb-10">
      <header className="home-hero">
        <h1 className="home-hero__name">Automations</h1>
        <p className="home-hero__status">
          {automations.filter((a) => a.enabled).length} of {automations.length} enabled
        </p>
      </header>

      {automations.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No automations yet. Automations you create in Home Assistant show up here.</p>
      ) : (
        <ul className="home-automations card card--flush mt-6">
          {automations.map((automation) => {
            const ago = ranAgo(automation.last_triggered, now)
            const nameId = `home-auto-${automation.entity_id}`
            return (
              <li key={automation.entity_id} className="home-automation" data-enabled={automation.enabled || undefined}>
                <span className="home-automation__glyph" aria-hidden><AutomationGlyph size={20} /></span>
                <div className="home-automation__text">
                  <p id={nameId} className="home-automation__name">{automation.name}</p>
                  <p className="home-automation__meta">
                    {ran === automation.entity_id ? 'Running now' : ago ? `Last ran ${ago}` : 'Never run'}
                  </p>
                </div>
                <button
                  type="button"
                  className="home-automation__run btn btn--sm btn--soft"
                  aria-describedby={nameId}
                  onClick={() => {
                    setRan(automation.entity_id)
                    act(automation.entity_id, { action: 'trigger' }).finally(() =>
                      setRan((id) => (id === automation.entity_id ? null : id)),
                    )
                  }}
                >
                  Run now
                </button>
                <button
                  type="button"
                  role="switch"
                  className="switch"
                  aria-checked={automation.enabled}
                  aria-labelledby={nameId}
                  onClick={() => act(automation.entity_id, { action: automation.enabled ? 'disable' : 'enable' })}
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
