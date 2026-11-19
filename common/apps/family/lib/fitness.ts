// Client for the family API's /family/fitness routes (docs/fitness-design.md, "Bridge API"), plus the sums the Fitness
// pages need (target status, checklist adherence, the 7-day BP protocol, rolling averages). Fitness data lives
// on the Mac; the plan, check-ins, measurements and BP runs also have a read copy in Firestore (lib/views.ts), so
// the pages load without the Mac. Device and key management and every action go to the Mac, with the Firebase ID
// token. Nothing is kept in localStorage, sessionStorage or IndexedDB.
import { FAMILY_API } from "@/common/api/config";
import { useCallback, useMemo } from "react";
import {
  API_TIMEOUT_MS, HealthHttpError, HealthOfflineError, numericOf, reportTime, useHealthApi,
  type HealthCtx, type LabResult, type Report, type Source,
} from "@/common/apps/family/lib/health";
import { toMillis } from "@/common/apps/family/lib/format";
import { useReadCopy, withPrefix, type ViewDocs } from "@/common/apps/family/lib/views";
import type { Person } from "@/common/apps/family/types";

export const FITNESS_PEOPLE: Person[] = ["anand", "kavya"];
import { FITNESS_TABS } from "@/common/apps/family/lib/tabs";
export type FitnessTab = (typeof FITNESS_TABS)[number][0];

export type Op = "lt" | "lte" | "gt" | "gte" | "between";
export interface Target {
  id: string; label: string; kind: "lab" | "body" | "vitals" | "activity"; metric: string; lab_tests?: string[];
  unit?: string; op: Op; value: number; value2?: number | null; horizon?: string; why?: string; sources?: Source[];
}
export interface PillarItem { id: string; text: string; detail?: string; sources?: Source[] }
export interface Pillar { id: string; title: string; items?: PillarItem[] }
export interface Meal { id: string; label: string; time?: string; kcal?: number; protein_g?: string | number; notes?: string }
export interface Food {
  pattern?: string;
  calories?: { maintenance?: number; cut?: number; cut_weeks?: string; mode?: "maintenance" | "cut" };
  protein_g?: { min?: number; max?: number };
  meals?: Meal[];
  daily_foods?: { id: string; text: string }[];
  limit?: string[];
  swaps?: { from: string; to: string }[];
  water_l?: { min?: number; max?: number };
  sources?: Source[];
}
export interface ChecklistItem { id: string; label: string; kind: "bool" | "number"; unit?: string; target?: number; source?: string; metric?: string }
export interface PlanTest {
  id: string; title: string; due?: string; where?: "india" | "uk" | "either"; items?: string[]; prep?: string; done_at?: string | null; sources?: Source[];
}
export interface GpQuestion { id: string; question: string; context?: string }
export interface RedFlag { id: string; sign: string; action: string }
export interface Reminder { id: string; label: string; time: string; days: string }
export interface Plan {
  person: string; title?: string; updated_at?: string; source?: string; status?: "draft" | "active";
  start_date?: string; review_date?: string;
  targets?: Target[]; pillars?: Pillar[]; food?: Food; checklist?: ChecklistItem[]; tests?: PlanTest[];
  gp_questions?: GpQuestion[]; red_flags?: RedFlag[]; reminders?: Reminder[];
  body?: string;
}
export interface Measurement {
  at: string; metric: string; value?: number; sys?: number; dia?: number; pulse?: number;
  session?: "am" | "pm"; protocol?: string; source?: string; note?: string;
  type?: string; minutes?: number; distance_km?: number; avg_hr?: number;
}
export type CheckinValues = Record<string, boolean | number | string | undefined>;
export interface BpRun {
  id: string; start?: string; end?: string; status: "running" | "done" | "stopped"; readings?: number;
  avg_sys?: number; avg_dia?: number; discarded_day1?: boolean;
}
export interface ImportRow { file?: string; size?: number; person?: string; imported_at?: string; from?: string; to?: string; counts?: Record<string, number> }
export interface IngestKey { id: string; label: string; created_at?: string; last_used_at?: string | null; last_date?: string | null; revoked?: boolean }
export interface FitnessData {
  person: string;
  plan: Plan | null;
  measurements: Measurement[];
  /** Day (YYYY-MM-DD) to that day's ticks. */
  checkins: Record<string, CheckinValues>;
  bp_protocols: BpRun[];
  imports: ImportRow[];
  devices: { count: number };
  ingest_keys: IngestKey[];
  /** Records the Mac could not read (paths relative to content/). */
  broken?: string[];
}
/** Lab results may carry needs_repeat (delayed sample) per docs/fitness-design.md, "Lab results: needs repeat". */
export type FitnessLabResult = LabResult & { needs_repeat?: boolean };

