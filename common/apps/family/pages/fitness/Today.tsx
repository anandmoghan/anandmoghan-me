'use client';

import { useEffect, useRef, useState } from "react";
import { Link } from "@/common/apps/family/router";
import { Badge, SectionTitle, outlineBtn, primaryBtn, softBtn } from "@/common/apps/family/components/ui";
import { NoPlan, usePlanRequest } from "@/common/apps/family/components/fitness/parts";
import QuickLog, { type LogMode } from "@/common/apps/family/components/fitness/QuickLog";
import Spinner from "@/common/apps/family/components/Spinner";
import { useToast } from "@/common/apps/family/hooks/useToast";
import {
  BP_DAYS, BP_PER_SESSION, activeRun, dayKey, dayMs, fitnessApi, fmtDay, fmtNum, dailySeries, fromWatch, itemMet, itemMetric, itemValue, latestPoint, lastDays, lastDoneRun, lastSynced,
  protocolToday, stepFor, weeklyAdherence, type BpRun, type ChecklistItem, type FitnessData, type UseFitness,
} from "@/common/apps/family/lib/fitness";
import { timeAgo } from "@/common/apps/family/lib/format";
import type { Person } from "@/common/apps/family/types";

type Value = boolean | number | undefined;

function Tick({ on, label, onChange }: { on: boolean; label: string; onChange: (on: boolean) => void }) {
  return (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} aria-label={label} className="peer absolute inset-0 h-11 w-11 cursor-pointer opacity-0" />
      <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-foreground/35 text-sm font-bold text-domain-foreground peer-checked:border-domain peer-checked:bg-domain peer-focus-visible:outline peer-focus-visible:outline-2">{on ? "✓" : ""}</span>
    </span>
  );
}

function Progress({ value, target }: { value: number; target: number | undefined }) {
  if (!target) return null;
  return (
    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-subtle" aria-hidden>
      <span className="block h-full rounded-full bg-domain" style={{ width: `${Math.min(100, (value / target) * 100)}%` }} />
    </span>
  );
}

