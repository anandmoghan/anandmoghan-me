import assert from "node:assert/strict";
import test from "node:test";
import {
  barsSummary,
  addDays,
  compareSummary,
  costBasisNote,
  dailyBars,
  dayRows,
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
  tipFor,
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

test("compares today so far with yesterday at the same time", () => {
  const compare = (today: number | null, yesterday: number | null) => ({
    until: "14:47",
    today: { electricity_kwh: 6.6, gas_kwh: 58, cost: today },
    yesterday: { electricity_kwh: 7.9, gas_kwh: 66, cost: yesterday },
  });
  const less = compareSummary({ rates, compare: compare(3.1, 3.72) });
  assert.equal(less?.tone, "less");
  assert.equal(less?.arrow, "↓");
  assert.equal(less?.headline, "£0.62 less than yesterday by 14:47");
  assert.equal(less?.detail, "6.6 kWh vs 7.9 kWh electricity · 58.0 kWh vs 66.0 kWh gas");
  const more = compareSummary({ compare: compare(4.5, 4) });
  assert.deepEqual([more?.tone, more?.arrow, more?.headline], ["more", "↑", "£0.50 more than yesterday by 14:47"]);
  const same = compareSummary({ compare: compare(4.05, 4) });
  assert.deepEqual([same?.tone, same?.headline], ["same", "About the same as yesterday by 14:47"]);
  assert.equal(compareSummary({ compare: compare(4, null) }), null);
  assert.equal(compareSummary({ compare: null }), null);
  assert.equal(compareSummary(null), null);
  const noGas = compareSummary({ compare: { until: "09:00", today: { electricity_kwh: 1, cost: 1 }, yesterday: { electricity_kwh: 2, gas_kwh: null, cost: 2 } } });
  assert.equal(noGas?.detail, "1.0 kWh vs 2.0 kWh electricity");
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

test("tooltip values: kWh and cost per fuel at the unit rates, nothing for hours without a reading", () => {
  const bars = hourlyBars([{ hour: 6, electricity_kwh: 1, gas_kwh: 2 }, { hour: 7, electricity_kwh: 0.5 }], rates);
  const tip = tipFor(bars[6], "GBP");
  assert.equal(tip?.title, "06:00");
  assert.deepEqual(tip?.lines.map((l) => l.text), ["Electricity 1.0 kWh · £0.27", "Gas 2.0 kWh · £0.12"]);
  assert.equal(tip?.total, "Total £0.38");
  assert.deepEqual(tipFor(bars[7])?.lines.map((l) => l.series), ["electricity"]);
  assert.equal(tipFor(bars[19]), null);
  const unpriced = tipFor(hourlyBars([{ hour: 1, electricity_kwh: 1 }])[1]);
  assert.deepEqual([unpriced?.lines[0].text, unpriced?.total], ["Electricity 1.0 kWh", null]);
});

test("daily bars fill the 7 dates up to the newest, empty days have no data, the newest is partial", () => {
  assert.equal(weekday("2026-11-16"), "Mon");
  assert.equal(addDays("2026-11-02", -3), "2026-10-30");
  const bars = dailyBars([
    { date: "2026-11-21", electricity_kwh: 11, electricity_cost: 3.4, total_cost: 3.4 },
    { date: "2026-11-20", electricity_kwh: 18, gas_kwh: 32, electricity_cost: 5.3, gas_cost: 2.2, total_cost: 7.51 },
  ]);
  assert.deepEqual(bars.map((b) => b.tick), ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  assert.deepEqual(bars.map((b) => b.key).slice(0, 2), ["2026-11-15", "2026-11-16"]);
  assert.deepEqual([bars[0].electricity, bars[0].totalCost, bars[0].partial], [null, null, false]);
  assert.deepEqual([bars[5].totalCost, bars[5].partial, bars[6].partial], [7.51, false, true]);
  assert.equal(bars[5].label, "Fri 20 Nov");
  assert.deepEqual(dailyBars([]), []);
  assert.equal(tipFor(bars[0]), null);
  assert.equal(tipFor(bars[6])?.title, "Sat 21 Nov so far");
});

test("the week's table lists days with data, newest first, today marked so far", () => {
  const bars = dailyBars([
    { date: "2026-11-21", electricity_kwh: 6.6, total_cost: 1.9 },
    { date: "2026-11-20", electricity_kwh: 18, gas_kwh: 32, total_cost: 7.51 },
  ]);
  assert.deepEqual(dayRows(bars, "GBP"), [
    { key: "2026-11-21", day: "Sat 21", electricity: "6.6 kWh", gas: DASH, cost: "£1.90", partial: true },
    { key: "2026-11-20", day: "Fri 20", electricity: "18.0 kWh", gas: "32.0 kWh", cost: "£7.51", partial: false },
  ]);
  assert.deepEqual(dayRows(dailyBars([])), []);
  assert.equal(costBasisNote("current_rates"), "Costs at today's rates, incl. standing charges");
  assert.equal(costBasisNote(undefined), null);
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
  const withCompare = mergeEnergy(next, { type: "energy", compare: { until: "10:00" }, hourly_yesterday: [], daily_cost_basis: "current_rates" });
  assert.deepEqual([withCompare.compare?.until, withCompare.hourly_yesterday, withCompare.daily_cost_basis], ["10:00", [], "current_rates"]);
  assert.equal(mergeEnergy(null, { today: { total_cost: 1 } }).today?.total_cost, 1);
});
