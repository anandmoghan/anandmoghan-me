// Presentation summaries for the Home app. The server already places every device (contract v2);
// this file only counts what the screens summarise and orders the automation groups. Pure, so it is
// unit tested (tests/home/view.test.ts).

import { allTiles, formatTemp, isOn, roomLights, type Automation, type HomeState } from './lib'

export interface StatusChip {
  key: string
  label: string
  value: string
}

export interface AutomationGroup {
  id: string
  title: string
  automations: Automation[]
}

/** Bulbs on across the house: light tiles and light-group members, each counted once. */
export function lightsOn(state: HomeState): number {
  const other = { id: 'other', name: 'Other', all_lights: null, tiles: state.other }
  const bulbs = [...state.rooms, other].flatMap(roomLights)
  return new Set(bulbs.filter(isOn).map((d) => d.entity_id)).size
}

/** The small status row under the home's name. */
export function statusChips(state: HomeState): StatusChip[] {
  const tiles = allTiles(state)
  const thermostat = tiles.find((t) => t.kind === 'climate' && t.attributes.current_temperature !== undefined)
  const heaters = tiles.filter((t) => t.kind === 'heater' && isOn(t)).length
  const on = lightsOn(state)
  return [
    { key: 'lights', label: 'Lights', value: on > 0 ? `${on} on` : 'Off' },
    ...(thermostat ? [{ key: 'climate', label: 'Climate', value: formatTemp(thermostat.attributes.current_temperature as number) }] : []),
    ...(heaters > 0 ? [{ key: 'heaters', label: 'Heaters', value: `${heaters} on` }] : []),
  ]
}

/** Automations under the group the server gave them, alphabetical with "Other" last. */
export function automationGroups(automations: Automation[]): AutomationGroup[] {
  const groups = new Map<string, Automation[]>()
  for (const automation of automations) groups.set(automation.group, [...(groups.get(automation.group) ?? []), automation])
  return [...groups.entries()]
    .sort(([a], [b]) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)))
    .map(([title, rows]) => ({
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title,
      automations: rows.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true })),
    }))
}