function ItemRow({ item, value, onChange, lastSeen }: { item: ChecklistItem; value: Value; onChange: (v: boolean | number) => void; lastSeen?: string }) {
  const met = itemMet(item, value);
  const unit = item.unit ? ` ${item.unit}` : "";
  const digits = item.unit === "steps" ? 0 : 2;
  if (item.kind === "bool") {
    return (
      <li className="flex items-center gap-3 px-3 py-1.5" data-testid="check-item">
        <Tick on={value === true} label={item.label} onChange={onChange} />
        <p className={`min-w-0 flex-1 font-bold ${value === true ? "text-muted line-through" : ""}`}>{item.label}</p>
      </li>
    );
  }
  const n = typeof value === "number" ? value : 0;
  return (
    <li className="flex items-center gap-3 px-3 py-2.5" data-testid="check-item">
      <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-sm font-bold ${met ? "border-domain bg-domain text-domain-foreground" : "border-foreground/20"}`}>{met ? "✓" : ""}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-snug">{item.label}</p>
        <p className="text-sm text-muted" data-testid={`value-${item.id}`}>
          {typeof value === "number" || !fromWatch(item)
            ? item.target ? `${fmtNum(n, digits)} of ${fmtNum(item.target, digits)}${unit}` : `${fmtNum(n, digits)}${unit}`
            : `No reading yet today${lastSeen ? `. Last reading ${lastSeen}` : ""}${item.target ? `, aim for ${fmtNum(item.target, digits)}${unit}` : ""}`}
        </p>
        <Progress value={n} target={item.target} />
      </div>
      {fromWatch(item) ? (
        <Badge tone="muted">Apple Health</Badge>
      ) : (
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" aria-label={`Less ${item.label.toLowerCase()}`} onClick={() => onChange(Math.max(0, +(n - stepFor(item)).toFixed(2)))} className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-xl font-bold hover:bg-subtle">−</button>
          <button type="button" aria-label={`More ${item.label.toLowerCase()}`} onClick={() => onChange(+(n + stepFor(item)).toFixed(2))} className="flex h-11 w-11 items-center justify-center rounded-full bg-domain/[0.14] text-xl font-bold text-domain hover:bg-domain/[0.22]">+</button>
        </div>
      )}
    </li>
  );
}

const DEBOUNCE_MS = 600;

function Checklist({ person, f, data, today }: { person: Person; f: UseFitness; data: FitnessData; today: string }) {
  const toast = useToast();
  const items = data.plan?.checklist ?? [];
  const [local, setLocal] = useState<Record<string, boolean | number>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  async function post(id: string, v: boolean | number) {
    try {
      await fitnessApi.checkin(f.ctx, person, today, { [id]: v });
      await f.refresh();
    } catch {
      toast.show({ message: "Could not save that, try again", error: true });
    }
    setLocal((l) => {
      if (l[id] !== v) return l;
      const rest = { ...l };
      delete rest[id];
      return rest;
    });
  }

  function change(item: ChecklistItem, v: boolean | number) {
    setLocal((l) => ({ ...l, [item.id]: v }));
    clearTimeout(timers.current[item.id]);
    // Ticks save at once; steppers wait for the taps to settle so a run of taps is one save.
    if (item.kind === "bool") void post(item.id, v);
    else timers.current[item.id] = setTimeout(() => void post(item.id, v), DEBOUNCE_MS);
  }

  /** The newest Apple Health reading of a watch item, for when today has none yet. */
  const lastSeen = (i: ChecklistItem) => {
    const p = latestPoint(dailySeries(data.measurements, itemMetric(i)));
    return p ? `${fmtNum(p.v, i.unit === "steps" ? 0 : 2)}${i.unit ? ` ${i.unit}` : ""} on ${fmtDay(p.day)}` : undefined;
  };
  const value = (i: ChecklistItem): Value => (i.id in local ? local[i.id] : itemValue(i, today, data));
  const done = items.filter((i) => itemMet(i, value(i))).length;

  return (
    <section className="space-y-2.5" aria-label="Checklist">
      <div className="flex items-end justify-between gap-3">
        <SectionTitle title="Checklist" />
        <p className="text-sm font-bold text-domain" data-testid="done-today">{done} of {items.length} done</p>
      </div>
      <ul className="card card--flush divide-y divide-border">
        {items.map((i) => <ItemRow key={i.id} item={i} value={value(i)} lastSeen={fromWatch(i) ? lastSeen(i) : undefined} onChange={(v) => change(i, v)} />)}
      </ul>
    </section>
  );
}

function Adherence({ data, today }: { data: FitnessData; today: string }) {
  const score = weeklyAdherence(data.plan, data, today);
  if (!score) return null;
  const items = data.plan?.checklist ?? [];
  const days = lastDays(today, 7);
  return (
    <section className="card space-y-3 !p-4" aria-label="This week">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-extrabold">This week</h2>
        <p className="text-2xl font-extrabold text-domain" data-testid="adherence">{score.pct}%</p>
      </div>
      <div className="flex items-end gap-1.5" aria-hidden>
        {days.map((d) => {
          const met = items.filter((i) => itemMet(i, itemValue(i, d, data))).length;
          const share = items.length ? met / items.length : 0;
          return (
            <div key={d} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="flex h-14 w-full items-end overflow-hidden rounded-lg bg-subtle">
                <div className="w-full rounded-lg bg-domain" style={{ height: `${Math.max(share * 100, share ? 8 : 0)}%`, opacity: d === today ? 1 : 0.7 }} />
              </div>
              <span className={`text-xs ${d === today ? "font-bold text-foreground" : "text-muted"}`}>{new Date(dayMs(d)).toLocaleDateString("en-GB", { weekday: "narrow" })}</span>
            </div>
          );
        })}
      </div>
      <p className="text-sm text-muted">{score.met} of {score.total} checklist ticks over the last 7 days.</p>
    </section>
  );
}

function BpCard({ person, f, data, today, onLog }: { person: Person; f: UseFitness; data: FitnessData; today: string; onLog: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const run = activeRun(data.bp_protocols);
  const last = lastDoneRun(data.bp_protocols);

  async function act(action: "start" | "stop") {
    setBusy(true);
    try {
      await fitnessApi.bpProtocol(f.ctx, person, action);
      toast.show({ message: action === "start" ? "Blood pressure check started" : "Blood pressure check stopped" });
      await f.refresh();
    } catch {
      toast.show({ message: "Could not reach the Mac, try again", error: true });
    }
    setConfirmStop(false);
    setBusy(false);
  }

  const avg = (r: BpRun) => `${Math.round(r.avg_sys ?? 0)}/${Math.round(r.avg_dia ?? 0)}`;
  return (
    <section className="card space-y-3 !p-4" aria-label="Blood pressure check" data-testid="bp-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">Blood pressure check</h2>
        {run && <Badge tone="accent">Running</Badge>}
      </div>
      {run ? <RunningRun run={run} data={data} today={today} /> : (
        <p className="text-muted">Seven days at home: two readings each morning and evening. Day 1 is left out of the average, as the guidelines advise.</p>
      )}
      {last && !run && (
        <p className="rounded-xl bg-subtle px-3 py-2.5" data-testid="bp-average">
          Last check: <strong>{avg(last)} mmHg</strong> average{last.end ? `, finished ${fmtDay(last.end)}` : ""}{last.discarded_day1 !== false ? ". Day 1 discarded." : "."}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {run ? (
          <>
            <button type="button" onClick={onLog} className={softBtn}>Log readings</button>
            {confirmStop ? (
              <>
                <button type="button" disabled={busy} onClick={() => void act("stop")} className={`${outlineBtn} text-destructive`}>{busy ? <><Spinner />Stopping...</> : "Yes, stop"}</button>
                <button type="button" onClick={() => setConfirmStop(false)} className={outlineBtn}>Keep going</button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmStop(true)} className={outlineBtn}>Stop</button>
            )}
          </>
        ) : (
          <button type="button" disabled={busy} onClick={() => void act("start")} className={softBtn}>{busy ? <><Spinner />Starting...</> : "Start 7-day check"}</button>
        )}
      </div>
    </section>
  );
}

function RunningRun({ run, data, today }: { run: BpRun; data: FitnessData; today: string }) {
  const p = protocolToday(run, data.measurements, today);
  return (
    <div className="space-y-2">
      <p className="text-xl font-extrabold" data-testid="bp-day">Day {p.day} of {BP_DAYS}</p>
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: BP_DAYS }, (_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < p.day ? "bg-domain" : "bg-subtle"}`} />)}
      </div>
      <p data-testid="bp-left">
        {p.left === 0 ? "All four readings done today." : `${p.left} ${p.left === 1 ? "reading" : "readings"} left today`}
        <span className="text-muted"> (morning {p.am} of {BP_PER_SESSION}, evening {p.pm} of {BP_PER_SESSION})</span>
      </p>
      {p.day === 1 && <p className="text-sm text-muted">Today's readings are practice: day 1 is left out of the average.</p>}
    </div>
  );
}

