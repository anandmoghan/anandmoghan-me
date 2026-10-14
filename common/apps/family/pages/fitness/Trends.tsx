'use client';

import type { ReactNode } from "react";
import { Link, useSearchParams } from "@/common/apps/family/router";
import { SectionTitle, Segmented } from "@/common/apps/family/components/ui";
import { Sparkline } from "@/common/apps/family/components/health/parts";
import { BarChart, Legend, LineChart, type Band, type Ghost, type XAxis } from "@/common/apps/family/components/fitness/Charts";
import { APPLE_HEALTH_STEPS } from "@/common/apps/family/components/fitness/parts";
import { useHealth } from "@/common/apps/family/lib/health";
import {
  WINDOWS, bpReadings, bucketed, dailySeries, dayKey, dayMs, dayOf, fmtDay, fmtNum, inWindow, labReadings, latestPoint, parseWindow, rollingAverage, trendWindow,
  type FitnessData, type Point, type Target, type TrendWindow, type WindowKey,
} from "@/common/apps/family/lib/fitness";
import type { Person } from "@/common/apps/family/types";

const DAY = 86400000;

interface ChartCardProps {
  title: string; latest?: string; children?: ReactNode; foot?: ReactNode;
  /** No reading of this metric at all. */
  empty: string | null;
  /** Readings exist, but none inside the chosen window. */
  outside?: { widen: boolean; last?: string };
}

function ChartCard({ title, latest, empty, outside, children, foot }: ChartCardProps) {
  return (
    <section className="card min-w-0 space-y-2 !p-4" aria-label={title}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-extrabold">{title}</h3>
        {latest && <p className="shrink-0 text-sm font-bold text-domain" data-testid="chart-latest">{latest}</p>}
      </div>
      {empty ? <p className="py-6 text-center text-sm text-muted">{empty}</p> : (
        <>
          {outside && <p className="text-sm text-muted" data-testid="window-empty">No readings in this window.{outside.widen ? " Try a longer window." : ""}</p>}
          {children}
          {outside?.last && <p className="text-sm text-muted" data-testid="last-reading">Last reading {outside.last}.</p>}
          {foot}
        </>
      )}
    </section>
  );
}

/** A target for the metric, as a shaded band on its chart. */
function bandFor(targets: Target[], metric: string): Band | undefined {
  const t = targets.find((x) => x.metric === metric);
  if (!t) return undefined;
  if (t.op === "lt" || t.op === "lte") return { to: t.value };
  if (t.op === "gt" || t.op === "gte") return { from: t.value };
  return { from: t.value, to: t.value2 ?? t.value };
}


