'use client'

import { DeviceGlyph } from './glyphs'
import { useHome } from './HomeProvider'
import { useLongPress } from './useLongPress'
import { formatTemp, hasLightControls, isOn, isUnavailable, stateLabel, type Tile } from './lib'

const TEMP_STEP = 0.5

// A thermostat or heater: a full-width card. The main area (name, state, big current temperature)
// is the on/off switch; while on with a known target, a stepper at the right shows the target and
// nudges it by half a degree within its range.
function ClimateTile({ tile }: { tile: Tile }) {
  const { act } = useHome()
  const current = tile.attributes.current_temperature
  const target = tile.attributes.temperature
  const min = tile.attributes.min_temp ?? 5
  const max = tile.attributes.max_temp ?? 35
  const on = isOn(tile)
  const unavailable = isUnavailable(tile)
  const label = stateLabel(tile)
  const steps = tile.controllable && !unavailable && on && target !== undefined
  const step = (delta: number) =>
    act(tile.entity_id, { action: 'temperature', value: Math.min(max, Math.max(min, (target ?? min) + delta)) })

  const content = (
    <>
      <span className="home-tile__text" aria-hidden={!tile.controllable || undefined}>
        <span className="home-tile__name">{tile.short_name}</span>
        <span className="home-tile__state">{label}</span>
      </span>
      <span className="home-tile__current" aria-hidden>
        {current !== undefined ? formatTemp(current) : '–'}
      </span>
    </>
  )

  return (
    <div
      className="home-tile"
      data-kind="climate"
      data-on={on || undefined}
      data-unavailable={unavailable || undefined}
      {...(tile.controllable ? {} : { role: 'group', 'aria-label': `${tile.short_name}, ${current !== undefined ? `${formatTemp(current)} now, ` : ''}${label}` })}
    >
      {tile.controllable ? (
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={tile.name}
          disabled={unavailable}
          className="home-tile__main"
          onClick={() => act(tile.entity_id, { action: 'toggle' })}
        >
          {content}
        </button>
      ) : (
        <div className="home-tile__main">{content}</div>
      )}
      {steps && (
        <div className="home-tile__stepper">
          <button
            type="button"
            className="home-tile__step"
            aria-label={`Raise ${tile.name} target`}
            disabled={target >= max}
            onClick={() => step(TEMP_STEP)}
          >
            +
          </button>
          <span className="home-tile__target" aria-live="polite">
            {formatTemp(target)}
          </span>
          <button
            type="button"
            className="home-tile__step"
            aria-label={`Lower ${tile.name} target`}
            disabled={target <= min}
            onClick={() => step(-TEMP_STEP)}
          >
            −
          </button>
        </div>
      )}
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
          <DeviceGlyph domain={tile.domain} size={20} />
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