/** Accepts the checkins either as the month file's `days` map or as a list of `{date, ...values}`. */
function normaliseCheckins(raw: unknown): Record<string, CheckinValues> {
  if (Array.isArray(raw)) {
    const out: Record<string, CheckinValues> = {};
    for (const row of raw as ({ date?: string } & CheckinValues)[]) if (typeof row?.date === "string") out[row.date] = { ...out[row.date], ...row };
    return out;
  }
  return raw && typeof raw === "object" ? (raw as Record<string, CheckinValues>) : {};
}

async function call(ctx: HealthCtx, path: string, method = "GET", body?: unknown, timeoutMs = API_TIMEOUT_MS): Promise<Response> {
  const token = await ctx.getToken();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${FAMILY_API}${path}`, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      cache: "no-store",
      signal: ctl.signal,
    });
  } catch {
    throw new HealthOfflineError();
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new HealthHttpError(res.status);
  return res;
}

const send = async (ctx: HealthCtx, path: string, method: string, body: unknown, timeoutMs?: number) => (await call(ctx, path, method, body, timeoutMs)).json() as Promise<unknown>;
// Signing a Shortcut on the Mac takes about 10 s and is capped there at 30 s.
const SHORTCUT_TIMEOUT_MS = 45000;

/** Edits the bridge accepts on PUT /fitness/:person/plan: whitelisted fields, list items addressed by id. */
export interface PlanPatch {
  targets?: { id: string; op?: Op; value?: number; value2?: number | null }[];
  food?: { calories?: Food["calories"]; protein_g?: Food["protein_g"]; water_l?: Food["water_l"] };
  checklist?: { id: string; target?: number }[];
  tests?: { id: string; done_at?: string | null; due?: string }[];
  reminders?: { id: string; time: string }[];
}

export const fitnessApi = {
  get: async (ctx: HealthCtx, person: Person): Promise<FitnessData> => {
    const d = (await (await call(ctx, `/fitness/${person}`)).json()) as Partial<FitnessData> & { checkins?: unknown };
    return {
      person: d.person ?? person,
      plan: d.plan ?? null,
      measurements: d.measurements ?? [],
      checkins: normaliseCheckins(d.checkins),
      bp_protocols: d.bp_protocols ?? [],
      imports: d.imports ?? [],
      devices: d.devices ?? { count: 0 },
      ingest_keys: d.ingest_keys ?? [],
      broken: d.broken ?? [],
    };
  },
  plan: (ctx: HealthCtx, person: Person, patch: PlanPatch) => send(ctx, `/fitness/${person}/plan`, "PUT", patch),
  measurements: (ctx: HealthCtx, person: Person, entries: Measurement[]) => send(ctx, `/fitness/${person}/measurements`, "POST", { entries }),
  checkin: (ctx: HealthCtx, person: Person, date: string, values: CheckinValues) => send(ctx, `/fitness/${person}/checkins`, "POST", { date, values }),
  bpProtocol: (ctx: HealthCtx, person: Person, action: "start" | "stop") => send(ctx, `/fitness/${person}/bp-protocol`, "POST", { action }),
  device: (ctx: HealthCtx, person: Person, token: string, enabled: boolean) => send(ctx, `/fitness/${person}/devices`, "POST", { token, enabled }),
  createIngestKey: async (ctx: HealthCtx, person: Person, label: string) => (await send(ctx, `/fitness/${person}/ingest-keys`, "POST", { label })) as { id: string; key: string },
  /** One-tap install: a new key signed into a personal Shortcut, downloadable once from `download_url` (10 minutes).
   * `backfill` builds the run-once Shortcut that sends past months, with its own key ("<label> backfill"). */
  installShortcut: async (ctx: HealthCtx, person: Person, label: string, variant: "daily" | "backfill" = "daily") =>
    (await send(ctx, `/fitness/${person}/shortcut`, "POST", variant === "backfill" ? { label, variant } : { label }, SHORTCUT_TIMEOUT_MS)) as { id: string; download_url: string },
  revokeIngestKey: (ctx: HealthCtx, person: Person, id: string) => send(ctx, `/fitness/${person}/ingest-keys/${id}/revoke`, "POST", {}),
  requestPlan: (ctx: HealthCtx, person: Person) => send(ctx, `/fitness/${person}/plan/request`, "POST", {}),
};

export type FitnessStatus = "loading" | "ready" | "offline" | "error";
export interface UseFitness {
  data: FitnessData | null;
  status: FitnessStatus;
  refresh: () => Promise<void>;
  ctx: HealthCtx;
  /** Whether the Mac answered: false means only the Firestore copy is shown (no device or key management). */
  live: boolean | null;
}

const isOffline = (e: unknown) => e instanceof HealthOfflineError;

/** The page data from the Firestore copy: plan, measurements, check-ins, BP runs and the last sync. Devices and
 * imports stay empty until the Mac answers. Null while nothing is published. */
export function fitnessFromViews(docs: ViewDocs, person: string): FitnessData | null {
  if (!docs.meta) return null;
  const months = <T>(prefix: string) => Object.entries(withPrefix<T>(docs, prefix)).sort(([a], [b]) => a.localeCompare(b)).map(([, d]) => d);
  return {
    person,
    plan: (docs.plan as Plan | undefined) ?? null,
    measurements: months<{ entries?: Measurement[] }>("measurements_").flatMap((m) => m.entries ?? []),
    checkins: Object.assign({}, ...months<{ days?: Record<string, CheckinValues> }>("checkins_").map((m) => m.days ?? {})) as Record<string, CheckinValues>,
    bp_protocols: (docs.bp as { runs?: BpRun[] } | undefined)?.runs ?? [],
    imports: [],
    devices: { count: 0 },
    ingest_keys: (docs.sync as { ingest_keys?: IngestKey[] } | undefined)?.ingest_keys ?? [],
    broken: [],
  };
}

/** Page data: the Firestore copy at once, then GET /fitness/:person from the Mac. State only, no persistence. */
export function useFitness(person: Person): UseFitness {
  const ctx = useHealthApi();
  const load = useCallback(() => fitnessApi.get(ctx, person), [ctx, person]);
  const options = useMemo(() => ({ area: "fitness" as const, person, compose: fitnessFromViews, load, isOffline }), [person, load]);
  const rc = useReadCopy(options);
  return { ...rc, ctx };
}

export function parseFitnessPerson(v: string | null): Person | null {
  return FITNESS_PEOPLE.find((p) => p === v) ?? null;
}

// ---- dates ----

const DAY = 86400000;
/** Local calendar day, YYYY-MM-DD. */
export function dayKey(d: Date = new Date()): string {
  return d.toLocaleDateString("en-CA");
}
/** Calendar day of a measurement: date-only stamps are taken as they are, timestamps in local time. */
export function dayOf(at: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(at)) return at;
  const ms = toMillis(at);
  return ms === null ? at.slice(0, 10) : dayKey(new Date(ms));
}
/** Midday of a YYYY-MM-DD in local time, so adding whole days never trips over a clock change. */
export function dayMs(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12).getTime();
}
export const addDays = (key: string, n: number) => dayKey(new Date(dayMs(key) + n * DAY));
export const daysBetween = (a: string, b: string) => Math.round((dayMs(b) - dayMs(a)) / DAY);
/** The last `n` days ending with `end`, oldest first. */
export function lastDays(end: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - n + 1));
}
/** ISO timestamp with the local offset, e.g. 2026-10-10T07:32:00+01:00. */
export function localIso(d: Date = new Date()): string {
  const off = -d.getTimezoneOffset();
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");
  const sign = off >= 0 ? "+" : "-";
  return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${pad(off / 60)}:${pad(off % 60)}`;
}
/** Monday of the week a day falls in. */
export function weekOf(key: string): string {
  const dow = (new Date(dayMs(key)).getDay() + 6) % 7;
  return addDays(key, -dow);
}
export function fmtDay(key: string | undefined, withYear = false): string {
  if (!key) return "";
  const day = dayOf(key);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "";
  return new Date(dayMs(day)).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
}