export default function Trends({ person, data }: { person: Person; data: FitnessData }) {
  const h = useHealth(person);
  const [params, setParams] = useSearchParams();
  const key = parseWindow(params.get("w"));
  const today = dayKey();
  const all = (metric: string) => dailySeries(data.measurements, metric);
  const earliest = data.measurements.map((m) => dayOf(m.at)).sort()[0];
  const w: TrendWindow = trendWindow(key, today, earliest);
  const x: XAxis = { t0: dayMs(w.from) - DAY / 2, t1: dayMs(w.to) + DAY / 2, ticks: w.ticks.map((t) => ({ t: dayMs(t.day), label: t.label })) };
  const targets = data.plan?.targets ?? [];
  const lastImport = [...data.imports].sort((a, b) => (b.imported_at ?? "").localeCompare(a.imported_at ?? ""))[0];

  function setWindow(k: WindowKey) {
    const q = new URLSearchParams(params);
    q.set("w", k);
    setParams(q, { replace: true });
  }

  const dated = (day: string) => fmtDay(day, day.slice(0, 4) !== today.slice(0, 4));
  /** One metric: its points inside the window, the latest reading whatever the window, and what to show when the window is empty. */
  function view(pts: Point[], fmt: (v: number) => string) {
    const inW = inWindow(pts, w);
    const l = latestPoint(pts);
    const missing = inW.length === 0;
    return {
      inW,
      latest: l ? `${fmt(l.v)}, ${dated(l.day)}` : undefined,
      ghost: missing && l ? ({ v: l.v } satisfies Ghost) : undefined,
      outside: missing && l ? { widen: w.key !== "all", last: `${fmt(l.v)} on ${dated(l.day)}` } : undefined,
    };
  }

  const weightAll = all("weight_kg");
  const weightV = view(weightAll, (v) => `${fmtNum(v)} kg`);
  const weightAvg = inWindow(rollingAverage(weightAll), w);
  const waistV = view(all("waist_cm"), (v) => `${fmtNum(v)} cm`);
  const fatV = view(all("body_fat_pct"), (v) => `${fmtNum(v)}%`);
  const visceralV = view(all("visceral_fat"), (v) => fmtNum(v));
  const rhrV = view(all("resting_hr"), (v) => `${Math.round(v)} bpm`);
  const hrvV = view(all("hrv_ms"), (v) => `${Math.round(v)} ms`);
  const vo2V = view(all("vo2max"), (v) => fmtNum(v));
  const stepsV = view(all("steps"), (v) => `${fmtNum(v, 0)} steps`);
  const kcalV = view(all("active_kcal"), (v) => `${fmtNum(v, 0)} kcal`);
  const sleepV = view(all("sleep_h"), (v) => `${fmtNum(v)} h`);
  const rhr = bucketed(rhrV.inW, w);
  const hrv = bucketed(hrvV.inW, w);
  const steps = bucketed(stepsV.inW, w);
  const kcal = bucketed(kcalV.inW, w);
  const sleep = bucketed(sleepV.inW, w);
  const avgNote = w.weekly ? "Weekly average" : "Daily";
  const bpAll = bpReadings(data.measurements);
  const bp = bpAll.filter((m) => dayOf(m.at) >= w.from && dayOf(m.at) <= w.to);
  const sysPts = bp.map((m) => ({ day: dayOf(m.at), t: dayMs(dayOf(m.at)), v: m.sys as number }));
  const diaPts = bp.map((m) => ({ day: dayOf(m.at), t: dayMs(dayOf(m.at)), v: m.dia as number }));
  const runsAll = data.bp_protocols.filter((r) => r.status === "done" && typeof r.avg_sys === "number");
  const runDay = (r: (typeof runsAll)[number]) => dayOf(r.end ?? r.start ?? r.id);
  const runs = runsAll.filter((r) => runDay(r) >= w.from && runDay(r) <= w.to);
  const runPts = (k: "avg_sys" | "avg_dia") => runs.map((r) => { const d = runDay(r); return { day: d, t: dayMs(d), v: r[k] as number }; }).sort((a, b) => a.t - b.t);
  const bpLast = bpAll[bpAll.length - 1];
  const bpLatest = runsAll.length
    ? (() => { const r = [...runsAll].sort((a, b) => runDay(a).localeCompare(runDay(b)))[runsAll.length - 1]; return `${Math.round(r.avg_sys as number)}/${Math.round(r.avg_dia as number)} average, ${dated(runDay(r))}`; })()
    : bpLast ? `${bpLast.sys}/${bpLast.dia}, ${dated(dayOf(bpLast.at))}` : undefined;
  const bpOutside = bp.length === 0 && runs.length === 0 && bpLatest ? { widen: w.key !== "all", last: bpLatest } : undefined;
  const stepTarget = data.plan?.checklist?.find((c) => c.id === "steps")?.target;
  const sleepTarget = data.plan?.checklist?.find((c) => c.id === "sleep")?.target;
  const labTargets = targets.filter((t) => t.kind === "lab");
  const watchEmpty = (what: string) => `No ${what} yet. In the iPhone Health app tap your profile picture, then Export All Health Data, and AirDrop it to the Mac.`;
  const logEmpty = (what: string) => `No ${what} yet. Log one from Today, or AirDrop an Apple Health export.`;
  const windowLabel = WINDOWS.find(([k]) => k === key)?.[1] ?? "";

  return (
    <div className="space-y-8">
      {data.measurements.length === 0 ? (
        <section className="card space-y-2 !p-5" data-testid="trends-empty">
          <p className="text-lg font-extrabold">No measurements yet</p>
          <p className="text-muted">{APPLE_HEALTH_STEPS}</p>
          <p className="text-muted">Weight, waist and blood pressure can also be logged by hand from Today.</p>
        </section>
      ) : (
        <div className="space-y-3">
          <Segmented scroll label="Time window" value={key} onChange={setWindow} options={WINDOWS} />
          <p className="text-sm text-muted" data-testid="window-note">
            {key === "all" ? "Showing all readings." : `Showing the last ${windowLabel.toLowerCase()}.`} {lastImport?.imported_at ? `Apple Health last imported ${fmtDay(lastImport.imported_at, true)}.` : "No Apple Health import yet."}
          </p>
        </div>
      )}

      <section className="space-y-3" aria-label="Body">
        <SectionTitle title="Body" />
        <div className="grid gap-3 md:grid-cols-2">
          <ChartCard title="Weight" latest={weightV.latest} empty={weightAll.length ? null : logEmpty("weight readings")} outside={weightV.outside}
            foot={<Legend items={[{ tone: "muted", label: "Daily" }, { tone: "domain", label: "7-day average" }]} />}>
            <LineChart label="Weight over time" x={x} ghost={weightV.ghost} band={bandFor(targets, "weight_kg")} series={[{ points: weightV.inW, kind: "dots", tone: "muted" }, { points: weightAvg, kind: "line", tone: "domain" }]} />
          </ChartCard>
          <ChartCard title="Waist" latest={waistV.latest} empty={waistV.latest ? null : logEmpty("waist measurements")} outside={waistV.outside}>
            <LineChart label="Waist over time" x={x} ghost={waistV.ghost} band={bandFor(targets, "waist_cm")} series={[{ points: waistV.inW, kind: "line-dots", tone: "domain" }]} />
          </ChartCard>
          <ChartCard title="Body fat" latest={fatV.latest} empty={fatV.latest ? null : logEmpty("body fat readings")} outside={fatV.outside}>
            <LineChart label="Body fat over time" x={x} ghost={fatV.ghost} band={bandFor(targets, "body_fat_pct")} series={[{ points: fatV.inW, kind: "line-dots", tone: "domain" }]} />
          </ChartCard>
          <ChartCard title="Visceral fat" latest={visceralV.latest} empty={visceralV.latest ? null : logEmpty("visceral fat readings")} outside={visceralV.outside}>
            <LineChart label="Visceral fat over time" x={x} ghost={visceralV.ghost} digits={0} band={bandFor(targets, "visceral_fat")} series={[{ points: visceralV.inW, kind: "line-dots", tone: "domain" }]} />
          </ChartCard>
        </div>
      </section>

      <section className="space-y-3" aria-label="Heart">
        <SectionTitle title="Heart" />
        <div className="grid gap-3 md:grid-cols-2">
          <ChartCard title="Blood pressure" latest={bpLatest} outside={bpOutside}
            empty={bpAll.length || runsAll.length ? null : "No blood pressure readings yet. Start a 7-day check from Today."}
            foot={<Legend items={[{ tone: "health", label: "Top (systolic)" }, { tone: "gold", label: "Bottom (diastolic)" }, ...(runs.length ? [{ tone: "domain" as const, label: "7-day check averages" }] : [])]} />}>
            <LineChart label="Blood pressure over time" x={x} digits={0} series={[
              { points: sysPts, kind: "dots", tone: "health" }, { points: diaPts, kind: "dots", tone: "gold" },
              { points: runPts("avg_sys"), kind: "line-dots", tone: "domain", r: 4 }, { points: runPts("avg_dia"), kind: "line-dots", tone: "domain", r: 4 },
            ]} />
          </ChartCard>
          <ChartCard title="Resting heart rate" latest={rhrV.latest} empty={rhrV.latest ? null : watchEmpty("resting heart rate")} outside={rhrV.outside}
            foot={<p className="text-sm text-muted">{avgNote}.</p>}>
            <LineChart label={w.weekly ? "Resting heart rate, weekly average" : "Resting heart rate, daily"} x={x} ghost={rhrV.ghost} digits={0} series={[{ points: rhr, kind: w.weekly ? "line-dots" : "dots", tone: "domain", r: 3.5 }]} />
          </ChartCard>
          <ChartCard title="Heart rate variability" latest={hrvV.latest} empty={hrvV.latest ? null : watchEmpty("heart rate variability")} outside={hrvV.outside}
            foot={<p className="text-sm text-muted">{avgNote}, in milliseconds. Higher usually means better recovery.</p>}>
            <LineChart label={w.weekly ? "Heart rate variability, weekly average" : "Heart rate variability, daily"} x={x} ghost={hrvV.ghost} digits={0} series={[{ points: hrv, kind: w.weekly ? "line-dots" : "dots", tone: "domain", r: 3.5 }]} />
          </ChartCard>
          <ChartCard title="VO2 max" latest={vo2V.latest} empty={vo2V.latest ? null : watchEmpty("VO2 max estimates")} outside={vo2V.outside}
            foot={<p className="text-sm text-muted">Apple Watch estimates, ml/kg/min.</p>}>
            <LineChart label="VO2 max over time" x={x} ghost={vo2V.ghost} series={[{ points: vo2V.inW, kind: "dots", tone: "domain", r: 3.5 }]} />
          </ChartCard>
        </div>
      </section>

      <section className="space-y-3" aria-label="Activity and sleep">
        <SectionTitle title="Activity and sleep" />
        <div className="grid gap-3 md:grid-cols-2">
          <ChartCard title="Steps" latest={stepsV.latest} empty={stepsV.latest ? null : watchEmpty("steps")} outside={stepsV.outside}
            foot={<p className="text-sm text-muted">{avgNote}{stepTarget ? `, dashed line at ${fmtNum(stepTarget, 0)}` : ""}.</p>}>
            <BarChart label={w.weekly ? "Steps, weekly average" : "Steps, daily"} points={steps} slotDays={w.bucket} x={x} ghost={stepsV.ghost} target={stepTarget} />
          </ChartCard>
          <ChartCard title="Active calories" latest={kcalV.latest} empty={kcalV.latest ? null : watchEmpty("active calories")} outside={kcalV.outside}
            foot={<p className="text-sm text-muted">{avgNote}, kilocalories burned by moving.</p>}>
            <BarChart label={w.weekly ? "Active calories, weekly average" : "Active calories, daily"} points={kcal} slotDays={w.bucket} x={x} ghost={kcalV.ghost} />
          </ChartCard>
          <ChartCard title="Sleep" latest={sleepV.latest} empty={sleepV.latest ? null : watchEmpty("sleep")} outside={sleepV.outside}
            foot={<p className="text-sm text-muted">{avgNote}{sleepTarget ? `, dashed line at ${fmtNum(sleepTarget)} h` : ""}.</p>}>
            <BarChart label={w.weekly ? "Sleep, weekly average" : "Sleep, daily"} points={sleep} slotDays={w.bucket} x={x} ghost={sleepV.ghost} target={sleepTarget} digits={1} />
          </ChartCard>
        </div>
      </section>

      {labTargets.length > 0 && (
        <section className="space-y-3" aria-label="Lab markers">
          <div className="flex items-end justify-between gap-3">
            <SectionTitle title="Lab markers" />
            <Link to={`/health?p=${person}&tab=results`} className="inline-flex min-h-11 items-center text-sm font-semibold text-domain underline underline-offset-2">All results</Link>
          </div>
          <ul className="card card--flush divide-y divide-border">
            {labTargets.map((t) => {
              const rs = labReadings(t, h.data?.reports ?? []);
              const nums = [...rs].reverse().map((r) => r.value);
              return (
                <li key={t.id} className="flex items-center gap-3 p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold leading-snug">{t.label}</p>
                    <p className="text-sm text-muted">{rs[0] ? `${rs[0].display}${rs[0].date ? `, ${fmtDay(rs[0].date, true)}` : ""}${rs[0].needsRepeat ? ", needs repeat" : ""}` : h.status === "loading" ? "Loading" : "No result yet"}</p>
                  </div>
                  {nums.length >= 2 && <Sparkline values={nums} />}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
