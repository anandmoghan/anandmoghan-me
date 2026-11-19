'use client'

import type { CSSProperties } from 'react'
import { DeviceGlyph, HeaterGlyph } from './glyphs'
import { useHome } from './HomeProvider'
import { useLongPress } from './useLongPress'
import { formatTemp, hasLightControls, isColourLamp, isOn, isUnavailable, lampColour, stateLabel } from './lib'
import type { Tile } from './view'

function TileGlyph({ tile }: { tile: Tile }) {
  return tile.kind === 'heater' ? <HeaterGlyph size={20} /> : <DeviceGlyph domain={tile.device.domain} size={20} />
}

function ClimateTile({ tile }: { tile: Tile }) {
  const { device } = tile
  const current = device.attributes.current_temperature
  const label = stateLabel(device)
  const heating = device.attributes.hvac_action === 'heating' || device.attributes.hvac_action === 'cooling'
  return (
    <div
      className="home-tile"
      data-kind="climate"
      data-on={heating || undefined}
      role="group"
      aria-label={`${tile.title}, ${current !== undefined ? `${formatTemp(current)} now, ` : ''}${label}`}
    >
      <div className="home-tile__main">
        <span className="home-tile__glyph home-tile__glyph--temp" aria-hidden>
          {current !== undefined ? formatTemp(current) : '–'}
        </span>
        <span className="home-tile__text" aria-hidden>
          <span className="home-tile__name">{tile.title}</span>
          <span className="home-tile__state">{label}</span>
        </span>
      </div>
    </div>
  )
}

function stateText(tile: Tile): string {
  const { device, members } = tile
  if (tile.kind === 'light' && members.length > 0 && isOn(device)) {
    const on = members.filter(isOn).length
    const pct = device.attributes.brightness_pct
    return on < members.length ? `${on} of ${members.length} on` : pct !== undefined ? `${Math.round(pct)}%` : 'On'
  }
  return stateLabel(device)
}

// One tile: a tap toggles it. A light (or light group) opens its sheet on a long press, a right
// click, or the focusable button that only shows itself to the keyboard and screen readers.
export function DeviceTile({ tile, onAdjust }: { tile: Tile; onAdjust: (entityId: string) => void }) {
  const { act } = useHome()
  const { device } = tile
  const adjustable = hasLightControls(device)
  const { handlers, consumed } = useLongPress(adjustable ? () => onAdjust(device.entity_id) : undefined)

  if (tile.kind === 'climate') return <ClimateTile tile={tile} />

  const on = isOn(device)
  const unavailable = isUnavailable(device)
  const colour = device.domain === 'light' && on && isColourLamp(device)
  const style = colour ? ({ '--lamp': lampColour(device) } as CSSProperties) : undefined

  return (
    <div
      className="home-tile"
      data-kind={tile.kind}
      data-on={on || undefined}
      data-colour={colour || undefined}
      data-unavailable={unavailable || undefined}
      style={style}
    >
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={device.name}
        disabled={unavailable || !device.controllable}
        className="home-tile__main"
        onClick={() => {
          if (!consumed()) act(device.entity_id, { action: 'toggle' })
        }}
        {...handlers}
      >
        <span className="home-tile__glyph" aria-hidden>
          <TileGlyph tile={tile} />
        </span>
        <span className="home-tile__text">
          <span className="home-tile__name">{tile.title}</span>
          <span className="home-tile__state">{stateText(tile)}</span>
        </span>
      </button>
      {adjustable && !unavailable && (
        <button
          type="button"
          className="home-tile__adjust"
          aria-label={`Brightness and colour, ${device.name}`}
          onClick={() => onAdjust(device.entity_id)}
        >
          Adjust
        </button>
      )}
    </div>
  )
}