/** The newest last_used_at among the active keys, or null when no key has been used. */
export function lastSynced(keys: IngestKey[]): string | null {
  let best: string | null = null;
  for (const k of keys) {
    const ms = toMillis(k.last_used_at);
    if (!k.revoked && ms !== null && (best === null || ms > (toMillis(best) ?? 0))) best = k.last_used_at ?? null;
  }
  return best;
}

export function fmtNum(v: number, digits = 1): string {
  return v.toLocaleString("en-GB", { maximumFractionDigits: digits });
}

// ---- measurements ----

export const METRIC_LABEL: Record<string, string> = {
  weight_kg: "Weight", body_fat_pct: "Body fat", visceral_fat: "Visceral fat", muscle_kg: "Muscle", lean_mass_kg: "Lean mass",
  waist_cm: "Waist", bp: "Blood pressure", resting_hr: "Resting heart rate", hrv_ms: "Heart rate variability", vo2max: "VO2 max",
  steps: "Steps", sleep_h: "Sleep", active_kcal: "Active energy", workout: "Workout",
};
export const METRIC_UNIT: Record<string, string> = {
  weight_kg: "kg", body_fat_pct: "%", visceral_fat: "", muscle_kg: "kg", lean_mass_kg: "kg", waist_cm: "cm", resting_hr: "bpm",
  hrv_ms: "ms", vo2max: "ml/kg/min", steps: "steps", sleep_h: "h", active_kcal: "kcal",
};

