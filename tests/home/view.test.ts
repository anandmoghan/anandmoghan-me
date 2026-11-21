import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  applyEvent,
  findDevice,
  findTile,
  optimisticChanges,
  withDevices,
  stateLabel,
  type HomeState,
} from "../../common/apps/home/lib";
import { automationGroups, lightsOn, statusChips } from "../../common/apps/home/view";

const here = path.dirname(fileURLToPath(import.meta.url));
// GET /home/state (contract v2) for the real home, with real names (states may be stale).
const real = JSON.parse(readFileSync(path.join(here, "real-snapshot.json"), "utf8")) as HomeState;
const fresh = () => structuredClone(real);

test("the snapshot is drawn as the server placed it", () => {
  assert.deepEqual(real.rooms.map((r) => r.name), ["Living Room", "Hallway", "Master Bedroom", "Dining Room", "Kitchen"]);
  const tiles = (name: string) => real.rooms.find((r) => r.name === name)!.tiles.map((t) => `${t.kind}:${t.short_name}`);
  assert.deepEqual(tiles("Dining Room"), ["light_group:Pendants", "light_group:Spotlights", "light:Lamp"]);
  assert.deepEqual(tiles("Kitchen"), ["light_group:Spotlights", "climate:Heater"]);
  assert.equal(real.rooms[0].all_lights, "light.living_room_lights");
  assert.equal(real.rooms[1].all_lights, null);
  assert.deepEqual(real.modes.map((m) => m.name), ["Away Mode", "Awake Mode", "Anand Sleep Mode", "Kavya Sleep Mode"]);
});

test("finds tiles, members and modes by entity id", () => {
  assert.equal(findTile(real, "light.dining_room_pendants")?.members?.length, 3);
  assert.equal(findDevice(real, "light.dining_room_pendant_2")?.name, "Dining Room Pendant 2");
  assert.equal(findDevice(real, "input_boolean.away_mode")?.domain, "input_boolean");
  assert.equal(findTile(real, "light.dining_room_pendant_2"), undefined);
});

test("a light group's action changes its bulbs optimistically", () => {
  const state = fresh();
  const changes = optimisticChanges(state, "light.living_room_wall_lights", { action: "toggle" });
  assert.equal(changes.length, 5);
  assert.ok(changes.every((d) => d.state === "on"));
  const dimmed = optimisticChanges(state, "light.dining_room_pendants", { action: "brightness", value: 40 });
  assert.deepEqual(dimmed.map((d) => d.attributes.brightness_pct), [40, 40, 40, 40]);
  const next = withDevices(state, changes);
  const group = findTile(next, "light.living_room_wall_lights")!;
  assert.equal(group.kind, "light_group");
  assert.equal(group.short_name, "Wall Lights");
  assert.ok(group.members!.every((m) => m.state === "on"));
});

test("a bulb's action updates the group it belongs to", () => {
  const changes = optimisticChanges(fresh(), "light.kitchen_spotlights_2", { action: "turn_on" });
  assert.deepEqual(changes.map((d) => `${d.entity_id} ${d.state}`), [
    "light.kitchen_spotlights_2 on",
    "light.kitchen_spotlights on",
  ]);
});

test("the whole-room group turns every light in the room on or off", () => {
  const state = fresh();
  const on = optimisticChanges(state, "light.dining_room_lights", { action: "turn_on" });
  assert.equal(on.length, 9);
  const next = withDevices(state, on);
  assert.equal(lightsOn(next), 7);
  const off = optimisticChanges(next, "light.dining_room_lights", { action: "toggle" });
  assert.ok(off.every((d) => d.state === "off"));
});

test("climate: on in any mode but off; toggle, target and labels", () => {
  const state = fresh();
  const heater = findTile(state, "climate.kitchen_heater")!;
  assert.equal(stateLabel(heater), "Off");
  const on = optimisticChanges(state, heater.entity_id, { action: "toggle" })[0];
  assert.equal(on.state, "heat");
  assert.equal(stateLabel(on), "Heat to 21°");
  assert.equal(optimisticChanges(withDevices(state, [on]), heater.entity_id, { action: "toggle" })[0].state, "off");
  const warmer = optimisticChanges(state, heater.entity_id, { action: "temperature", value: 21.5 })[0];
  assert.equal(warmer.attributes.temperature, 21.5);
  assert.equal(stateLabel({ ...on, attributes: { ...on.attributes, hvac_action: "heating" } }), "Heating to 21°");
  assert.equal(stateLabel({ ...on, state: "unavailable" }), "Unavailable");
});

test("stream events update members, tiles and automations", () => {
  let state = fresh();
  const pendant = findDevice(state, "light.dining_room_pendant_1")!;
  state = applyEvent(state, { type: "state", ...pendant, state: "on", attributes: { brightness_pct: 20 } });
  assert.equal(findDevice(state, "light.dining_room_pendant_1")?.state, "on");
  assert.equal(lightsOn(state), 1);
  state = applyEvent(state, { type: "automation", entity_id: "automation.heating_evening_20", enabled: false, last_triggered: null });
  const evening = state.automations.find((a) => a.entity_id === "automation.heating_evening_20")!;
  assert.equal(evening.enabled, false);
  assert.equal(evening.title, "Evening: 20°");
  assert.equal(applyEvent(state, { type: "state", ...pendant, entity_id: "light.unknown" }).rooms, state.rooms);
});

test("status chips summarise lights, and climate", () => {
  const state = fresh();
  const living = state.rooms[0].tiles;
  living[0].members![0].state = "on";
  living[0].members![1].state = "on";
  living[2].attributes = { current_temperature: 20.5 };
  assert.deepEqual(statusChips(state).map((c) => `${c.label} ${c.value}`), ["Lights 2 on", "Climate 20.5°"]);
  assert.equal(statusChips(real)[0].value, "Off");
});

test("automations keep the server's groups, Other last", () => {
  const groups = automationGroups(real.automations);
  assert.deepEqual(groups.map((g) => [g.title, g.automations.length]), [["Heater", 2], ["Heating", 2], ["Modes", 6]]);
  assert.deepEqual(groups[1].automations.map((a) => a.title), ["Evening: 20°", "Morning: 23° and kitchen heater"]);
  const odd = automationGroups([
    { entity_id: "automation.x", name: "Porch light", group: "Other", title: "Porch light", enabled: true, last_triggered: null },
    ...real.automations,
  ]);
  assert.equal(odd.at(-1)?.title, "Other");
});
