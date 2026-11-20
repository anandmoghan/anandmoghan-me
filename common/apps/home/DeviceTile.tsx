'use client'

import { DeviceGlyph, HeaterGlyph } from './glyphs'
import { useHome } from './HomeProvider'
import { useLongPress } from './useLongPress'
import { formatTemp, hasLightControls, isOn, isUnavailable, stateLabel, type Tile } from './lib'

function TileGlyph({ tile }: { tile: Tile }) {
  return tile.kind === 'heater' ? <HeaterGlyph size={20} /> : <DeviceGlyph domain={tile.domain} size={20} />
}

function ClimateTile({ tile }: { tile: Tile }) {
  const current = tile.attributes.current_temperature
  const label = stateLabel(tile)
  const heating = tile.attributes.hvac_action === 'heating' || tile.attributes.hvac_action === 'cooling'
  return (
    <div
      className="home-tile"
      data-kind="climate"
      data-on={heating || undefined}
      role="group"
      aria-label={`${tile.short_name}, ${current !== undefined ? `${formatTemp(current)} now, ` : ''}${label}`}
    >
      <div className="home-tile__main">
        <span className="home-tile__glyph home-tile__glyph--temp" aria-hidden>
          {current !== undefined ? formatTemp(current) : '–'}
        </span>
        <span className="home-tile__text" aria-hidden>
          <span className="home-tile__name">{tile.short_name}</span>
          <span className="home-tile__state">{label}</span>
        </span>
      </div>
    </div>
  )
}

function stateText(tile: Tile): string {
  const members = tile.members ?? []
  if (tile.kind === 'light_group' && members.length > 0 && isOn(tile)) {
    const on = members.filter(isOn).length
    const pct = tile.attributes.brightness_pct
    return on < members.length ? `${on} of ${members.length} on` : pct !== undefined ? `${Math.round(pct)}%` : 'On'
  }
  return stateLabel(tile)
}

// One tile: a tap toggles it. A light (or light group) opens its sheet on a long press, a right
// click, or the focusable button that only shows itself to the keyboard and screen readers.
export function DeviceTile({ tile, onAdjust }: { tile: Tile; onAdjust: (entityId: string) => void }) {
  const { act } = useHome()
  const adjustable = hasLightControls(tile)
  const { handlers, consumed } = useLongPress(adjustable ? () => onAdjust(tile.entity_id) : undefined)

  if (tile.kind === 'climate') return <ClimateTile tile={tile} />

  const on = isOn(tile)
  const unavailable = isUnavailable(tile)

  return (
    <div
      className="home-tile"
      data-kind={tile.kind}
      data-on={on || undefined}
      data-unavailable={unavailable || undefined}
    >
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={tile.name}
        disabled={unavailable || !tile.controllable}
        className="home-tile__main"
        onClick={() => {
          if (!consumed()) act(tile.entity_id, { action: 'toggle' })
        }}
        {...handlers}
      >
        <span className="home-tile__glyph" aria-hidden>
          <TileGlyph tile={tile} />
        </span>
        <span className="home-tile__text">
          <span className="home-tile__name">{tile.short_name}</span>
          <span className="home-tile__state">{stateText(tile)}</span>
        </span>
      </button>
      {adjustable && !unavailable && (
        <button
          type="button"
          className="home-tile__adjust"
          aria-label={`Brightness and colour, ${tile.name}`}
          onClick={() => onAdjust(tile.entity_id)}
        >
          Adjust
        </button>
      )}
    </div>
  )
}