export interface Point { day: string; t: number; v: number }

/** Daily values of one metric (the day's mean when there are several), oldest first. */
export function dailySeries(ms: Measurement[], metric: string): Point[] {
  const byDay = new Map<string, number[]>();
  for (const m of ms) {
    if (m.metric !== metric || typeof m.value !== "number" || !Number.isFinite(m.value)) continue;
    const d = dayOf(m.at);
    byDay.set(d, [...(byDay.get(d) ?? []), m.value]);
  }
  return [...byDay.entries()]
    .map(([day, vs]) => ({ day, t: dayMs(day), v: vs.reduce((a, b) => a + b, 0) / vs.length }))
    .sort((a, b) => a.t - b.t);
}

/** For each day with a value, the mean of the values in that day and the six before it. */
export function rollingAverage(points: Point[], days = 7): Point[] {
  return points.map((p) => {
    const win = points.filter((q) => q.t <= p.t && q.t > p.t - days * DAY);
    return { ...p, v: win.reduce((a, b) => a + b.v, 0) / win.length };
  });
}

/** Weekly means (week starting Monday), oldest first. */
export function weeklyAverage(points: Point[]): Point[] {
  const byWeek = new Map<string, number[]>();
  for (const p of points) {
    const w = weekOf(p.day);
    byWeek.set(w, [...(byWeek.get(w) ?? []), p.v]);
  }
  return [...byWeek.entries()]
    .map(([day, vs]) => ({ day, t: dayMs(day), v: vs.reduce((a, b) => a + b, 0) / vs.length }))
    .sort((a, b) => a.t - b.t);
}

// ---- trend windows ----

export const WINDOWS = [["7d", "7 days"], ["30d", "30 days"], ["3m", "3 months"], ["6m", "6 months"], ["1y", "1 year"], ["all", "All"]] as const;
export type WindowKey = (typeof WINDOWS)[number][0];
export const DEFAULT_WINDOW: WindowKey = "3m";
const WINDOW_SPAN: Record<Exclude<WindowKey, "all">, number> = { "7d": 7, "30d": 30, "3m": 91, "6m": 182, "1y": 365 };

export const parseWindow = (v: string | null): WindowKey => WINDOWS.find(([k]) => k === v)?.[0] ?? DEFAULT_WINDOW;

export interface TrendWindow {
  key: WindowKey;
  /** First and last day shown (YYYY-MM-DD); with weekly buckets `from` is the Monday of the first week. */
  from: string;
  to: string;
  /** Weekly averages (7 days and 30 days show daily values). */
  weekly: boolean;
  /** Days in a bucket. */
  bucket: 1 | 7;
  ticks: { day: string; label: string }[];
}

