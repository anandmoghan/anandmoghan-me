// Types and pure helpers for the Home app. The API (api.anandmoghan.me/home, contract v2) talks to
// Home Assistant and decides rooms, tiles, groups and modes; the browser only ever sees the shapes
// below, never the Home Assistant token.

import type { Energy } from './energy'

export type DeviceDomain = 'light' | 'switch' | 'fan' | 'input_boolean' | 'climate' | (string & {})

export interface DeviceAttributes {
  brightness_pct?: number
  color_mode?: string
  color_temp_kelvin?: number
  min_kelvin?: number
  max_kelvin?: number
  supported_color_modes?: string[]
  current_temperature?: number
  temperature?: number
  hvac_action?: string
  hvac_mode?: string
}

export interface Device {
  entity_id: string
  name: string
  domain: DeviceDomain
  state: string
  controllable: boolean
  attributes: DeviceAttributes
}

export type TileKind = 'light' | 'light_group' | 'switch' | 'fan' | 'heater' | 'climate'

/** A device as the server places it on the Home tab, with its name inside the room. */
export interface Tile extends Device {
  kind: TileKind
  /** The name without the room prefix: "Wall Lights" in the Living Room. */
  short_name: string
  /** A light group's bulbs. */
  members?: Device[]
}

export interface Room {
  id: string
  name: string
  /** The whole-room light group ("Living Room Lights"), driven by the room header toggle. */
  all_lights: string | null
  tiles: Tile[]
}

export interface Scene {
  entity_id: string
  name: string
}

export interface Automation {
  entity_id: string
  name: string
  /** The first part of the name ("Heater"), or "Other". */
  group: string
  /** The rest, in sentence case ("Kitchen: off after 2 hours"). */
  title: string
  enabled: boolean
  last_triggered: string | null
}

/** GET /home/state (contract v2): the server decides rooms, tiles, groups and modes. */
export interface HomeState {
  home: { name: string }
  /** House modes (Away, Awake, Sleep). */
  modes: Device[]
  rooms: Room[]
  /** Controllable things with no room. */
  other: Tile[]
  scenes: Scene[]
  automations: Automation[]
}

export type HomeAction =
  | { action: 'turn_on' | 'turn_off' | 'toggle' | 'activate' | 'enable' | 'disable' | 'trigger' }
  | { action: 'brightness'; value: number }
  | { action: 'color_temp'; value: number }

/** One message from GET /home/events. */
export type HomeEvent =
  | ({ type: 'state' } & Device)
  | { type: 'automation'; entity_id: string; enabled: boolean; last_triggered: string | null }
  | ({ type: 'energy' } & Energy)

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

/** Every tile, rooms first, then the ones with no room. */
export function allTiles(state: HomeState): Tile[] {
  return [...state.rooms.flatMap((room) => room.tiles), ...state.other]
}

/** Every device once: modes, tiles and light-group members. */
export function allDevices(state: HomeState): Device[] {
  return [...state.modes, ...allTiles(state).flatMap((tile) => [tile, ...(tile.members ?? [])])]
}

export function findDevice(state: HomeState, entityId: string): Device | undefined {
  return allDevices(state).find((d) => d.entity_id === entityId)
}

export function findTile(state: HomeState, entityId: string): Tile | undefined {
  return allTiles(state).find((t) => t.entity_id === entityId)
}

export function findRoomByAllLights(state: HomeState, entityId: string): Room | undefined {
  return state.rooms.find((room) => room.all_lights === entityId)
}

/** The bulbs a room's lights cover: its light tiles and the members of its light groups. */
export function roomLights(room: Room): Device[] {
  return room.tiles.flatMap((tile) =>
    tile.kind === 'light' ? [tile] : tile.kind === 'light_group' ? (tile.members ?? []) : [],
  )
}

const deviceFields = (d: Device): Device => ({
  entity_id: d.entity_id,
  name: d.name,
  domain: d.domain,
  state: d.state,
  controllable: d.controllable,
  attributes: d.attributes,
})

/** Replaces devices wherever they appear: a mode, a tile (keeping its kind, short name and
 * members unless `next` carries members) or a group member. */
export function withDevices(state: HomeState, next: Device[]): HomeState {
  if (next.length === 0) return state
  const byId = new Map(next.map((d) => [d.entity_id, d]))
  const swap = (d: Device): Device => {
    const n = byId.get(d.entity_id)
    return n ? deviceFields(n) : d
  }
  const swapTile = (t: Tile): Tile => {
    const n = byId.get(t.entity_id)
    const members = n && 'members' in n && Array.isArray(n.members) ? (n.members as Device[]) : t.members
    return {
      ...t,
      ...(n ? deviceFields(n) : {}),
      ...(members ? { members: members.map(swap) } : {}),
    }
  }
  return {
    ...state,
    modes: state.modes.map(swap),
    rooms: state.rooms.map((room) => ({ ...room, tiles: room.tiles.map(swapTile) })),
    other: state.other.map(swapTile),
  }
}

export function withAutomation(state: HomeState, next: Partial<Automation> & { entity_id: string }): HomeState {
  return {
    ...state,
    automations: state.automations.map((a) => (a.entity_id === next.entity_id ? { ...a, ...next } : a)),
  }
}

/** Applies one device or automation message; entities the snapshot does not hold are ignored. */
export function applyEvent(state: HomeState, event: Exclude<HomeEvent, { type: 'energy' }>): HomeState {
  if (event.type === 'automation') {
    const { entity_id, enabled, last_triggered } = event
    return withAutomation(state, { entity_id, enabled, last_triggered })
  }
  return findDevice(state, event.entity_id) ? withDevices(state, [deviceFields(event)]) : state
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

/** A toggle as the explicit on or off it means for something that is now `on` or not. */
const resolve = (action: HomeAction, on: boolean): HomeAction =>
  action.action === 'toggle' ? { action: on ? 'turn_off' : 'turn_on' } : action

/** Every device an action changes, as it should look before Home Assistant confirms it: the entity
 * itself, a light group's bulbs, the groups a bulb belongs to, or every light in a room for its
 * whole-room group (which is not a tile, so it is not in the result). */
export function optimisticChanges(state: HomeState, entityId: string, action: HomeAction): Device[] {
  const room = findRoomByAllLights(state, entityId)
  if (room) {
    const lit = room.tiles.filter((t) => t.kind === 'light' || t.kind === 'light_group')
    const next = resolve(action, roomLights(room).some(isOn))
    return lit.flatMap((t) => [t, ...(t.members ?? [])]).map((d) => optimisticDevice(d, next))
  }
  const device = findDevice(state, entityId)
  if (!device) return []
  const next = resolve(action, isOn(device))
  const changed = optimisticDevice(device, next)
  const tile = findTile(state, entityId)
  if (tile?.kind === 'light_group') {
    return [changed, ...(tile.members ?? []).map((m) => optimisticDevice(m, next))]
  }
  const parents = allTiles(state)
    .filter((t) => t.kind === 'light_group' && t.members?.some((m) => m.entity_id === entityId))
    .map((group) => {
      const members = (group.members ?? []).map((m) => (m.entity_id === entityId ? changed : m))
      return { ...deviceFields(group), state: members.some(isOn) ? 'on' : 'off' }
    })
  return [changed, ...parents]
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
