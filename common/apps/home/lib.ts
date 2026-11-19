// Types and pure helpers for the Home app. The API (api.anandmoghan.me/home) talks to Home
// Assistant; the browser only ever sees the shapes below, never the Home Assistant token.

export type DeviceDomain = 'light' | 'switch' | 'fan' | 'input_boolean' | 'climate' | (string & {})

export interface DeviceAttributes {
  brightness_pct?: number
  color_mode?: string
  rgb_color?: [number, number, number]
  color_temp_kelvin?: number
  min_kelvin?: number
  max_kelvin?: number
  current_temperature?: number
  temperature?: number
  hvac_action?: string
  unit?: string
}

export interface Device {
  entity_id: string
  name: string
  domain: DeviceDomain
  state: string
  controllable: boolean
  attributes: DeviceAttributes
}

export interface Room {
  id: string
  name: string
  devices: Device[]
}

export interface Scene {
  entity_id: string
  name: string
}

export interface Automation {
  entity_id: string
  name: string
  enabled: boolean
  last_triggered: string | null
}

export interface HomeState {
  home: { name: string }
  rooms: Room[]
  unassigned: Device[]
  scenes: Scene[]
  automations: Automation[]
  /** Light groups that belong to no area (optional: the API may send them in `unassigned`). */
  light_groups?: Device[]
  /** Input booleans used as house modes (optional: the API may send them in `unassigned`). */
  modes?: Device[]
}

export type HomeAction =
  | { action: 'turn_on' | 'turn_off' | 'toggle' | 'activate' | 'enable' | 'disable' | 'trigger' }
  | { action: 'brightness'; value: number }
  | { action: 'color_temp'; value: number }

export const isOn = (device: Device) => device.state === 'on'

export const isUnavailable = (device: Device) => device.state === 'unavailable' || device.state === 'unknown'

export const isAutomationId = (entityId: string) => entityId.startsWith('automation.')

/** Every controllable light opens the detail sheet. An off light reports no brightness or colour
 * mode, so whether it dims is only known once it is on; the sheet shows what the light reports. */
export function hasLightControls(device: Device): boolean {
  return device.domain === 'light' && device.controllable
}

export function hasColourTemp(device: Device): boolean {
  const { min_kelvin, max_kelvin } = device.attributes
  return min_kelvin !== undefined && max_kelvin !== undefined && max_kelvin > min_kelvin
}

/** Every device, rooms first, then unassigned, light groups and modes. */
export function allDevices(state: HomeState): Device[] {
  return [
    ...state.rooms.flatMap((room) => room.devices),
    ...state.unassigned,
    ...(state.light_groups ?? []),
    ...(state.modes ?? []),
  ]
}

/** Replaces one device wherever it appears. */
export function withDevice(state: HomeState, next: Device): HomeState {
  const swap = (devices: Device[]) => (devices.some((d) => d.entity_id === next.entity_id)
    ? devices.map((d) => (d.entity_id === next.entity_id ? next : d))
    : devices)
  return {
    ...state,
    rooms: state.rooms.map((room) => ({ ...room, devices: swap(room.devices) })),
    unassigned: swap(state.unassigned),
    ...(state.light_groups ? { light_groups: swap(state.light_groups) } : {}),
    ...(state.modes ? { modes: swap(state.modes) } : {}),
  }
}

export function withAutomation(state: HomeState, next: Automation): HomeState {
  return {
    ...state,
    automations: state.automations.map((a) => (a.entity_id === next.entity_id ? next : a)),
  }
}

export function findDevice(state: HomeState, entityId: string): Device | undefined {
  return allDevices(state).find((d) => d.entity_id === entityId)
}

/** The device as it should look right after `action`, before Home Assistant confirms it. */
export function optimisticDevice(device: Device, action: HomeAction): Device {
  switch (action.action) {
    case 'turn_on':
      return { ...device, state: 'on' }
    case 'turn_off':
      return { ...device, state: 'off' }
    case 'toggle':
      return { ...device, state: isOn(device) ? 'off' : 'on' }
    case 'brightness':
      return { ...device, state: 'on', attributes: { ...device.attributes, brightness_pct: action.value } }
    case 'color_temp':
      return {
        ...device,
        state: 'on',
        attributes: { ...device.attributes, color_temp_kelvin: action.value, color_mode: 'color_temp' },
      }
    default:
      return device
  }
}

/** What a tile says under the device name. */
export function stateLabel(device: Device): string {
  if (isUnavailable(device)) return 'Unavailable'
  if (device.domain === 'climate') {
    const { temperature, hvac_action } = device.attributes
    const target = temperature !== undefined ? `${formatTemp(temperature)}` : null
    if (hvac_action === 'heating') return target ? `Heating to ${target}` : 'Heating'
    if (hvac_action === 'cooling') return target ? `Cooling to ${target}` : 'Cooling'
    if (device.state === 'off') return 'Off'
    return target ? `Set to ${target}` : 'Idle'
  }
  if (!isOn(device)) return 'Off'
  const pct = device.attributes.brightness_pct
  return device.domain === 'light' && pct !== undefined ? `${Math.round(pct)}%` : 'On'
}

export function formatTemp(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}°`
}

/** Approximate sRGB of a black-body light at `kelvin` (Tanner Helland's fit), as "r g b". */
export function kelvinToRgb(kelvin: number): [number, number, number] {
  const t = kelvin / 100
  const clamp = (v: number) => Math.round(Math.min(255, Math.max(0, v)))
  if (t <= 66) {
    return [
      255,
      clamp(99.4708025861 * Math.log(t) - 161.1195681661),
      t <= 19 ? 0 : clamp(138.5177312231 * Math.log(t - 10) - 305.0447927307),
    ]
  }
  return [
    clamp(329.698727446 * Math.pow(t - 60, -0.1332047592)),
    clamp(288.1221695283 * Math.pow(t - 60, -0.0755148492)),
    255,
  ]
}

const WARM_WHITE = 2700

/** True when the bulb shows a colour of its own rather than a white temperature. */
export function isColourLamp(device: Device): boolean {
  const { rgb_color, color_mode } = device.attributes
  return Boolean(rgb_color) && color_mode !== 'color_temp'
}

/** The colour a lit tile glows in: the bulb's own colour, else its white temperature. */
export function lampColour(device: Device): string {
  const { rgb_color, color_mode, color_temp_kelvin } = device.attributes
  const rgb = rgb_color && color_mode !== 'color_temp' ? rgb_color : kelvinToRgb(color_temp_kelvin ?? WARM_WHITE)
  return rgb.join(' ')
}

/** "5 minutes ago", "yesterday", or null when it never ran. */
export function ranAgo(iso: string | null, now: number): string | null {
  if (!iso) return null
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return null
  const mins = Math.max(0, Math.round((now - then) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return new Date(then).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