const monthTicks = (from: string, to: string, withYear: boolean) => {
  const out: { day: string; label: string }[] = [];
  const [fy, fm] = from.split("-").map(Number);
  for (let i = 0; i < 400; i++) {
    const d = new Date(fy, fm - 1 + i, 1);
    const day = dayKey(d);
    if (day > to) break;
    if (day >= from) out.push({ day, label: d.toLocaleDateString("en-GB", { month: "short", ...(withYear ? { year: "2-digit" } : {}) }) });
  }
  const step = Math.ceil(out.length / 6);
  return out.filter((_, i) => (out.length - 1 - i) % step === 0);
};

/** The days a window covers, how they are bucketed and where the x-axis labels go. `earliest` is the oldest day with data (for All). */
export function trendWindow(key: WindowKey, today: string, earliest?: string): TrendWindow {
  const days = key === "all" ? Math.max(7, daysBetween(earliest ?? today, today) + 1) : WINDOW_SPAN[key];
  const weekly = key === "all" ? days > 31 : key !== "7d" && key !== "30d";
  const start = addDays(today, 1 - days);
  const from = weekly ? weekOf(start) : start;
  let ticks: TrendWindow["ticks"];
  if (key === "7d") ticks = lastDays(today, 7).map((day) => ({ day, label: new Date(dayMs(day)).toLocaleDateString("en-GB", { weekday: "short" }) }));
  else if (!weekly || days <= 31) ticks = [0, 7, 14, 21, 28].map((n) => addDays(today, -n)).filter((d) => d >= from).reverse().map((day) => ({ day, label: fmtDay(day) }));
  else ticks = monthTicks(from, today, days > 366);
  return { key, from, to: today, weekly, bucket: weekly ? 7 : 1, ticks };
}

export const inWindow = (pts: Point[], w: Pick<TrendWindow, "from" | "to">) => pts.filter((p) => p.day >= w.from && p.day <= w.to);
/** Daily points as they are, or their weekly averages, depending on the window. */
export const bucketed = (pts: Point[], w: Pick<TrendWindow, "weekly">) => (w.weekly ? weeklyAverage(pts) : pts);
/** The newest point, whatever the window. */
export const latestPoint = (pts: Point[]): Point | undefined => pts[pts.length - 1];

export const bpReadings = (ms: Measurement[]) =>
  ms.filter((m) => m.metric === "bp" && typeof m.sys === "number" && typeof m.dia === "number").sort((a, b) => (toMillis(a.at) ?? 0) - (toMillis(b.at) ?? 0));

// ---- checklist ----

/** Measurement metric behind an item that comes from Apple Health. */
const ITEM_METRIC: Record<string, string> = { steps: "steps", sleep: "sleep_h" };
export const fromWatch = (item: ChecklistItem) => item.source === "apple-health";
export const itemMetric = (item: ChecklistItem) => item.metric ?? ITEM_METRIC[item.id] ?? item.id;

export function itemValue(item: ChecklistItem, day: string, data: Pick<FitnessData, "checkins" | "measurements">): boolean | number | undefined {
  if (fromWatch(item)) {
    const metric = itemMetric(item);
    const vals = data.measurements.filter((m) => m.metric === metric && dayOf(m.at) === day && typeof m.value === "number").map((m) => m.value as number);
    if (!vals.length) return undefined;
    // Steps are a daily total; for anything else the latest entry of the day wins.
    return metric === "steps" ? Math.max(...vals) : vals[vals.length - 1];
  }
  const v = data.checkins[day]?.[item.id];
  if (item.kind === "bool") return v === true ? true : v === false ? false : undefined;
  return typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined;
}

export function itemMet(item: ChecklistItem, v: boolean | number | undefined): boolean {
  if (item.kind === "bool") return v === true;
  return typeof v === "number" && (item.target ? v >= item.target : v > 0);
}

export function doneToday(plan: Plan | null, data: Pick<FitnessData, "checkins" | "measurements">, today = dayKey()): { done: number; total: number } {
  const items = plan?.checklist ?? [];
  return { done: items.filter((i) => itemMet(i, itemValue(i, today, data))).length, total: items.length };
}