function ConnectCard({ person, data }: { person: Person; data: FitnessData }) {
  const last = lastSynced(data.ingest_keys);
  return (
    <Link to={`/fitness/connect?p=${person}`} className="card flex min-h-14 items-center gap-3 !p-4 hover:bg-subtle" data-testid="connect-card">
      <span className="min-w-0 flex-1">
        <span className="block font-bold">Connect Apple Health</span>
        <span className="block text-sm text-muted" data-testid="last-synced">{last ? `Last synced ${timeAgo(last)} (${fmtDay(last)})` : "Not connected"}</span>
      </span>
      <span aria-hidden className="text-xl font-bold text-domain">›</span>
    </Link>
  );
}

export default function Today({ person, f, data }: { person: Person; f: UseFitness; data: FitnessData }) {
  const today = dayKey();
  const [log, setLog] = useState<LogMode | null>(null);
  const plan = usePlanRequest(f, person);
  const run = activeRun(data.bp_protocols);

  function saved() {
    setLog(null);
    void f.refresh();
  }

  return (
    <div className="space-y-6">
      {data.plan?.checklist?.length ? <Checklist person={person} f={f} data={data} today={today} /> : <NoPlan person={person} onRequest={() => void plan.request()} busy={plan.busy || plan.sent} />}
      <button type="button" onClick={() => setLog("all")} className={`${primaryBtn} w-full sm:w-auto`}>Log weight, waist or blood pressure</button>
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <BpCard person={person} f={f} data={data} today={today} onLog={() => setLog("bp")} />
        <Adherence data={data} today={today} />
      </div>
      <ConnectCard person={person} data={data} />
      <QuickLog open={log !== null} mode={log ?? "all"} onClose={() => setLog(null)} onSaved={saved} ctx={f.ctx} person={person} run={run} />
    </div>
  );
}
