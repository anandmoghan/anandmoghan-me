'use client'

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { CloseGlyph, LightGlyph, SwitchGlyph } from './glyphs'
import { useHome } from './HomeProvider'
import { findTile, hasColourTemp, isOn, kelvinToRgb, stateLabel, type Device } from './lib'

// Sliders send after the hand settles: one action per adjustment, well inside the API's
// per-user rate limit.
const SEND_AFTER_MS = 300
const DISMISS_DRAG_PX = 110
const SWATCHES = 5

/** A local slider value that follows the device until the user moves it, then sends it once settled. */
function useSettledValue(remote: number, send: (value: number) => void) {
  const [local, setLocal] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])
  const change = (value: number) => {
    setLocal(value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      send(value)
      setLocal(null)
    }, SEND_AFTER_MS)
  }
  return [local ?? remote, change] as const
}

function rgb(kelvin: number) {
  return `rgb(${kelvinToRgb(kelvin).join(' ')})`
}

/** Apple's tall brightness pill: drag anywhere on it, or use the hidden range input with the keyboard. */
function BrightnessPill({ value, label, onChange }: { value: number; label: string; onChange: (value: number) => void }) {
  const track = useRef<HTMLDivElement>(null)
  const set = (e: PointerEvent) => {
    const box = track.current?.getBoundingClientRect()
    if (!box) return
    onChange(Math.round(Math.min(1, Math.max(0, 1 - (e.clientY - box.top) / box.height)) * 100))
  }
  return (
    <div
      ref={track}
      className="home-pill"
      style={{ '--pct': `${value}%` } as CSSProperties}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        set(e)
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) set(e)
      }}
    >
      <span className="home-pill__fill" aria-hidden />
      <span className="home-pill__glyph" aria-hidden>
        <LightGlyph size={26} />
      </span>
      <span className="home-pill__value" aria-hidden>{value}%</span>
      <input
        type="range"
        className="home-pill__input"
        aria-label={label}
        min={0}
        max={100}
        step={1}
        value={value}
        aria-valuetext={value === 0 ? 'Off' : `${value}%`}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

function Members({ members }: { members: Device[] }) {
  const { act } = useHome()
  return (
    <section className="home-sheet__members" aria-label="Lights in this group">
      <ul className="home-list">
        {members.map((member) => {
          const on = isOn(member)
          return (
            <li key={member.entity_id} className="home-list__row">
              <span className="home-list__name">{member.name}</span>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={member.name}
                className="home-switch"
                onClick={() => act(member.entity_id, { action: 'toggle' })}
              />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Controls({ device, members, title }: { device: Device; members: Device[]; title: string }) {
  const { act } = useHome()
  const on = isOn(device)
  const { brightness_pct, color_temp_kelvin, min_kelvin = 2000, max_kelvin = 6500 } = device.attributes
  const [brightness, setBrightness] = useSettledValue(on ? Math.round(brightness_pct ?? 100) : 0, (value) =>
    act(device.entity_id, value === 0 ? { action: 'turn_off' } : { action: 'brightness', value }),
  )
  const [kelvin, setKelvin] = useSettledValue(color_temp_kelvin ?? Math.round((min_kelvin + max_kelvin) / 2), (value) =>
    act(device.entity_id, { action: 'color_temp', value }),
  )
  const swatches = Array.from({ length: SWATCHES }, (_, i) =>
    Math.round((min_kelvin + ((max_kelvin - min_kelvin) * i) / (SWATCHES - 1)) / 50) * 50,
  )
  const nearest = swatches.reduce((best, k) => (Math.abs(k - kelvin) < Math.abs(best - kelvin) ? k : best), swatches[0])

  return (
    <>
      <header className="home-sheet__head">
        <div className="min-w-0 flex-1">
          <h2 id="home-sheet-title" className="home-sheet__title">{title}</h2>
          <p className="home-sheet__state" aria-live="polite">{stateLabel(device)}</p>
        </div>
        <form method="dialog">
          <button type="submit" className="home-round" aria-label="Close">
            <CloseGlyph size={18} />
          </button>
        </form>
      </header>

      <div className="home-sheet__controls">
        {/* An off light reports no brightness; dragging the pill turns it on. */}
        {brightness_pct !== undefined || !on ? (
          <BrightnessPill value={brightness} label={`Brightness, ${title}`} onChange={setBrightness} />
        ) : null}
        <div className="home-sheet__side">
          {hasColourTemp(device) && (
            <div role="group" aria-label="Colour temperature" className="home-swatches">
              {swatches.map((k) => (
                <button
                  key={k}
                  type="button"
                  className="home-swatch"
                  aria-pressed={k === nearest}
                  aria-label={`${k} kelvin, ${k < (min_kelvin + max_kelvin) / 2 ? 'warm' : k > (min_kelvin + max_kelvin) / 2 ? 'cool' : 'neutral'}`}
                  style={{ '--swatch': rgb(k) } as CSSProperties}
                  onClick={() => setKelvin(k)}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={`${title} power`}
            className="home-power"
            onClick={() => act(device.entity_id, { action: on ? 'turn_off' : 'turn_on' })}
          >
            <SwitchGlyph size={26} />
          </button>
        </div>
      </div>

      {members.length > 0 && <Members members={members} />}
    </>
  )
}

// The light's detail sheet: a modal <dialog> (focus trap, Escape, the backdrop and a downward
// swipe on the grabber close it), a bottom sheet on phones and a centred card on wider screens.
// It reads the device live, so changes from the stream show while it is open.
export function LightSheet({ entityId, onClose }: { entityId: string | null; onClose: () => void }) {
  const { state } = useHome()
  const dialog = useRef<HTMLDialogElement>(null)
  const drag = useRef<{ id: number; y: number } | null>(null)
  const tile = entityId && state ? findTile(state, entityId) : undefined

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (tile && !el.open) el.showModal()
    if (!tile && el.open) el.close()
  }, [tile])

  return (
    <dialog
      ref={dialog}
      className="home-sheet"
      aria-labelledby="home-sheet-title"
      // The close event is queued; a sheet reopened before it fires stays open.
      onClose={(e) => {
        if (!e.currentTarget.open) onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close()
      }}
    >
      {tile && (
        <div className="home-sheet__body">
          <div
            className="home-sheet__grab"
            aria-hidden
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              drag.current = { id: e.pointerId, y: e.clientY }
            }}
            onPointerMove={(e) => {
              if (!drag.current) return
              dialog.current?.style.setProperty('--drag', `${Math.max(0, e.clientY - drag.current.y)}px`)
            }}
            onPointerUp={(e) => {
              if (!drag.current) return
              const moved = e.clientY - drag.current.y
              drag.current = null
              dialog.current?.style.removeProperty('--drag')
              if (moved > DISMISS_DRAG_PX) dialog.current?.close()
            }}
            onPointerCancel={() => {
              drag.current = null
              dialog.current?.style.removeProperty('--drag')
            }}
          />
          <Controls key={tile.entity_id} device={tile} members={tile.members ?? []} title={tile.short_name} />
        </div>
      )}
    </dialog>
  )
}
