// Client for the Mac bridge's /health routes (docs/health-design.md, "Bridge API"). Health records live
// on the Mac; the finished display content (summary, follow-up ticks, report summaries) also has a read
// copy in Firestore (lib/views.ts), so the pages load without the Mac. Working details (questions and
// answers, uploads, report text, files) and every action go to the Mac, with the Firebase ID token.
// Nothing is kept in localStorage, sessionStorage or IndexedDB.
import { useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/common/firebase/AuthProvider";
import { useData } from "@/common/apps/family/hooks/useData";
import { toMillis } from "@/common/apps/family/lib/format";
import { useReadCopy, withPrefix, type ViewDocs } from "@/common/apps/family/lib/views";
import type { Person } from "@/common/apps/family/types";

export const HEALTH_PEOPLE: Person[] = ["anand", "kavya", "nila"];
export const API_TIMEOUT_MS = 15000;
export const POLL_MS = 10000;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export type Severity = "info" | "watch" | "action" | "urgent";
export type Flag = "low" | "high" | "abnormal" | "normal" | "critical";
export interface Source { title: string; url: string; kind?: string }
export interface Evidence { report: string; test?: string; value?: string; date?: string }
export interface Concern {
  id: string; title: string; status?: "active" | "watching" | "resolved"; severity: Severity; since?: string;
  detail?: string; evidence?: Evidence[]; sources?: Source[];
}
export interface Followup { id: string; title: string; due?: string; why?: string; kind?: string; where?: "india" | "uk" | "either"; concern?: string }
export interface RoutineItem { id: string; title: string; frequency?: string; why?: string; concern?: string }
export interface DoItem { text: string; why?: string; concern?: string; sources?: Source[] }
export type Place = "india" | "uk";
export interface HealthLocation { current: Place; until?: string; then?: Place }
export interface Summary {
  person: string; updated_at?: string; source?: string; location?: HealthLocation;
  concerns?: Concern[]; followups?: Followup[]; routine?: RoutineItem[]; dos?: DoItem[]; donts?: DoItem[];
  body?: string;
}
export type QuestionKind = "text" | "choice" | "yes-no" | "number";
export interface Question { id: string; question: string; why?: string; kind: QuestionKind; options?: string[]; multiple?: boolean; asked_at?: string; concern?: string }
export interface Questions { person: string; updated_at?: string; questions?: Question[] }
export interface Answer { question?: string; answer: string; answered_at?: string; answered_by?: string }
export interface HealthContext { person: string; updated_at?: string; answers?: Record<string, Answer> }
export interface LabResult {
  panel?: string; test: string; value: string; numeric?: number; unit?: string; ref_range?: string; flag?: Flag; note?: string; needs_repeat?: boolean;
}
export interface Report {
  id: string; person: string; title: string; lab?: string; country?: "IN" | "UK" | "other"; lab_city?: string; referred_by?: string; sample_id?: string;
  collected_at?: string; reported_at?: string; completeness?: "partial" | "complete" | "unknown";
  uploads?: string[]; panels?: string[]; results?: LabResult[]; summary?: string;
}
export interface ReportDetail extends Report { body: string }
export interface Ask { id: string; person: string; question: string; asked_at?: string; asked_by?: string; status: "pending" | "answered" | "failed"; answered_at?: string; sources?: Source[]; body?: string }
export interface UploadMeta { id: string; file: string; original_name: string; content_type: string; bytes: number; uploaded_at: string; uploaded_by?: string; note?: string; processed: boolean }
export interface HealthJob { id: string; state: string; task?: string; created_at?: string }
/** tracking.md: follow-ups marked done, id to ISO timestamp (done = key present). */
export interface Tracking { person?: string; updated_at?: string; followups_done?: Record<string, string> }
export interface HealthData {
  person: string;
  summary: Summary | null;
  questions: Questions | null;
  context: HealthContext | null;
  reports: Report[];
  asks: Ask[];
  uploads: UploadMeta[];
  tracking: Tracking | null;
  jobs: HealthJob[];
  /** Records the Mac could not read (paths relative to content/). */
  broken?: string[];
}

export class HealthOfflineError extends Error {
  constructor() { super("The Mac is not reachable"); }
}
export class HealthHttpError extends Error {
  constructor(readonly status: number) { super(`Health API answered ${status}`); }
}

export interface HealthCtx { base: string; getToken: () => Promise<string> }

/** Base URL and ID token for the health routes. */
export function useHealthApi(): HealthCtx {
  const { user } = useAuth();
  const { mac } = useData();
  const userRef = useRef(user);
  userRef.current = user;
  return useMemo(
    () => ({
      base: mac.base,
      getToken: async () => {
        const u = userRef.current;
        if (!u) throw new HealthHttpError(401);
        return u.getIdToken();
      },
    }),
    [mac.base],
  );
}

async function call(ctx: HealthCtx, path: string, init: { method?: string; body?: BodyInit; headers?: Record<string, string>; timeoutMs?: number | null } = {}): Promise<Response> {
  const token = await ctx.getToken();
  const ctl = new AbortController();
  const ms = init.timeoutMs === undefined ? API_TIMEOUT_MS : init.timeoutMs;
  const timer = ms === null ? undefined : setTimeout(() => ctl.abort(), ms);
  let res: Response;
  try {
    res = await fetch(`${ctx.base}${path}`, {
      method: init.method ?? "GET",
      body: init.body,
      headers: { Authorization: `Bearer ${token}`, ...init.headers },
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

async function json<T>(ctx: HealthCtx, path: string, init?: Parameters<typeof call>[2]): Promise<T> {
  return (await call(ctx, path, init)).json() as Promise<T>;
}

function postJson<T>(ctx: HealthCtx, path: string, body: unknown): Promise<T> {
  return json<T>(ctx, path, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

const EXT_TYPES: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
export const ACCEPTED_TYPES = Object.values(EXT_TYPES).filter((t, i, a) => a.indexOf(t) === i);

export function uploadContentType(f: File): string {
  return f.type || EXT_TYPES[f.name.split(".").pop()?.toLowerCase() ?? ""] || "application/octet-stream";
}

export const healthApi = {
  get: (ctx: HealthCtx, person: Person) => json<HealthData>(ctx, `/health/${person}`),
  report: (ctx: HealthCtx, person: Person, id: string) => json<ReportDetail>(ctx, `/health/${person}/reports/${encodeURIComponent(id)}`),
  /** No timeout: a 25 MB file over mobile data can take a while. */
  upload: (ctx: HealthCtx, person: Person, file: File) =>
    json<{ upload_id: string }>(ctx, `/health/${person}/uploads`, {
      method: "POST",
      body: file,
      timeoutMs: null,
      headers: { "Content-Type": uploadContentType(file), "X-Filename": file.name.replace(/[^A-Za-z0-9._-]+/g, "-") },
    }),
  process: (ctx: HealthCtx, person: Person, upload_ids: string[], note?: string) =>
    postJson<{ job_id: string }>(ctx, `/health/${person}/process`, note ? { upload_ids, note } : { upload_ids }),
  answers: (ctx: HealthCtx, person: Person, answers: Record<string, string>) => postJson<unknown>(ctx, `/health/${person}/answers`, { answers }),
  ask: (ctx: HealthCtx, person: Person, question: string) => postJson<unknown>(ctx, `/health/${person}/ask`, { question }),
  followup: (ctx: HealthCtx, person: Person, id: string, done: boolean) => postJson<unknown>(ctx, `/health/${person}/followups/${encodeURIComponent(id)}`, { done }),
  /** The original file as a Blob. */
  original: async (ctx: HealthCtx, person: Person, uploadId: string): Promise<Blob> =>
    (await call(ctx, `/health/${person}/uploads/${encodeURIComponent(uploadId)}`, { timeoutMs: 60000 })).blob(),
};

/** Opens a Blob in a new tab through an object URL, revoked five minutes later. The tab is opened before the
 * download starts so mobile browsers do not treat it as a blocked popup. */
export async function openOriginal(ctx: HealthCtx, person: Person, uploadId: string): Promise<void> {
  const tab = window.open("", "_blank");
  try {
    const url = URL.createObjectURL(await healthApi.original(ctx, person, uploadId));
    if (tab) tab.location.href = url;
    else window.location.assign(url);
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
  } catch (e) {
    tab?.close();
    throw e;
  }
}

export type HealthStatus = "loading" | "ready" | "offline" | "error";
const ACTIVE_JOB = /^(queued|running|deferred)$/;
export const jobIsActive = (j: HealthJob) => ACTIVE_JOB.test(j.state);

export interface UseHealth {
  data: HealthData | null;
  status: HealthStatus;
  refresh: () => Promise<void>;
  ctx: HealthCtx;
  /** Whether the Mac answered: false means only the Firestore copy is shown (no questions, uploads or files). */
  live: boolean | null;
}

const isOffline = (e: unknown) => e instanceof HealthOfflineError;

/** The page data from the Firestore copy: summary, follow-up ticks and report summaries. The working details
 * stay empty until the Mac answers. Null while nothing is published. */
export function healthFromViews(docs: ViewDocs, person: string): HealthData | null {
  if (!docs.meta) return null;
  return {
    person,
    summary: (docs.summary as Summary | undefined) ?? null,
    questions: null,
    context: null,
    reports: Object.values(withPrefix<Report>(docs, "report_")),
    asks: [],
    uploads: [],
    tracking: (docs.tracking as Tracking | undefined) ?? null,
    jobs: [],
    broken: [],
  };
}

const healthBusy = (d: HealthData) => !!d.jobs?.some(jobIsActive);

/** Page data: the Firestore copy at once, then GET /health/:person from the Mac (which adds the working details);
 * polls every 10 s while a job is queued or running. Without the Mac the copy stays and `live` is false. */
export function useHealth(person: Person): UseHealth {
  const ctx = useHealthApi();
  const load = useCallback(() => healthApi.get(ctx, person), [ctx, person]);
  const options = useMemo(() => ({ area: "health" as const, person, compose: healthFromViews, load, isOffline, polling: healthBusy, pollMs: POLL_MS }), [person, load]);
  const rc = useReadCopy(options);
  return { ...rc, ctx };
}

export function parseHealthPerson(v: string | null): Person | null {
  return HEALTH_PEOPLE.find((p) => p === v) ?? null;
}

export const SEVERITY_ORDER: Severity[] = ["urgent", "action", "watch", "info"];
export const SEVERITY_LABEL: Record<Severity, string> = { urgent: "Urgent", action: "Action", watch: "Watch", info: "For info" };
export const KIND_LABEL: Record<string, string> = {
  guideline: "Guideline", "meta-analysis": "Meta-analysis", "systematic-review": "Systematic review", rct: "Randomised trial",
  cohort: "Cohort study", review: "Review", nhs: "NHS", reference: "Reference",
};

export function isAbnormal(r: LabResult): boolean {
  return !!r.flag && r.flag !== "normal";
}

export function fmtDate(v: string | undefined): string {
  const ms = toMillis(v);
  if (ms === null) return "";
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const PLACE_NAME: Record<Place, string> = { india: "India", uk: "the UK" };
export const COUNTRY_LABEL: Record<string, string> = { IN: "India", UK: "UK" };

/** "You're in India until 17 Oct, then the UK". Null without a valid location. */
export function locationNote(loc: HealthLocation | undefined): string | null {
  if (!loc || !PLACE_NAME[loc.current]) return null;
  let note = `You're in ${PLACE_NAME[loc.current]}`;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(loc.until ?? "");
  if (m) note += ` until ${new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}`;
  if (loc.then && PLACE_NAME[loc.then]) note += `, then ${PLACE_NAME[loc.then]}`;
  return note;
}

export function reportTime(r: Report): number {
  return toMillis(r.collected_at) ?? toMillis(r.reported_at) ?? 0;
}

export function reportsNewestFirst(reports: Report[]): Report[] {
  return [...reports].sort((a, b) => reportTime(b) - reportTime(a));
}

/** Only http(s) links from the agent are rendered as links. */
export function safeUrl(u: string | undefined): string | null {
  return u && /^https?:\/\//i.test(u) ? u : null;
}

/** Ids of follow-ups marked done in tracking.md. */
export function doneFollowups(t: Tracking | null | undefined): Set<string> {
  return new Set(Object.keys(t?.followups_done ?? {}));
}

export interface TestPoint { reportId: string; time: number; date: string | undefined; result: LabResult }
export interface TestSeries { key: string; name: string; unit?: string; points: TestPoint[] }

export function numericOf(r: LabResult): number | null {
  if (typeof r.numeric === "number" && Number.isFinite(r.numeric)) return r.numeric;
  return /^-?\d+(\.\d+)?$/.test(r.value.trim()) ? Number(r.value) : null;
}

/** Every test across all reports, oldest point first, tests alphabetically. */
export function groupResults(reports: Report[]): TestSeries[] {
  const map = new Map<string, TestSeries>();
  for (const rep of reports) {
    for (const result of rep.results ?? []) {
      const key = result.test.trim().toLowerCase();
      const s = map.get(key) ?? { key, name: result.test.trim(), unit: result.unit, points: [] };
      s.points.push({ reportId: rep.id, time: reportTime(rep), date: rep.collected_at ?? rep.reported_at, result });
      map.set(key, s);
    }
  }
  const series = [...map.values()];
  for (const s of series) {
    s.points.sort((a, b) => a.time - b.time);
    s.unit = s.points[s.points.length - 1].result.unit ?? s.unit;
  }
  return series.sort((a, b) => a.name.localeCompare(b.name));
}

export interface DueFollowup { id: string; title: string; due: string; overdue: boolean }

/** Open follow-ups due within `days` days or already overdue (more than a day past due, as on the overview), soonest first. */
export function dueFollowups(data: HealthData, now: number, days = 14): DueFollowup[] {
  const done = doneFollowups(data.tracking);
  return (data.summary?.followups ?? [])
    .flatMap((f) => {
      const due = toMillis(f.due);
      if (done.has(f.id) || due === null || !f.due || due > now + days * 86400000) return [];
      return [{ id: f.id, title: f.title, due: f.due, overdue: due < now - 86400000 }];
    })
    .sort((a, b) => (toMillis(a.due) ?? 0) - (toMillis(b.due) ?? 0));
}