/** Share of checklist items met over the last 7 days (today included); null without a checklist. */
export function weeklyAdherence(plan: Plan | null, data: Pick<FitnessData, "checkins" | "measurements">, today = dayKey()): { met: number; total: number; pct: number } | null {
  const items = plan?.checklist ?? [];
  if (!items.length) return null;
  let met = 0;
  for (const d of lastDays(today, 7)) for (const i of items) if (itemMet(i, itemValue(i, d, data))) met++;
  const total = items.length * 7;
  return { met, total, pct: Math.round((met / total) * 100) };
}

/** Step size for a number stepper, from the unit. */
export function stepFor(item: ChecklistItem): number {
  const u = (item.unit ?? "").toLowerCase();
  if (u === "g") return 5;
  if (u === "l") return 0.25;
  if (u === "h") return 0.5;
  if (u === "steps") return 500;
  if (u === "min" || u === "minutes") return 5;
  return 1;
}

// ---- BP protocol ----

export const BP_DAYS = 7;
export const BP_PER_SESSION = 2;

export const activeRun = (runs: BpRun[]) => runs.find((r) => r.status === "running") ?? null;
export function lastDoneRun(runs: BpRun[]): BpRun | null {
  const done = runs.filter((r) => r.status === "done" && typeof r.avg_sys === "number");
  return done.sort((a, b) => (toMillis(b.end ?? b.start ?? b.id) ?? 0) - (toMillis(a.end ?? a.start ?? a.id) ?? 0))[0] ?? null;
}
export const runStart = (r: BpRun) => dayOf(r.start ?? r.id);

export interface ProtocolToday { day: number; am: number; pm: number; left: number }
export function protocolToday(run: BpRun, ms: Measurement[], today = dayKey()): ProtocolToday {
  const day = Math.min(BP_DAYS, Math.max(1, daysBetween(runStart(run), today) + 1));
  const mine = bpReadings(ms).filter((m) => m.protocol === run.id && dayOf(m.at) === today);
  const am = Math.min(BP_PER_SESSION, mine.filter((m) => m.session === "am").length);
  const pm = Math.min(BP_PER_SESSION, mine.filter((m) => m.session === "pm").length);
  return { day, am, pm, left: BP_PER_SESSION * 2 - am - pm };
}

// ---- targets ----

export type TargetStatus = "on-track" | "improving" | "off-track" | "worse" | "needs-repeat" | "no-data";
export const STATUS_LABEL: Record<TargetStatus, string> = {
  "on-track": "On track", improving: "Improving", "off-track": "Not there yet", worse: "Worse", "needs-repeat": "Needs repeat", "no-data": "No data",
};

export interface TargetReading { value: number; display: string; date?: string; needsRepeat?: boolean; note?: string }
export interface TargetRow { target: Target; current: TargetReading | null; previous: TargetReading | null; status: TargetStatus }

export function meets(t: Pick<Target, "op" | "value" | "value2">, v: number): boolean {
  switch (t.op) {
    case "lt": return v < t.value;
    case "lte": return v <= t.value;
    case "gt": return v > t.value;
    case "gte": return v >= t.value;
    case "between": return v >= t.value && v <= (t.value2 ?? Infinity);
  }
}

/** How far a value is from the target range (0 inside it). */
function distance(t: Target, v: number): number {
  if (meets(t, v)) return 0;
  if (t.op === "lt" || t.op === "lte") return v - t.value;
  if (t.op === "gt" || t.op === "gte") return t.value - v;
  return v < t.value ? t.value - v : v - (t.value2 ?? t.value);
}

export function targetText(t: Pick<Target, "op" | "value" | "value2" | "unit">): string {
  const u = t.unit ? ` ${t.unit}` : "";
  switch (t.op) {
    case "lt": return `Under ${fmtNum(t.value)}${u}`;
    case "lte": return `${fmtNum(t.value)}${u} or less`;
    case "gt": return `Over ${fmtNum(t.value)}${u}`;
    case "gte": return `At least ${fmtNum(t.value)}${u}`;
    case "between": return `${fmtNum(t.value)} to ${fmtNum(t.value2 ?? t.value)}${u}`;
  }
}

