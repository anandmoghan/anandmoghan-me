'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { LightGlyph } from './glyphs'
import { useHome } from './HomeProvider'
import { findDevice, hasColourTemp, isOn, kelvinToRgb, lampColour, stateLabel, type Device } from './lib'

// Sliders send after the hand settles: one action per adjustment, well inside the API's
// per-user rate limit.
const SEND_AFTER_MS = 300

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

function Controls({ device }: { device: Device }) {
  const { act } = useHome()
  const on = isOn(device)
  const { brightness_pct, color_temp_kelvin, min_kelvin = 2000, max_kelvin = 6500 } = device.attributes
  const [brightness, setBrightness] = useSettledValue(on ? Math.round(brightness_pct ?? 100) : 0, (value) =>
    act(device.entity_id, value === 0 ? { action: 'turn_off' } : { action: 'brightness', value }),
  )
  const [kelvin, setKelvin] = useSettledValue(color_temp_kelvin ?? Math.round((min_kelvin + max_kelvin) / 2), (value) =>
    act(device.entity_id, { action: 'color_temp', value }),
  )
  const lit = on && brightness > 0

  return (
    <>
      <div
        className="home-sheet__hero"
        data-lit={lit || undefined}
        style={{ '--lamp': lampColour(device), '--level': brightness / 100 } as CSSProperties}
      >
        <span className="home-sheet__bulb" aria-hidden>
          <LightGlyph size={30} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="home-sheet-title" className="home-sheet__title">{device.name}</h2>
          <p className="home-sheet__state" aria-live="polite">{stateLabel(device)}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={`${device.name} power`}
          className="switch"
          onClick={() => act(device.entity_id, { action: on ? 'turn_off' : 'turn_on' })}
        />
      </div>

      {/* An off light reports no brightness; dragging its slider turns it on. */}
      {brightness_pct !== undefined || !on ? (
        <label className="home-sheet__control">
          <span className="home-sheet__label">
            <span>Brightness</span>
            <span className="tabular-nums text-muted">{brightness}%</span>
          </span>
          <input
            type="range"
            className="home-range home-range--brightness"
            min={0}
            max={100}
            step={1}
            value={brightness}
            aria-valuetext={brightness === 0 ? 'Off' : `${brightness}%`}
            style={{ '--pct': `${brightness}%` } as CSSProperties}
            onChange={(e) => setBrightness(Number(e.target.value))}
          />
        </label>
      ) : null}

      {hasColourTemp(device) && (
        <label className="home-sheet__control">
          <span className="home-sheet__label">
            <span>Colour temperature</span>
            <span className="tabular-nums text-muted">{kelvin} K</span>
          </span>
          <input
            type="range"
            className="home-range home-range--kelvin"
            min={min_kelvin}
            max={max_kelvin}
            step={50}
            value={kelvin}
            aria-valuetext={`${kelvin} kelvin, ${kelvin < (min_kelvin + max_kelvin) / 2 ? 'warm' : 'cool'}`}
            style={{ '--warm': rgb(min_kelvin), '--mid': rgb((min_kelvin + max_kelvin) / 2), '--cool': rgb(max_kelvin) } as CSSProperties}
            onChange={(e) => setKelvin(Number(e.target.value))}
          />
          <span className="home-sheet__ends" aria-hidden>
            <span>Warm</span>
            <span>Cool</span>
          </span>
        </label>
      )}
    </>
  )
}

// The light's detail sheet: a modal <dialog> (focus trap, Escape and the backdrop close it),
// a bottom sheet on phones and a centred panel on wider screens. It reads the device live, so
// changes from the stream show while it is open.
export function LightSheet({ entityId, onClose }: { entityId: string | null; onClose: () => void }) {
  const { state } = useHome()
  const dialog = useRef<HTMLDialogElement>(null)
  const device = entityId && state ? findDevice(state, entityId) : undefined

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (device && !el.open) el.showModal()
    if (!device && el.open) el.close()
  }, [device])

  return (
    <dialog
      ref={dialog}
      className="home-sheet"
      aria-labelledby="home-sheet-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close()
      }}
    >
      {device && (
        <div className="home-sheet__body">
          <Controls key={device.entity_id} device={device} />
          <form method="dialog" className="mt-2 flex justify-end">
            <button type="submit" className="btn btn--primary">Done</button>
          </form>
        </div>
      )}
    </dialog>
  )
}
