'use client'

import { useRef, useState } from 'react'
import { AutomationGlyph, HeaterGlyph, HomeTabGlyph } from '../glyphs'
import { useHome } from '../HomeProvider'
import { ranAgo, type Automation } from '../lib'
import { useLongPress } from '../useLongPress'
import { useNow } from '../useNow'
import { automationGroups } from '../view'

const SWIPE_PX = 36

function GroupGlyph({ group }: { group: string }) {
  if (group === 'heater' || group === 'heating') return <HeaterGlyph size={18} />
  if (group === 'modes') return <HomeTabGlyph size={18} />
  return <AutomationGlyph size={18} />
}

// A row: name, when it last ran, and an iOS switch. Run now is the row's secondary action,
// revealed like a swipe action by swiping left, a long press, a right click, or the keyboard-only
// "More" button.
function AutomationItem({ automation, groupId, now, open, onOpen, onRun, running }: {
  automation: Automation
  groupId: string
  now: number
  open: boolean
  onOpen: (open: boolean) => void
  onRun: () => void
  running: boolean
}) {
  const { act } = useHome()
  const ago = ranAgo(automation.last_triggered, now)
  const start = useRef<number | null>(null)
  const { handlers, consumed } = useLongPress(() => onOpen(!open))

  return (
    <li
      className="home-automation"
      data-enabled={automation.enabled || undefined}
      data-open={open || undefined}
      onPointerDown={(e) => { start.current = e.clientX }}
      onPointerMove={(e) => {
        if (start.current === null) return
        const dx = e.clientX - start.current
        if (dx < -SWIPE_PX) { start.current = null; onOpen(true) }
        else if (dx > SWIPE_PX) { start.current = null; onOpen(false) }
      }}
      onPointerUp={() => { start.current = null }}
      onPointerCancel={() => { start.current = null }}
    >
      <div className="home-automation__row" {...handlers} onClickCapture={(e) => { if (consumed()) e.stopPropagation() }}>
        <span className="home-automation__glyph" data-group={groupId} aria-hidden><GroupGlyph group={groupId} /></span>
        <div className="home-automation__text">
          <p className="home-automation__name">{automation.title}</p>
          <p className="home-automation__meta">
            {running ? 'Running now' : ago ? `Last ran ${ago}` : 'Never run'}
          </p>
        </div>
        <button
          type="button"
          className="home-automation__more"
          aria-label={`More actions, ${automation.name}`}
          aria-expanded={open}
          onClick={() => onOpen(!open)}
        >
          More
        </button>
        <button
          type="button"
          role="switch"
          className="home-switch"
          aria-checked={automation.enabled}
          aria-label={automation.name}
          onClick={() => act(automation.entity_id, { action: automation.enabled ? 'disable' : 'enable' })}
        />
      </div>
      <button
        type="button"
        className="home-automation__run"
        aria-label={`Run now, ${automation.name}`}
        tabIndex={open ? 0 : -1}
        onClick={onRun}
      >
        Run now
      </button>
    </li>
  )
}

// Every Home Assistant automation in grouped inset lists, under the group the server gives it.
export function AutomationsPage() {
  const { state, act } = useHome()
  const now = useNow()
  const [running, setRunning] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  if (!state) return null

  const groups = automationGroups(state.automations)
  const enabled = state.automations.filter((a) => a.enabled).length

  return (
    <div className="home-page">
      <header className="site-container home-hero">
        <h1 className="home-hero__name">Automation</h1>
        <p className="home-hero__sub">{enabled} of {state.automations.length} on</p>
      </header>

      {groups.length === 0 ? (
        <p className="site-container home-empty">
          No automations yet. Automations you create in Home Assistant show up here.
        </p>
      ) : (
        <div className="site-container home-groups">
          {groups.map((group) => (
            <section key={group.id} aria-labelledby={`home-group-${group.id}`}>
              <h2 id={`home-group-${group.id}`} className="home-group__title">{group.title}</h2>
              <ul className="home-inset">
                {group.automations.map((automation) => (
                  <AutomationItem
                    key={automation.entity_id}
                    automation={automation}
                    groupId={group.id}
                    now={now}
                    open={open === automation.entity_id}
                    onOpen={(next) => setOpen(next ? automation.entity_id : null)}
                    running={running === automation.entity_id}
                    onRun={() => {
                      const id = automation.entity_id
                      setRunning(id)
                      setOpen(null)
                      act(id, { action: 'trigger' }).finally(() => setRunning((r) => (r === id ? null : r)))
                    }}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
