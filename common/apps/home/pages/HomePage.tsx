'use client'

import { useEffect, useState } from 'react'
import { DeviceTile } from '../DeviceTile'
import { AwayGlyph, ChevronGlyph, LightGlyph, MoonGlyph, SceneGlyph, SunGlyph, ToggleGlyph } from '../glyphs'
import { useHome } from '../HomeProvider'
import { LightSheet } from '../LightSheet'
import { isOn, roomLights, type Device, type Room } from '../lib'
import { statusChips } from '../view'

const ACTIVATED_MS = 2000

function ModeGlyph({ name }: { name: string }) {
  if (/sleep/i.test(name)) return <MoonGlyph size={18} />
  if (/awake/i.test(name)) return <SunGlyph size={18} />
  if (/away/i.test(name)) return <AwayGlyph size={18} />
  return <ToggleGlyph size={18} />
}

// The strip under the title: house modes (switches) and scenes (one-shot), as frosted pills.
function Strip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section aria-label={label} className="home-strip-section">
      <ul className="home-strip scroll-bare">{children}</ul>
    </section>
  )
}

function Modes({ modes }: { modes: Device[] }) {
  const { act } = useHome()
  if (modes.length === 0) return null
  return (
    <Strip label="Modes">
      {modes.map((mode) => {
        const on = isOn(mode)
        return (
          <li key={mode.entity_id}>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              className="home-scene"
              data-activated={on || undefined}
              disabled={!mode.controllable}
              onClick={() => act(mode.entity_id, { action: 'toggle' })}
            >
              <span className="home-scene__glyph" aria-hidden><ModeGlyph name={mode.name} /></span>
              <span>{mode.name}</span>
            </button>
          </li>
        )
      })}
    </Strip>
  )
}

function Scenes() {
  const { state, act } = useHome()
  const [activated, setActivated] = useState<string | null>(null)

  useEffect(() => {
    if (!activated) return
    const timer = setTimeout(() => setActivated(null), ACTIVATED_MS)
    return () => clearTimeout(timer)
  }, [activated])

  if (!state?.scenes.length) return null
  return (
    <>
      <Strip label="Scenes">
        {state.scenes.map((scene) => (
          <li key={scene.entity_id}>
            <button
              type="button"
              className="home-scene"
              data-activated={activated === scene.entity_id || undefined}
              onClick={() => {
                setActivated(scene.entity_id)
                act(scene.entity_id, { action: 'activate' })
              }}
            >
              <span className="home-scene__glyph" aria-hidden><SceneGlyph size={18} /></span>
              <span>{scene.name}</span>
            </button>
          </li>
        ))}
      </Strip>
      <p className="sr-only" aria-live="polite">
        {activated ? `${state.scenes.find((s) => s.entity_id === activated)?.name ?? 'Scene'} activated` : ''}
      </p>
    </>
  )
}

function RoomSection({ room, onAdjust }: { room: Room; onAdjust: (entityId: string) => void }) {
  const { act } = useHome()
  const { id, name, all_lights: allLights } = room
  const headingId = `home-room-${id}`
  // The header toggle reads like Apple's: lit when any light in the room is on.
  const lightsOn = roomLights(room).some(isOn)
  return (
    <section aria-labelledby={headingId} className="site-container home-room">
      <div className="home-room__head">
        <h2 id={headingId} className="home-room__title">
          <span>{name}</span>
          <ChevronGlyph size={16} />
        </h2>
        {allLights && (
          <button
            type="button"
            role="switch"
            aria-checked={lightsOn}
            aria-label={`All lights, ${name}`}
            className="home-roomtoggle"
            onClick={() => act(allLights, { action: lightsOn ? 'turn_off' : 'turn_on' })}
          >
            <LightGlyph size={18} />
          </button>
        )}
      </div>
      <ul className="home-grid">
        {room.tiles.map((tile) => (
          <li key={tile.entity_id}>
            <DeviceTile tile={tile} onAdjust={onAdjust} />
          </li>
        ))}
      </ul>
    </section>
  )
}

// The Home tab: the home's name and a status row, modes and scenes, then one section per room.
export function HomePage() {
  const { state, stream } = useHome()
  const [sheet, setSheet] = useState<string | null>(null)
  if (!state) return null

  const chips = statusChips(state)
  const empty = state.rooms.length === 0 && state.other.length === 0

  return (
    <div className="home-page">
      <header className="site-container home-hero">
        <h1 className="home-hero__name">{state.home.name}</h1>
        <ul className="home-chips" aria-label="Status">
          {chips.map((chip) => (
            <li key={chip.key} className="home-chip">
              <span className="home-chip__label">{chip.label}</span>
              <span className="home-chip__value">{chip.value}</span>
            </li>
          ))}
          {stream !== 'live' && (
            <li className="home-chip home-chip--stream">
              {stream === 'connecting' ? 'Connecting for live updates' : 'Reconnecting'}
            </li>
          )}
        </ul>
      </header>

      <Modes modes={state.modes} />
      <Scenes />

      {empty ? (
        <p className="site-container home-empty">
          No devices yet. Lights and switches you add in Home Assistant show up here, grouped by area.
        </p>
      ) : (
        <>
          {state.rooms.map((room) => (
            <RoomSection key={room.id} room={room} onAdjust={setSheet} />
          ))}
          {state.other.length > 0 && (
            <RoomSection room={{ id: 'other', name: 'Other', all_lights: null, tiles: state.other }} onAdjust={setSheet} />
          )}
        </>
      )}

      <LightSheet entityId={sheet} onClose={() => setSheet(null)} />
    </div>
  )
}
