import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildHomeView, groupAutomations, statusChips, stripRoomPrefix } from "../../common/apps/home/view";
import type { HomeState } from "../../common/apps/home/lib";

const here = path.dirname(fileURLToPath(import.meta.url));
// A snapshot of the real home (states may be stale): rooms, light groups, modes, automations.
const real = { unassigned: [], ...JSON.parse(readFileSync(path.join(here, "real-snapshot.json"), "utf8")) } as HomeState;

test("strips the room prefix but keeps names without one", () => {
  assert.equal(stripRoomPrefix("Living Room Wall Lights", "Living Room"), "Wall Lights");
  assert.equal(stripRoomPrefix("Dining Room Pendant 2", "Dining Room"), "Pendant 2");
  assert.equal(stripRoomPrefix("Hallway", "Hallway"), "Hallway");
  assert.equal(stripRoomPrefix("Lamp", "Living Room"), "Lamp");
});

test("rooms: one tile per light group, ungrouped bulbs alone, empty rooms hidden", () => {
  const view = buildHomeView(real);
  assert.deepEqual(view.rooms.map((r) => r.name), ["Living Room", "Hallway", "Master Bedroom", "Dining Room", "Kitchen"]);
  const titles = (name: string) => view.rooms.find((r) => r.name === name)!.tiles.map((t) => t.title);
  assert.deepEqual(titles("Living Room"), ["Wall Lights", "Lamp", "Thermostat"]);
  assert.deepEqual(titles("Dining Room"), ["Pendants", "Spotlights", "Lamp"]);
  assert.deepEqual(titles("Kitchen"), ["Spotlights", "Heater"]);
  assert.deepEqual(titles("Master Bedroom"), ["Wall Lights", "Heater"]);
  assert.deepEqual(titles("Hallway"), ["Lights"]);
});

test("group tiles list their bulbs and rooms get the whole-room group", () => {
  const view = buildHomeView(real);
  const living = view.rooms[0];
  assert.equal(living.allLights?.entity_id, "light.living_room_lights");
  assert.equal(view.rooms.find((r) => r.name === "Hallway")!.allLights, null);
  assert.equal(view.membersOf("light.living_room_wall_lights").length, 4);
  assert.deepEqual(
    view.membersOf("light.dining_room_pendants").map((t) => t.title),
    ["Pendant 1", "Pendant 2", "Pendant 3"],
  );
  assert.equal(view.membersOf("light.kitchen_spotlights").length, 3);
});

test("modes exclude heater controls and nothing is left over", () => {
  const view = buildHomeView(real);
  assert.deepEqual(view.modes.map((m) => m.name), ["Anand Sleep Mode", "Awake Mode", "Away Mode", "Kavya Sleep Mode"]);
  assert.equal(view.other.length, 0);
  const heater = view.rooms.find((r) => r.name === "Kitchen")!.tiles.find((t) => t.kind === "heater")!;
  assert.equal(heater.device.entity_id, "input_boolean.kitchen_heater_control");
});

test("works when groups and modes arrive in unassigned, and drops adaptive lighting switches", () => {
  const flat: HomeState = {
    ...real,
    unassigned: [
      ...(real.light_groups ?? []),
      ...(real.modes ?? []),
      { entity_id: "switch.adaptive_lighting_living_room", name: "Adaptive Lighting: Living Room", domain: "switch", state: "on", controllable: true, attributes: {} },
      { entity_id: "switch.garden", name: "Garden", domain: "switch", state: "off", controllable: true, attributes: {} },
    ],
    light_groups: undefined,
    modes: undefined,
  };
  const view = buildHomeView(flat);
  assert.equal(view.modes.length, 4);
  assert.deepEqual(view.other.map((t) => t.title), ["Garden"]);
  assert.equal(view.rooms[0].allLights?.entity_id, "light.living_room_lights");
});

test("status chips summarise lights, climate and heaters", () => {
  const state: HomeState = structuredClone(real);
  state.rooms[0].devices[0].state = "on";
  state.rooms[0].devices[1].state = "on";
  state.rooms[0].devices[5].attributes = { current_temperature: 20.5 };
  state.modes!.find((m) => m.entity_id === "input_boolean.kitchen_heater_control")!.state = "on";
  const chips = statusChips(state, buildHomeView(state));
  assert.deepEqual(chips.map((c) => `${c.label} ${c.value}`), ["Lights 2 on", "Climate 20.5°", "Heaters 1 on"]);
  assert.equal(statusChips(real, buildHomeView(real))[0].value, "Off");
});

test("automations group by first segment with sentence-case titles", () => {
  const groups = groupAutomations(real.automations);
  assert.deepEqual(groups.map((g) => [g.title, g.rows.length]), [["Heater", 2], ["Modes", 6]]);
  assert.deepEqual(groups[0].rows.map((r) => r.title), ["Kitchen: off after 2 hours", "Master bedroom: off after 2 hours"]);
  assert.ok(groups[1].rows.some((r) => r.title === "Away mode on: awake mode off"));
  const odd = groupAutomations([{ entity_id: "automation.x", name: "Porch light", enabled: true, last_triggered: null }]);
  assert.deepEqual(odd.map((g) => [g.title, g.rows[0].title]), [["Other", "Porch light"]]);
});
