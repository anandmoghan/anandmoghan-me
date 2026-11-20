import assert from "node:assert/strict";
import test from "node:test";
import {
  barsSummary,
  compareWithYesterday,
  dailyBars,
  DASH,
  formatKwh,
  formatMoney,
  formatPower,
  formatRate,
  hourlyBars,
  hourOf,
  mergeEnergy,
  niceMax,
  shareOf,
  tariffLine,
  usageRows,
  weekday,
  type Energy,
} from "../../common/apps/home/energy";

const rates = { electricity_per_kwh: 0.266132, gas_per_kwh: 0.0593, tariff: "Flexible Octopus", currency: "GBP" };

test("formats power, energy, money and rates, with a dash for unknowns", () => {
  assert.equal(formatPower(1240), "1.24 kW");
  assert.equal(formatPower(640.4), "640 W");
  assert.equal(formatPower(null), DASH);
  assert.equal(formatKwh(0.423), "0.42 kWh");
  assert.equal(formatKwh(18), "18.0 kWh");
  assert.equal(formatKwh(142.6), "143 kWh");
  assert.equal(formatKwh(undefined), DASH);
  assert.equal(formatMoney(3.124), "£3.12");
  assert.equal(formatMoney(Number.NaN), DASH);
  assert.equal(formatRate(0.266132), "26.6p/kWh");
  assert.equal(formatRate(0.27, "EUR"), "€0.27/kWh");
});

test("the subtitle names the tariff and the unit rate, whichever are known", () => {
  assert.equal(tariffLine(rates), "Flexible Octopus · 26.6p/kWh");
  assert.equal(tariffLine({ electricity_per_kwh: 0.25 }), "25.0p/kWh");
  assert.equal(tariffLine({ tariff: "  " }), null);
  assert.equal(tariffLine(null), null);
});

test("compares today's cost with yesterday's", () => {
  const day = (total_cost: number | null) => ({ total_cost });
  assert.equal(compareWithYesterday({ rates, today: day(3.12), yesterday: day(3.52) }), "£0.40 less than yesterday");
  assert.equal(compareWithYesterday({ today: day(5), yesterday: day(4.5) }), "£0.50 more than yesterday");
  assert.equal(compareWithYesterday({ today: day(4.501), yesterday: day(4.5) }), "Same as yesterday");
  assert.equal(compareWithYesterday({ today: day(4), yesterday: day(null) }), null);
  assert.equal(compareWithYesterday(null), null);
});

test("shares clamp to 0..1 and are unknown without a total", () => {
  assert.equal(shareOf(3, 12), 0.25);
  assert.equal(shareOf(20, 12), 1);
  assert.equal(shareOf(3, 0), null);
  assert.equal(shareOf(null, 12), null);
});

test("where it went: devices by use, then everything else priced at the unit rate", () => {
  const energy: Energy = {
    rates,
    today: { electricity_kwh: 12 },
    devices: [
      { entity_id: "a", name: "Master Bedroom Heater", room: "Master Bedroom", kwh_today: 1.5, cost_today: 0.4, estimated: true, note: "1.5 kW while on" },
      { entity_id: "b", name: "Kitchen Heater", room: "Kitchen", kwh_today: 3, cost_today: 0.8, kwh_month: 46.5, cost_month: 12.38 },
      { entity_id: "c", name: "Unknown", kwh_today: null },
    ],
    other_today: { electricity_kwh: 7.5 },
  };
  const rows = usageRows(energy);
  assert.deepEqual(rows.map((r) => r.name), ["Kitchen Heater", "Master Bedroom Heater", "Unknown", "Everything else"]);
  assert.equal(rows[0].share, 0.25);
  assert.equal(rows[1].estimated, true);
  assert.equal(rows[1].note, "1.5 kW while on");
  assert.equal(rows[2].share, null);
  assert.equal(rows[3].costToday?.toFixed(2), "2.00");
  assert.deepEqual(usageRows({}), []);
});

test("hourly bars cover the whole day; hours come as numbers or times", () => {
  assert.equal(hourOf(7), 7);
  assert.equal(hourOf("2026-11-20T18:00:00+00:00"), 18);
  assert.equal(hourOf("06:00"), 6);
  assert.equal(hourOf(24), null);
  const bars = hourlyBars([{ hour: 6, electricity_kwh: 1.6, gas_kwh: 2 }, { hour: "07:00", electricity_kwh: 1.7 }]);
  assert.equal(bars.length, 24);
  assert.deepEqual(bars.filter((b) => b.tick).map((b) => b.tick), ["00", "06", "12", "18"]);
  assert.deepEqual([bars[6].electricity, bars[6].gas, bars[7].gas, bars[8].electricity], [1.6, 2, null, null]);
  assert.equal(bars[7].label, "07:00");
});

test("daily bars run oldest first with weekday ticks", () => {
  assert.equal(weekday("2026-11-16"), "Mon");
  const bars = dailyBars([{ date: "2026-11-20", electricity_kwh: 11 }, { date: "2026-11-19", electricity_kwh: 18, gas_kwh: 32 }]);
  assert.deepEqual(bars.map((b) => b.tick), ["Thu", "Fri"]);
  assert.equal(bars[0].label, "Thu 19 Nov");
});

test("axis tops are clean numbers and the summary names the busiest bar", () => {
  assert.deepEqual([0.3, 1, 1.7, 2.3, 3.6, 18, 47, 0].map(niceMax), [0.5, 1, 2, 2.5, 5, 20, 50, 1]);
  const bars = dailyBars([{ date: "2026-11-19", electricity_kwh: 18, gas_kwh: 32 }, { date: "2026-11-20", electricity_kwh: 11, gas_kwh: 21 }]);
  assert.equal(barsSummary("Last 7 days", bars), "Last 7 days: 29.0 kWh electricity and 53.0 kWh gas. Highest Thu 19 Nov, 50.0 kWh.");
  assert.equal(barsSummary("Today", hourlyBars([])), "Today: no readings yet.");
});

test("a stream reading replaces only the fields it carries", () => {
  const current: Energy = { rates, now: { electricity_w: 1240 }, today: { total_cost: 3 } };
  const next = mergeEnergy(current, { type: "energy", now: { electricity_w: 1840 } });
  assert.equal(next.now?.electricity_w, 1840);
  assert.equal(next.today?.total_cost, 3);
  assert.equal(next.rates?.tariff, "Flexible Octopus");
  assert.ok(!("type" in next));
  assert.equal(mergeEnergy(null, { today: { total_cost: 1 } }).today?.total_cost, 1);
});
