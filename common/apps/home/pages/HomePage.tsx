'use client'

import { useEffect, useState } from 'react'
import { DeviceTile } from '../DeviceTile'
import { SceneGlyph } from '../glyphs'
import { useHome } from '../HomeProvider'
import { LightSheet } from '../LightSheet'
import { statusLine, type Device } from '../lib'

const ACTIVATED_MS = 2000

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
    <section aria-labelledby="home-scenes" className="mt-6">
      <h2 id="home-scenes" className="home-section-title site-container">Scenes</h2>
      <ul className="home-scenes scroll-bare">
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
              <span className="home-scene__glyph" aria-hidden><SceneGlyph size={20} /></span>
              <span>{scene.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="sr-only" aria-live="polite">
        {activated ? `${state.scenes.find((s) => s.entity_id === activated)?.name ?? 'Scene'} activated` : ''}
      </p>
    </section>
  )
}

function DeviceSection({ id, name, devices, onAdjust }: {
  id: string
  name: string
  devices: Device[]
  onAdjust: (entityId: string) => void
}) {
  if (devices.length === 0) return null
  const headingId = `home-room-${id}`
  return (
    <section aria-labelledby={headingId} className="site-container mt-7">
      <h2 id={headingId} className="home-section-title">{name}</h2>
      <ul className="home-grid">
        {devices.map((device) => (
          <li key={device.entity_id}>
            <DeviceTile device={device} onAdjust={onAdjust} />
          </li>
        ))}
      </ul>
    </section>
  )
}

// The Home tab: the home's name and a one-line status, scenes, then one section per room.
export function HomePage() {
  const { state, stream } = useHome()
  const [sheet, setSheet] = useState<string | null>(null)
  if (!state) return null

  const empty = state.rooms.every((r) => r.devices.length === 0) && state.unassigned.length === 0

  return (
    <div className="pb-10">
      <header className="site-container home-hero">
        <h1 className="home-hero__name">{state.home.name}</h1>
        <p className="home-hero__status">
          <span>{statusLine(state)}</span>
          {stream !== 'live' && (
            <span className="home-hero__stream">
              {stream === 'connecting' ? 'Connecting for live updates' : 'Reconnecting'}
            </span>
          )}
        </p>
      </header>

      <Scenes />

      {empty ? (
        <p className="site-container mt-10 text-sm text-muted">
          No devices yet. Lights and switches you add in Home Assistant show up here, grouped by area.
        </p>
      ) : (
        <>
          {state.rooms.map((room) => (
            <DeviceSection key={room.id} id={room.id} name={room.name} devices={room.devices} onAdjust={setSheet} />
          ))}
          <DeviceSection id="unassigned" name="Unassigned" devices={state.unassigned} onAdjust={setSheet} />
        </>
      )}

      <LightSheet entityId={sheet} onClose={() => setSheet(null)} />
    </div>
  )
}
