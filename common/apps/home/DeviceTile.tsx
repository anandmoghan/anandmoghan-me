'use client'

import { useRef, type CSSProperties } from 'react'
import { AdjustGlyph, DeviceGlyph } from './glyphs'
import { useHome } from './HomeProvider'
import { formatTemp, hasLightControls, isOn, isUnavailable, lampColour, stateLabel, type Device } from './lib'

const LONG_PRESS_MS = 450

/** Pointer handlers that call `onLongPress` after a held press and swallow the click that follows. */
function useLongPress(onLongPress: (() => void) | undefined) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fired = useRef(false)
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }
  if (!onLongPress) return { handlers: {}, consumed: () => false }
  return {
    handlers: {
      onPointerDown: () => {
        fired.current = false
        cancel()
        timer.current = setTimeout(() => {
          fired.current = true
          onLongPress()
        }, LONG_PRESS_MS)
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault()
        cancel()
        fired.current = true
        onLongPress()
      },
    },
    consumed: () => {
      const was = fired.current
      fired.current = false
      return was
    },
  }
}

function ClimateTile({ device }: { device: Device }) {
  const current = device.attributes.current_temperature
  const label = stateLabel(device)
  return (
    <div
      className="home-tile home-tile--climate"
      data-active={device.attributes.hvac_action === 'heating' || device.attributes.hvac_action === 'cooling' || undefined}
      role="group"
      aria-label={`${device.name}, ${current !== undefined ? `${formatTemp(current)} now, ` : ''}${label}`}
    >
      <span className="home-tile__glyph" aria-hidden>
        <DeviceGlyph domain="climate" />
      </span>
      <span className="home-tile__temp" aria-hidden>{current !== undefined ? formatTemp(current) : '–'}</span>
      <span className="home-tile__name" aria-hidden>{device.name}</span>
      <span className="home-tile__state" aria-hidden>{label}</span>
    </div>
  )
}

// One device: tap toggles it; a light that dims opens its sheet on a long press, a right click or
// the corner button (the keyboard and screen-reader route).
export function DeviceTile({ device, onAdjust }: { device: Device; onAdjust: (entityId: string) => void }) {
  const { act } = useHome()
  const adjustable = hasLightControls(device)
  const { handlers, consumed } = useLongPress(adjustable ? () => onAdjust(device.entity_id) : undefined)

  if (device.domain === 'climate') return <ClimateTile device={device} />

  const on = isOn(device)
  const unavailable = isUnavailable(device)
  const lit = device.domain === 'light' && on
  const style = lit
    ? ({ '--lamp': lampColour(device), '--level': (device.attributes.brightness_pct ?? 100) / 100 } as CSSProperties)
    : undefined

  return (
    <div
      className="home-tile"
      data-on={on || undefined}
      data-lit={lit || undefined}
      data-unavailable={unavailable || undefined}
      style={style}
    >
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={unavailable || !device.controllable}
        className="home-tile__main"
        onClick={() => {
          if (!consumed()) act(device.entity_id, { action: 'toggle' })
        }}
        {...handlers}
      >
        <span className="home-tile__glyph" aria-hidden>
          <DeviceGlyph domain={device.domain} />
        </span>
        <span className="home-tile__name">{device.name}</span>
        <span className="home-tile__state">{stateLabel(device)}</span>
      </button>
      {adjustable && !unavailable && (
        <button
          type="button"
          className="home-tile__adjust"
          aria-label={`Brightness and colour, ${device.name}`}
          onClick={() => onAdjust(device.entity_id)}
        >
          <AdjustGlyph size={18} />
        </button>
      )}
    </div>
  )
}
