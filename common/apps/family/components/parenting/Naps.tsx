'use client';

// Nap tracking on the Sleep tab (docs/parenting-design.md "Nap tracking"): the one-tap timer, the next nap
// window, today's timeline with edit and delete, and the "help her settle" guide. Times come from the Mac
// (bridge/parentingNaps.mjs); nothing is kept on the phone.
import { useState, type ReactNode } from "react";
import { Link } from "@/common/apps/family/router";
import { Badge, SectionTitle, outlineBtn, primaryBtn, softBtn } from "@/common/apps/family/components/ui";
import { SourceList } from "@/common/apps/family/components/health/parts";
import { AdviceList, PointList } from "@/common/apps/family/components/parenting/parts";
import { Collapsible, nowCardStyle } from "@/common/apps/family/components/parenting/plan";
import Spinner from "@/common/apps/family/components/Spinner";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { HealthOfflineError } from "@/common/apps/family/lib/health";
import {
  MAX_DAYS_BACK, ParentingHttpError, SESSION_WHERE, barSpan, dayLabel, defaultSessionKind, downIso, fmtDuration, hm, isoOnDay, parentingApi, recentTime, researching, sleepDayBack, sleepToday, statusLine, useNow, windowPhase,
  type NapSlot, type ParentingData, type SessionKind, type SessionWhere, type SettleBlock, type SleepSession, type UseParenting,
} from "@/common/apps/family/lib/parenting";

const KIND_LABEL: Record<SessionKind, string> = { nap: "Nap", night: "Night" };
const SLOT_LABEL: Record<NapSlot, string> = { first: "After waking in the morning", between: "Between naps", before_bed: "Last nap to bedtime" };

/** The message for a failed write: the Mac's reason for a refusal (for example "she is already marked asleep"), else a generic one. */
function failure(e: unknown): string {
  if (e instanceof ParentingHttpError && (e.status === 400 || e.status === 409) && e.detail) return `Not saved: ${e.detail}`;
  return e instanceof HealthOfflineError ? "Could not reach the Mac, try again" : "Could not save that, try again";
}

/** Every button in the timer card shares this size (Anand, 2026-10-11: "still different size buttons"): the
 * primary button is `primaryBtn` and the toggle uses the same height, padding, font size and weight. */
const TOGGLE_BTN = "tap inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-full border-2 px-5 font-bold transition-colors";

/** A labelled time input; `min-w-0` lets three sit in one row at 390px. */
function TimeField({ label, ariaLabel, value, onChange }: { label: string; ariaLabel?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-sm font-semibold text-muted">{label}</span>
      <input type="time" aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} className="field !min-h-11 min-w-0" />
    </label>
  );
}

/** Put down, Asleep at and Woke at: three across when there is room, Put down full width above the other two on a phone. */
const TIMES_GRID = "grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 [&>*:first-child]:col-span-2 min-[420px]:[&>*:first-child]:col-span-1";

/** The one status card on the dashboard: how long she has been awake or asleep, the next nap, and "Put down" /
 * "Asleep at" / "Woke at" fields that default to now, so one tap starts or stops the timer and typing a time saves a past sleep. */
