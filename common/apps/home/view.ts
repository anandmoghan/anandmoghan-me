// Presentation mapping for the Home app: turns the API snapshot into what the screens draw. Pure,
// so it is unit tested (tests/home/view.test.ts). The API sends rooms of individual devices, light
// groups and input booleans with no area, and automations named "Group - Subject - Action"; this
// file groups bulbs under their light group, strips room prefixes, pulls house modes and heaters
// out of the input booleans, and groups automations by their first name segment.

import { formatTemp, isOn, type Automation, type Device, type HomeState } from './lib'

export type TileKind = 'light' | 'heater' | 'switch' | 'fan' | 'toggle' | 'climate'

export interface Tile {
  id: string
  /** The entity a tap acts on: a bulb, a light group, a heater switch. */
  device: Device
  /** The name shown on the tile, without the room prefix. */
  title: string
  kind: TileKind
  /** The bulbs a light group controls (empty for everything else). */
  members: Device[]
}

export interface RoomView {
  id: string
  name: string
  tiles: Tile[]
  /** The whole-room light group ("Living Room Lights"), driven by the room header toggle. */
  allLights: Device | null
}

export interface HomeView {
  modes: Device[]
  rooms: RoomView[]
  /** Devices that belong to no room. */
  other: Tile[]
  /** Bulbs on, across the house (groups are not counted twice). */
  lightsOn: number
  /** A light group's bulbs as tiles (room prefix stripped), for its detail sheet. */
  membersOf: (entityId: string) => Tile[]
  /** Any tile by entity id: its room-stripped title is the detail sheet's heading. */
  tileFor: (entityId: string) => Tile | undefined
}

export interface StatusChip {
  key: string
  label: string
  value: string
}

export interface AutomationRow {
  automation: Automation
  /** Sentence-case row title, for example "Kitchen: off after 2 hours". */
  title: string
}

export interface AutomationGroup {
  id: string
  title: string
  rows: AutomationRow[]
}

const isAdaptiveLighting = (device: Device) => device.entity_id.startsWith('switch.adaptive_lighting')

const lower = (s: string) => s.toLowerCase()

/** "Living Room Wall Lights" in room "Living Room" is "Wall Lights"; names without the prefix stay. */
export function stripRoomPrefix(name: string, roomName: string): string {
  const prefix = `${roomName} `
  if (lower(name).startsWith(lower(prefix)) && name.length > prefix.length) return name.slice(prefix.length)
  return name
}

/** A bulb's kind with its number and plural dropped: "Pendant 2" and "Pendants" are both "pendant". */
function kindOf(name: string): string {
  return lower(name).replace(/\s*\d+$/, '').replace(/s$/, '').trim()
}

function tileKind(device: Device): TileKind {
  switch (device.domain) {
    case 'light': return 'light'
    case 'climate': return 'climate'
    case 'fan': return 'fan'
    case 'switch': return 'switch'
    default: return 'toggle'
  }
}

const byTitle = (a: Tile, b: Tile) => a.title.localeCompare(b.title, undefined, { numeric: true })

/** The room whose name prefixes `name`, longest name first so "Master Bedroom" beats "Bedroom". */
function roomFor(name: string, rooms: HomeState['rooms']) {
  return [...rooms]
    .sort((a, b) => b.name.length - a.name.length)
    .find((room) => lower(name).startsWith(lower(`${room.name} `)))
}