const sameTest = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Lab readings for a target, newest first: results whose test name matches one of `lab_tests`. */
export function labReadings(t: Target, reports: Report[]): TargetReading[] {
  const names = t.lab_tests?.length ? t.lab_tests : [t.label];
  const out: (TargetReading & { time: number })[] = [];
  for (const rep of reports) {
    for (const r of (rep.results ?? []) as FitnessLabResult[]) {
      if (!names.some((n) => sameTest(n, r.test))) continue;
      const value = numericOf(r);
      if (value === null) continue;
      out.push({
        value, display: `${r.value}${r.unit ? ` ${r.unit}` : ""}`, date: rep.collected_at ?? rep.reported_at,
        needsRepeat: r.needs_repeat === true, note: r.note, time: reportTime(rep),
      });
    }
  }
  return out.sort((a, b) => b.time - a.time);
}

/** Measurement readings for a target, newest first. Blood pressure prefers finished protocol averages. */
export function measuredReadings(t: Target, data: Pick<FitnessData, "measurements" | "bp_protocols">): TargetReading[] {
  const unit = t.unit ?? METRIC_UNIT[t.metric] ?? "";
  const show = (v: number) => `${fmtNum(v, t.metric === "steps" ? 0 : 1)}${unit ? ` ${unit}` : ""}`;
  const bp = /^bp(_sys|_dia)?$/.exec(t.metric);
  if (bp) {
    const key = bp[1] === "_dia" ? "dia" : "sys";
    const runs = data.bp_protocols
      .filter((r) => r.status === "done" && typeof r[key === "sys" ? "avg_sys" : "avg_dia"] === "number")
      .map((r) => ({ value: (key === "sys" ? r.avg_sys : r.avg_dia) as number, date: r.end ?? r.start ?? r.id }));
    const src = runs.length ? runs : bpReadings(data.measurements).map((m) => ({ value: m[key] as number, date: m.at }));
    return src.map((r) => ({ ...r, display: show(r.value) })).sort((a, b) => (toMillis(b.date) ?? 0) - (toMillis(a.date) ?? 0));
  }
  return dailySeries(data.measurements, t.metric).reverse().map((p) => ({ value: p.v, display: show(p.v), date: p.day }));
}

export function targetRow(t: Target, data: Pick<FitnessData, "measurements" | "bp_protocols">, reports: Report[]): TargetRow {
  const readings = t.kind === "lab" ? labReadings(t, reports) : measuredReadings(t, data);
  const current = readings[0] ?? null;
  if (!current) return { target: t, current: null, previous: null, status: "no-data" };
  const previous = readings.slice(1).find((r) => !r.needsRepeat) ?? null;
  if (current.needsRepeat) return { target: t, current, previous, status: "needs-repeat" };
  if (meets(t, current.value)) return { target: t, current, previous, status: "on-track" };
  if (!previous) return { target: t, current, previous, status: "off-track" };
  const now = distance(t, current.value);
  const before = distance(t, previous.value);
  return { target: t, current, previous, status: now < before ? "improving" : now > before ? "worse" : "off-track" };
}

// ---- tests and GP questions ----

export function testsInOrder(tests: PlanTest[]): { open: PlanTest[]; done: PlanTest[] } {
  const byDue = (a: PlanTest, b: PlanTest) => (toMillis(a.due) ?? Infinity) - (toMillis(b.due) ?? Infinity);
  return { open: tests.filter((t) => !t.done_at).sort(byDue), done: tests.filter((t) => !!t.done_at).sort(byDue) };
}

export const DISCLAIMER = "Not medical advice; review with your GP.";

/** Plain text of the GP questions, for the share sheet or the clipboard. */
export function gpShareText(name: string, questions: GpQuestion[], today = dayKey()): string {
  const lines = [`Questions for my GP (${name}), ${fmtDay(today, true)}`, ""];
  questions.forEach((q, i) => {
    lines.push(`${i + 1}. ${q.question}`);
    if (q.context) lines.push(`   ${q.context}`);
  });
  lines.push("", DISCLAIMER);
  return lines.join("\n");
}

export const WHERE_LABEL: Record<string, string> = { india: "In India", uk: "In the UK", either: "India or UK" };