export function NapStatus({ p, data }: { p: UseParenting; data: ParentingData }) {
  const toast = useToast();
  const now = useNow();
  const pred = data.nap_prediction;
  const asleep = pred?.state === "asleep";
  const [kind, setKind] = useState<SessionKind>(defaultSessionKind());
  const [downT, setDownT] = useState<string>();
  const [fell, setFell] = useState<string>();
  const [woke, setWoke] = useState<string>();
  const [busy, setBusy] = useState(false);
  const open = asleep ? data.sleep_sessions.find((s) => s.id === pred?.open_session_id) : undefined;
  const downValue = downT ?? (open?.down ? hm(open.down) : "");
  const fellValue = fell ?? (open ? hm(open.start) : hm(new Date(now).toISOString()));
  const wokeValue = woke ?? (asleep ? hm(new Date(now).toISOString()) : "");
  const finished = !asleep && !!wokeValue;
  const startHm = fell || (open ? hm(open.start) : hm(new Date(now).toISOString()));
  const label = asleep ? "Woke up" : finished ? (kind === "night" ? "Save night" : "Save nap") : kind === "night" ? "She's asleep" : "Start nap";
  const sameTimes = finished && wokeValue === startHm;

  async function tap() {
    setBusy(true);
    try {
      if (asleep) {
        const startIso = open && fell ? isoOnDay(open.start, fell) : open?.start;
        const patch: Parameters<typeof parentingApi.sessionEdit>[2] = {};
        if (open && fell && fell !== hm(open.start)) patch.start = startIso;
        if (open && startIso && downT !== undefined && downT !== (open.down ? hm(open.down) : "")) patch.down = downT ? downIso(startIso, downT) : null;
        if (open && Object.keys(patch).length) await parentingApi.sessionEdit(p.ctx, open.id, patch);
        const end = woke && startIso ? isoOnDay(startIso, woke, woke <= hm(startIso) ? 1 : 0) : undefined;
        await parentingApi.sessionStop(p.ctx, end);
      } else if (finished) {
        const start = recentTime(startHm, now);
        await parentingApi.sessionStart(p.ctx, { kind, start, end: isoOnDay(start, wokeValue, wokeValue <= startHm ? 1 : 0), ...(downValue && { down: downIso(start, downValue) }) });
      } else if (downValue) {
        const start = recentTime(startHm, now);
        await parentingApi.sessionStart(p.ctx, { kind, start, down: downIso(start, downValue) });
      } else {
        await parentingApi.sessionStart(p.ctx, fell ? { kind, start: recentTime(fell, now) } : { kind });
      }
      setDownT(undefined);
      setFell(undefined);
      setWoke(undefined);
      await p.refresh();
    } catch (e) {
      toast.show({ message: failure(e), error: true });
    }
    setBusy(false);
  }

  return (
    <section className="card space-y-4 !p-4" aria-label="Sleep timer" data-testid="nap-status" style={nowCardStyle}>
      <div className="space-y-0.5">
        <p className="text-2xl font-extrabold leading-tight" data-testid="status-line">{statusLine(pred, now)}</p>
        {pred?.since && pred.state !== "unknown" && (
          <p className="text-sm text-muted">{[open && KIND_LABEL[open.kind], `since ${hm(pred.since)}`].filter(Boolean).join(" ")}</p>
        )}
      </div>
      <NextNap data={data} />
      {!asleep && (
        <div role="group" aria-label="Type of sleep" className="grid grid-cols-2 gap-2">
          {(["nap", "night"] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`${TOGGLE_BTN} ${kind === k ? "border-domain bg-domain/[0.12] text-domain" : "border-border bg-surface text-foreground/80 hover:bg-subtle"}`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      )}
      <div className={TIMES_GRID}>
        <TimeField label="Put down" value={downValue} onChange={setDownT} />
        <TimeField label="Asleep at" value={fellValue} onChange={setFell} />
        <TimeField label="Woke at" value={wokeValue} onChange={setWoke} />
      </div>
      <button type="button" disabled={busy || sameTimes} aria-busy={busy} onClick={() => void tap()} className={`${primaryBtn} w-full`}>
        {busy ? <><Spinner />Saving...</> : label}
      </button>
    </section>
  );
}

/** The next nap window and the suggested bedtime, inside the timer card. Hidden while she is asleep at
 * night (Anand, 2026-10-11); during a nap only the bedtime shows. */
export function NextNap({ data }: { data: ParentingData }) {
  const now = useNow();
  const p = data.nap_prediction;
  const naps = data.sleep_plan?.naps;
  const asleep = p?.state === "asleep";
  const open = asleep ? data.sleep_sessions.find((s) => s.id === p?.open_session_id) : undefined;
  if (asleep && (open?.kind === "night" || !p?.bedtime)) return null;
  const w = p?.state === "awake" ? p.window : null;
  const phase = w ? windowPhase(w, now) : null;
  const heading = asleep ? null : !p || p.state === "unknown" ? "Next nap window" : w ? (phase === "open" ? `Nap window is open until ${hm(w.end)}` : phase === "after" ? `The nap window has passed (${hm(w.start)} to ${hm(w.end)})` : `Next nap window ${hm(w.start)} to ${hm(w.end)}`) : "Next nap window";
  const basis = asleep ? null : p?.basis === "her_log" ? "From her last 2 weeks" : p?.basis === "guideline" ? (naps?.uncertain ? "General guide for her age, uncertain" : "General guide for her age") : null;
  const line = !p ? "Log when she wakes or goes to sleep to see the next nap window." : asleep || w ? null : p.note;
  return (
    <div className="space-y-1.5 border-t border-border pt-3" aria-label="Next nap" role="group" data-testid="next-nap">
      {heading && <p className="text-lg font-extrabold leading-snug" data-testid="next-nap-window">{heading}</p>}
      {basis && <p className="text-sm text-muted" data-testid="next-nap-basis">{basis}</p>}
      {line && <p className="text-muted">{line}</p>}
      {p?.bedtime && <p className="font-semibold" data-testid="bedtime-suggestion">Suggested bedtime {hm(p.bedtime.start)} to {hm(p.bedtime.end)}</p>}
      {!asleep && (
        <Link to="/nila/sleep?view=plan#settle" className="inline-flex min-h-11 items-center text-sm font-semibold text-domain underline">
          How to help her settle
        </Link>
      )}
    </div>
  );
}

const HOURS = ["06", "12", "18", "00", "06"];

/** One compact session line; tapping it opens the edit fields inline, with Save, Cancel and Delete. */
function SessionRow({ s, p }: { s: SleepSession; p: UseParenting }) {
  const toast = useToast();
  const now = useNow();
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [kind, setKind] = useState<SessionKind>(s.kind);
  const [downT, setDownT] = useState(s.down ? hm(s.down) : "");
  const [startT, setStartT] = useState(hm(s.start));
  const [endT, setEndT] = useState(s.end ? hm(s.end) : "");
  const [where, setWhere] = useState<string>(s.where ?? "");
  const [note, setNote] = useState(s.note ?? "");
  const [busy, setBusy] = useState(false);
  const mins = ((s.end ? Date.parse(s.end) : now) - Date.parse(s.start)) / 60_000;
  const label = `${KIND_LABEL[s.kind]} ${hm(s.start)}`;
  const toSleep = s.down ? Math.round((Date.parse(s.start) - Date.parse(s.down)) / 60_000) : 0;
  const meta = [s.end ? null : "still asleep", s.down && `Put down ${hm(s.down)}`, toSleep > 0 && `${toSleep} min to fall asleep`, s.where && SESSION_WHERE.find(([v]) => v === s.where)?.[1], s.note].filter(Boolean).join(" · ");

  async function save() {
    const patch: Parameters<typeof parentingApi.sessionEdit>[2] = {};
    if (kind !== s.kind) patch.kind = kind;
    if (startT !== hm(s.start)) patch.start = isoOnDay(s.start, startT);
    const startIso = patch.start ?? s.start;
    if (downT !== (s.down ? hm(s.down) : "")) patch.down = downT ? downIso(startIso, downT) : null;
    if (endT && endT !== (s.end ? hm(s.end) : "")) patch.end = isoOnDay(startIso, endT, endT <= hm(startIso) ? 1 : 0);
    if (where !== (s.where ?? "")) patch.where = where === "" ? null : (where as SessionWhere);
    if (note.trim() !== (s.note ?? "")) patch.note = note.trim();
    if (!Object.keys(patch).length) return setMode("view");
    setBusy(true);
    try {
      await parentingApi.sessionEdit(p.ctx, s.id, patch);
      await p.refresh();
      setMode("view");
    } catch (e) {
      toast.show({ message: failure(e), error: true });
    }
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    try {
      await parentingApi.sessionDelete(p.ctx, s.id);
      await p.refresh();
    } catch (e) {
      toast.show({ message: failure(e), error: true });
      setBusy(false);
    }
  }

  const open = mode !== "view";
  return (
    <li data-testid={open ? "session-edit" : "session"}>
      <button type="button" aria-label={`Edit ${label.toLowerCase()}`} aria-expanded={open} onClick={() => setMode(open ? "view" : "edit")} className="tap flex min-h-11 w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left">
        <span className="min-w-0 flex-1">
          <span className="block font-bold leading-snug">{KIND_LABEL[s.kind]} · {hm(s.start)} to {s.end ? hm(s.end) : "now"}</span>
          {meta && <span className="block truncate text-sm text-muted">{meta}</span>}
        </span>
        <span className="shrink-0 text-sm font-semibold text-muted">{fmtDuration(mins)}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-border px-3.5 pb-3.5 pt-3">
          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
            <label className="block min-w-0">
              <span className="mb-1 block text-sm font-semibold text-muted">Type</span>
              <select aria-label={`Type: ${label}`} value={kind} onChange={(e) => setKind(e.target.value as SessionKind)} className="field !min-h-11">
                <option value="nap">Nap</option>
                <option value="night">Night</option>
              </select>
            </label>
            <label className="block min-w-0">
              <span className="mb-1 block text-sm font-semibold text-muted">Where</span>
              <select aria-label={`Where: ${label}`} value={where} onChange={(e) => setWhere(e.target.value)} className="field !min-h-11">
                <option value="">Not set</option>
                {SESSION_WHERE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
          <div className={TIMES_GRID}>
            <TimeField label="Put down" ariaLabel={`Put down: ${label}`} value={downT} onChange={setDownT} />
            <TimeField label="Asleep at" ariaLabel={`Asleep at: ${label}`} value={startT} onChange={setStartT} />
            <TimeField label="Woke at" ariaLabel={`Woke at: ${label}`} value={endT} onChange={setEndT} />
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-muted">Note (optional)</span>
            <input type="text" aria-label={`Note: ${label}`} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className="field !min-h-11" />
          </label>
          {mode === "delete" ? (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Delete ${label.toLowerCase()}?`}>
              <p className="text-sm font-semibold">Delete this {s.kind}?</p>
              <button type="button" disabled={busy} onClick={() => void remove()} className={outlineBtn}>{busy ? <><Spinner />Deleting...</> : "Yes, delete"}</button>
              <button type="button" disabled={busy} onClick={() => setMode("edit")} className={outlineBtn}>Keep it</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy || !startT || startT === endT} onClick={() => void save()} className={primaryBtn}>{busy ? <><Spinner />Saving...</> : "Save"}</button>
              <button type="button" disabled={busy} onClick={() => setMode("view")} className={outlineBtn}>Cancel</button>
              <button type="button" disabled={busy} aria-label={`Delete ${label.toLowerCase()}`} onClick={() => setMode("delete")} className={outlineBtn}>Delete</button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}

/** The dashboard's region: a day switcher, the live status card (today only, passed as `top`), the 06:00 to 06:00
 * totals and bar, the night log (`middle`) and the day's sessions. `back` is how many days before today. */
export function SleepTimeline({ p, data, top, middle, back, onBack }: { p: UseParenting; data: ParentingData; top?: ReactNode; middle?: ReactNode; back: number; onBack: (n: number) => void }) {
  const now = useNow();
  const span = sleepDayBack(now, back);
  const day = sleepToday(data.sleep_sessions, now, span);
  const marker = ((now - day.start) / (day.end - day.start)) * 100;
  const tiles: [string, string][] = [["Day sleep", fmtDuration(day.dayMinutes)], ["Night sleep", fmtDuration(day.nightMinutes)], ["Naps", String(day.napCount)]];
  const arrow = "tap flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface transition-colors hover:bg-subtle disabled:opacity-40";
  return (
    <section className="space-y-3" aria-label="Today's sleep">
      <SectionTitle title="Today's sleep" />
      <div className="flex items-center justify-between gap-2">
        <button type="button" aria-label="Previous day" disabled={back >= MAX_DAYS_BACK} onClick={() => onBack(back + 1)} className={arrow}><Chevron dir="left" /></button>
        <p className="min-w-0 truncate text-center font-bold" aria-live="polite" data-testid="day-label">{dayLabel(back, day.start)}</p>
        <button type="button" aria-label="Next day" disabled={back <= 0} onClick={() => onBack(back - 1)} className={arrow}><Chevron dir="right" /></button>
      </div>
      {top}
      <dl className="grid grid-cols-3 gap-2" data-testid="sleep-totals">
        {tiles.map(([k, v]) => (
          <div key={k} className="card min-w-0 !px-3 !py-2.5">
            <dt className="text-sm text-muted">{k}</dt>
            <dd className="text-lg font-extrabold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="card space-y-1.5 !p-3.5">
        <div className="relative h-9 overflow-hidden rounded-full border border-border bg-subtle" role="img" aria-label={`Sleep timeline: ${day.napCount} ${day.napCount === 1 ? "nap" : "naps"}, day sleep ${fmtDuration(day.dayMinutes)}, night sleep ${fmtDuration(day.nightMinutes)}`} data-testid="sleep-bar">
          {day.sessions.map((s) => {
            const { left, width } = barSpan(s, day, now);
            return <div key={s.id} data-testid="bar-block" data-kind={s.kind} className={`absolute top-0 h-full ${s.kind === "nap" ? "bg-domain" : "bg-foreground/35"}`} style={{ left: `${left}%`, width: `${width}%` }} />;
          })}
          {marker >= 0 && marker <= 100 && <div className="absolute top-0 h-full w-0.5 bg-destructive" style={{ left: `${marker}%` }} aria-hidden />}
        </div>
        <div className="flex justify-between text-xs text-muted" aria-hidden>{HOURS.map((h, i) => <span key={i}>{h}</span>)}</div>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted"><span><span aria-hidden className="mr-1 inline-block h-2 w-2 rounded-full bg-domain" />Nap</span><span><span aria-hidden className="mr-1 inline-block h-2 w-2 rounded-full bg-foreground/35" />Night</span></p>
      </div>
      {middle}
      {day.sessions.length > 0 ? (
        <ul className="card card--flush divide-y divide-border" aria-label="Today's sessions">
          {day.sessions.map((s) => <SessionRow key={`${s.id}-${s.start}-${s.end}-${s.down}-${s.kind}-${s.where}-${s.note}`} s={s} p={p} />)}
        </ul>
      ) : (
        <p className="card !px-4 !py-3.5 text-muted" data-testid="no-sessions">{back === 0 ? "Nothing logged since 06:00. Tap the button above when she falls asleep." : "Nothing logged for this day."}</p>
      )}
    </section>
  );
}

function SettleBlockView({ title, block, id }: { title: string; block?: SettleBlock; id: string }) {
  if (!block) return null;
  return (
    <Collapsible title={title} open>
      <div className="card space-y-3 !p-4" data-testid={id}>
        {!!block.signs?.length && <div><p className="text-sm font-bold text-domain">Signs</p><PointList label={`Signs: ${title}`} items={block.signs.map((text) => ({ text }))} /></div>}
        {!!block.do?.length && <div><p className="text-sm font-bold text-domain">Do</p><AdviceList label={`Do: ${title}`} good items={block.do.map((text) => ({ text }))} /></div>}
        {!!block.dont?.length && <div><p className="text-sm font-bold text-domain">Don't</p><AdviceList label={`Don't: ${title}`} good={false} items={block.dont.map((text) => ({ text }))} /></div>}
        <SourceList sources={block.sources} />
      </div>
    </Collapsible>
  );
}

/** "Help her settle": tired signs, then what to do when she is on the edge or still playful, and the nap guide behind it. */
export function SettleGuide({ p, data }: { p: UseParenting; data: ParentingData }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const plan = data.sleep_plan;
  const wd = plan?.wind_down;
  const naps = plan?.naps;
  const running = researching(data, "naps");

  async function ask() {
    setBusy(true);
    try {
      await parentingApi.napsRefresh(p.ctx);
      toast.show({ message: "Guide on its way" });
      await p.refresh();
    } catch (e) {
      toast.show({ message: e instanceof HealthOfflineError ? "Could not reach the Mac, try again" : "Could not ask for the guide, try again", error: true });
    }
    setBusy(false);
  }
  const button = (label: string, outline = false) => (
    <button type="button" disabled={busy || running} onClick={() => void ask()} className={outline ? `${outlineBtn} w-full` : `${softBtn} w-full`}>
      {(busy || running) && <Spinner />}{running ? "Writing the guide…" : busy ? "Asking..." : label}
    </button>
  );

  return (
    <section id="settle" className="space-y-3" aria-label="Help her settle">
      <SectionTitle title="Help her settle" />
      {!wd ? (
        <div className="card space-y-2 !p-4 text-center" data-testid="settle-empty">
          <p className="text-lg font-extrabold">No settle guide yet</p>
          <p className="text-muted">The Mac can research how to help her settle for naps and bedtime at her age, and write a nap guide fitted to her history.</p>
          {button("Get the guide")}
        </div>
      ) : (
        <>
          {!!wd.tired_signs?.length && (
            <div className="card !px-3.5 !py-2.5" data-testid="tired-signs">
              <p className="text-sm font-bold text-domain">Tired signs</p>
              <PointList label="Tired signs" items={wd.tired_signs.map((text) => ({ text }))} />
            </div>
          )}
          <SettleBlockView title="On the edge, crying" block={wd.on_edge} id="settle-edge" />
          <SettleBlockView title="Still playful" block={wd.still_playful} id="settle-playful" />
          {!!wd.for_her?.length && (
            <div className="card !px-3.5 !py-2.5" data-testid="settle-for-her">
              <p className="text-sm font-bold text-domain">For Nila</p>
              <PointList label="For Nila" items={wd.for_her.map((text) => ({ text }))} />
            </div>
          )}
        </>
      )}
      {naps && (
        <Collapsible title="The nap guide for her age">
          <div className="card space-y-2 !p-4" data-testid="naps-guide">
            {naps.uncertain && <Badge tone="gold">Uncertain</Badge>}
            {naps.age_note && <p className="font-semibold">{naps.age_note}</p>}
            <ul className="space-y-1 text-[0.95rem]">
              {naps.naps_per_day && <li>Naps a day: {naps.naps_per_day}</li>}
              {(naps.wake_windows ?? []).map((w) => <li key={w.slot}>{SLOT_LABEL[w.slot]}: {fmtDuration(w.min_minutes)} to {fmtDuration(w.max_minutes)} awake</li>)}
              {naps.day_sleep_hours && <li>Day sleep: {naps.day_sleep_hours} hours</li>}
              {naps.total_sleep_hours && <li>Total sleep: {naps.total_sleep_hours} hours</li>}
            </ul>
            {naps.why && <p className="text-[0.95rem] text-muted">{naps.why}</p>}
            <SourceList sources={naps.sources} />
          </div>
        </Collapsible>
      )}
      {wd && button("Refresh nap guide", true)}
    </section>
  );
}