export function buildHomeView(state: HomeState): HomeView {
  const pool = [...state.unassigned, ...(state.light_groups ?? []), ...(state.modes ?? [])].filter(
    (device) => !isAdaptiveLighting(device),
  )
  const used = new Set<string>()
  const memberMap = new Map<string, Tile[]>()

  const rooms: RoomView[] = state.rooms.map((room) => {
    const own = room.devices.filter((device) => !isAdaptiveLighting(device))
    const groups = pool.filter((d) => d.domain === 'light' && roomFor(d.name, state.rooms)?.id === room.id)
    const allLights = groups.find((g) => lower(g.name) === lower(`${room.name} lights`)) ?? null
    const fine = groups.filter((g) => g !== allLights)
    if (allLights) used.add(allLights.entity_id)

    const claimed = new Set<string>()
    const groupTiles: Tile[] = fine.map((group) => {
      used.add(group.entity_id)
      const title = stripRoomPrefix(group.name, room.name)
      const members = own.filter((d) => d.domain === 'light' && kindOf(stripRoomPrefix(d.name, room.name)) === kindOf(title))
      members.forEach((m) => claimed.add(m.entity_id))
      memberMap.set(
        group.entity_id,
        members.map((device) => ({
          id: device.entity_id,
          device,
          title: stripRoomPrefix(device.name, room.name),
          kind: 'light',
          members: [],
        })),
      )
      return { id: group.entity_id, device: group, title, kind: 'light', members }
    })

    const ownTiles: Tile[] = own
      .filter((d) => !claimed.has(d.entity_id))
      .map((device) => ({
        id: device.entity_id,
        device,
        title: stripRoomPrefix(device.name, room.name),
        kind: tileKind(device),
        members: [],
      }))

    const heater = pool.find((d) => d.domain === 'input_boolean' && lower(d.name) === lower(`${room.name} heater control`))
    const heaterTiles: Tile[] = heater
      ? [{ id: heater.entity_id, device: heater, title: 'Heater', kind: 'heater', members: [] }]
      : []
    if (heater) used.add(heater.entity_id)

    return {
      id: room.id,
      name: room.name,
      allLights,
      tiles: [
        ...groupTiles.sort(byTitle),
        ...ownTiles.filter((t) => t.kind === 'light').sort(byTitle),
        ...ownTiles.filter((t) => t.kind !== 'light').sort(byTitle),
        ...heaterTiles,
      ],
    }
  })

  const modes = pool.filter((d) => d.domain === 'input_boolean' && !used.has(d.entity_id))
  modes.forEach((m) => used.add(m.entity_id))
  const other: Tile[] = pool
    .filter((d) => !used.has(d.entity_id))
    .map((device) => ({ id: device.entity_id, device, title: device.name, kind: tileKind(device), members: [] }))
    .sort(byTitle)

  const bulbs = [
    ...state.rooms.flatMap((r) => r.devices),
    ...other.filter((t) => t.kind === 'light').map((t) => t.device),
  ].filter((d) => d.domain === 'light')

  const tiles = new Map<string, Tile>(
    [...rooms.flatMap((r) => r.tiles), ...other, ...[...memberMap.values()].flat()].map((t) => [t.id, t]),
  )

  return {
    modes: modes.sort((a, b) => a.name.localeCompare(b.name)),
    rooms: rooms.filter((r) => r.tiles.length > 0),
    other,
    lightsOn: bulbs.filter(isOn).length,
    membersOf: (entityId) => memberMap.get(entityId) ?? [],
    tileFor: (entityId) => tiles.get(entityId),
  }
}

/** The small status row under the home's name. */
export function statusChips(state: HomeState, view: HomeView): StatusChip[] {
  const devices = state.rooms.flatMap((r) => r.devices)
  const thermostat = devices.find((d) => d.domain === 'climate' && d.attributes.current_temperature !== undefined)
  const heaters = view.rooms.flatMap((r) => r.tiles).filter((t) => t.kind === 'heater' && isOn(t.device)).length
  return [
    { key: 'lights', label: 'Lights', value: view.lightsOn > 0 ? `${view.lightsOn} on` : 'Off' },
    ...(thermostat ? [{ key: 'climate', label: 'Climate', value: formatTemp(thermostat.attributes.current_temperature as number) }] : []),
    ...(heaters > 0 ? [{ key: 'heaters', label: 'Heaters', value: `${heaters} on` }] : []),
  ]
}

const sentence = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/** Automations "Heater - Kitchen - Off After 2 Hours" grouped under "Heater", titled "Kitchen: off after 2 hours". */
export function groupAutomations(automations: Automation[]): AutomationGroup[] {
  const groups = new Map<string, AutomationRow[]>()
  for (const automation of automations) {
    const [head, ...rest] = automation.name.split(' - ').map((s) => s.trim()).filter(Boolean)
    const hasGroup = rest.length > 0
    const group = hasGroup ? head : 'Other'
    const [first, ...tail] = hasGroup ? rest : [head ?? automation.name]
    const title = [sentence(lower(first)), ...tail.map(lower)].join(': ')
    groups.set(group, [...(groups.get(group) ?? []), { automation, title }])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)))
    .map(([title, rows]) => ({
      id: lower(title).replace(/[^a-z0-9]+/g, '-'),
      title,
      rows: rows.sort((a, b) => a.title.localeCompare(b.title)),
    }))
}
