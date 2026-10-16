// Client for the Mac bridge's /parenting routes (docs/parenting-design.md, bridge/parenting.mjs), plus the sums the
// Nila pages need (age today, this week's sleep step, the night-log trend, context.md sections). A child's records
// live on the Mac; the finished display content (plans, summaries, milestones, weeks) also has a read copy in
// Firestore (lib/views.ts), so the pages load without the Mac. Working details (notes, questions and answers,
// logs) and every action go to the Mac, with the Firebase ID token. Nila is an installable app that also works
// without a network: what both sources last returned is saved to IndexedDB on the device, per user (lib/views.ts,
// lib/offlineStore.ts), shown with an "Offline" note when the network or the Mac is not there, and emptied on
// sign-out. Nothing is kept in localStorage or sessionStorage.
import { useCallback, useEffect, useMemo, useState } from "react";
import { API_TIMEOUT_MS, HealthHttpError, HealthOfflineError, POLL_MS, jobIsActive, useHealthApi, type Ask, type HealthCtx, type HealthJob, type Source } from "@/common/apps/family/lib/health";
import { useReadCopy, withPrefix, type ViewDocs } from "@/common/apps/family/lib/views";
import type { Stale } from "@/common/apps/family/lib/offline";
import { addDays, dayKey, dayMs, daysBetween } from "@/common/apps/family/lib/fitness";

/** Only Nila has a parenting section (bridge/parenting.mjs PARENTING_PEOPLE). */
export const PARENTING_PERSON = "nila";
import { PARENTING_TABS } from "@/common/apps/family/lib/tabs";
export type ParentingTab = (typeof PARENTING_TABS)[number][0];
export const DISCLAIMER = "Not medical advice; check with your health visitor, GP or paediatrician.";

export type Area = "motor" | "language" | "social" | "cognitive" | "self-care";
export const AREAS: readonly (readonly [Area, string])[] = [
  ["motor", "Moving"], ["language", "Talking"], ["social", "Social"], ["cognitive", "Thinking"], ["self-care", "Self-care"],
];
export const AREA_LABEL = Object.fromEntries(AREAS) as Record<Area, string>;
export type MilestoneStatus = "seen" | "emerging" | "watching" | "not-yet";
export type ProblemStatus = "open" | "improving" | "resolved";
export const PROBLEM_STATUS: readonly (readonly [ProblemStatus, string])[] = [["open", "Open"], ["improving", "Improving"], ["resolved", "Resolved"]];

export interface Point { id: string; text: string; detail?: string; sources?: Source[] }
export interface Milestone { id: string; area: Area; title: string; status: MilestoneStatus; seen_on?: string; seen_on_approx?: boolean; source?: string; note?: string }
export interface CatalogMilestone { id: string; area: Area; title: string; typical?: string; sources?: Source[] }
export interface ActEarly { id: string; sign: string; action: string; sources?: Source[] }
export interface CatalogWindow { id: string; label: string; from_months: number; to_months: number; milestones?: CatalogMilestone[]; act_early?: ActEarly[]; sources?: Source[] }
export interface SleepStep { id: string; week: number; title: string; detail?: string; for_her?: string; sources?: Source[] }
/** What the family tried before (from her records) and why this plan was chosen. */
export interface HistoryFit {
  tried_before?: { what: string; when?: string; result: "worked" | "partly" | "didnt" | "unknown"; note?: string }[];
  why_this_plan?: string;
}
export interface WhatWorksItem { text: string; from: "your notes" | "research"; sources?: Source[] }
export type NapSlot = "first" | "between" | "before_bed";
/** The researched nap guide for her age (sleep/plan.md `naps`). Wake windows are ranges in minutes. */
export interface NapsGuide {
  age_note?: string; naps_per_day?: string; wake_windows?: { slot: NapSlot; min_minutes: number; max_minutes: number }[];
  day_sleep_hours?: string; total_sleep_hours?: string; uncertain?: boolean; why?: string; sources?: Source[];
}
export interface SettleBlock { signs?: string[]; do?: string[]; dont?: string[]; sources?: Source[] }
/** The "help her settle" guide (sleep/plan.md `wind_down`). */
export interface WindDown { tired_signs?: string[]; on_edge?: SettleBlock; still_playful?: SettleBlock; for_her?: string[] }
export type SessionKind = "nap" | "night";
export type SessionWhere = "cot" | "bed" | "arms" | "pram" | "car" | "carrier" | "nursery" | "other";
export const SESSION_WHERE: readonly (readonly [SessionWhere, string])[] = [
  ["cot", "Cot"], ["bed", "Bed"], ["arms", "In arms"], ["pram", "Pram"], ["car", "Car"], ["carrier", "Carrier"], ["nursery", "Nursery"], ["other", "Other"],
];
/** One timed nap or night; `end` is null while she is asleep. Times are ISO with an offset. */
export interface SleepSession { id: string; kind: SessionKind; start: string; end: string | null; down?: string; where?: SessionWhere; note?: string; auto_end?: boolean; logged_by?: string; logged_at?: string }
export interface NapWindow { start: string; end: string }
/** The bridge's answer to "where is she now and when is the next nap" (bridge/parentingNaps.mjs predictNextNap). */
export interface NapPrediction {
  state: "asleep" | "awake" | "unknown"; since: string | null; open_session_id: string | null;
  naps_today: number; day_sleep_minutes: number; night_sleep_minutes: number;
  window: NapWindow | null; slot: NapSlot | null; basis: "her_log" | "guideline" | null; bedtime: NapWindow | null; note: string;
}
export interface SleepPlan {
  naps?: NapsGuide; wind_down?: WindDown;
  title?: string; method?: string; status?: "draft" | "active" | "paused"; start_date?: string; updated_at?: string;
  steps?: SleepStep[]; night_waking?: Point[]; pauses?: { id: string; when: string; what: string; sources?: Source[] }[];
  safe_sleep?: Point[]; methods?: { id: string; method: string; summary: string; evidence: string; sources?: Source[] }[];
  history_fit?: HistoryFit; body?: string;
}
export interface Night {
  date: string; bedtime: string; asleep_at?: string; wakes?: number; feeds?: number; settle?: string; settled_by?: string; note?: string;
  logged_at?: string; logged_by?: string;
}
export interface Advice { text: string; why?: string; aim?: string; for_her?: string; sources?: Source[] }
export interface HelpSign { sign: string; action: string; sources?: Source[] }
export interface ProblemStep { id: string; week: number; title: string; detail?: string; move_on_when?: string; sources?: Source[] }
export interface Problem {
  id: string; title: string; seen: string; choices?: string[]; status: ProblemStatus; research: "pending" | "done" | "failed";
  created_at?: string; updated_at?: string; typical?: string; why?: string; dos?: Advice[]; donts?: Advice[];
  scripts?: { say: string; when?: string; aim?: string }[]; track?: string[]; get_help?: HelpSign[]; sources?: Source[]; body?: string;
  steps?: ProblemStep[]; current_step?: string; history_fit?: HistoryFit;
}
export interface Check { id: string; title: string; kind: "check" | "jab"; due?: string; where?: "uk" | "india" | "either"; sources?: Source[] }
export interface Summary {
  updated_at?: string; age?: string; focus?: Point[];
  next_milestones?: { id: string; title: string; area: Area; window?: string }[];
  plans?: { id: string; title: string; kind: string; ref?: string }[];
  checks?: Check[]; red_flags?: HelpSign[]; tip?: { text: string; problem?: string }; body?: string;
  what_works?: { calms?: WhatWorksItem[]; triggers?: WhatWorksItem[]; helped_before?: WhatWorksItem[]; didnt_help?: WhatWorksItem[] };
}
export type ReminderKind = "bedtime" | "sleep-log" | "habit-tip" | "weekly" | "sleep-step" | "nap";
export type ReminderDays = "daily" | "weekdays" | "weekends" | "sun";
export interface Reminder { id: string; kind: ReminderKind; time: string; days: ReminderDays; to: string[]; enabled: boolean; lead_minutes?: number }
export interface RemindersDoc { reminders: Reminder[]; defaults: boolean; parents: string[] }
export const REMINDER_LABEL: Record<ReminderKind, string> = {
  bedtime: "Bedtime routine", "sleep-log": "Log last night", "habit-tip": "Today's habit tip", weekly: "This week's update", "sleep-step": "Tonight's sleep step", nap: "Nap window",
};
export const NAP_LEADS = [5, 10, 15, 20, 30, 45, 60] as const;
export const REMINDER_DAYS: readonly (readonly [ReminderDays, string])[] = [["daily", "Every day"], ["weekdays", "Weekdays"], ["weekends", "Weekends"], ["sun", "Sundays"]];
/** Today's habit from the Mac: one `do` from a researched playbook, the same all day. */
export interface TipToday { problem_id: string; title: string; text: string; why?: string | null; aim?: string | null; sources?: Source[] }
export interface ContextDoc { person?: string; updated_at?: string; body?: string }
export interface WeeklyPoint { text: string; detail?: string; sources?: Source[] }
export interface WeeklySummary {
  incidents?: string[]; milestones_hit?: string[]; growth?: string;
  medications?: { name: string; dose_freq?: string; efficacy?: string }[];
  interventions?: { action: string; result?: string }[];
  feeding?: string; sleep?: string; activity?: string;
}
/** content/parenting/nila/weekly/<Sunday>.md: the week ahead, plus a summary of the week before (from the records only). */
export interface Weekly {
  id: string; week_start: string; week_end: string; week_number: number; age_text?: string; updated_at?: string;
  status_headline?: string; context?: WeeklyPoint[]; expect?: WeeklyPoint[];
  milestones_to_watch?: { id: string; title: string; area: Area }[];
  activities?: { text: string; why?: string; sources?: Source[] }[];
  summary?: WeeklySummary; body?: string;
}
export type FoodSlot = "breakfast" | "lunch" | "snack" | "dinner" | "other";
export type FoodAmount = "none" | "some" | "half" | "most" | "all";
export type FoodMilkKind = "breast" | "formula" | "water" | "other";
export type FoodPoo = "none" | "soft" | "hard" | "loose";
export type MenuDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export const FOOD_SLOTS: readonly (readonly [FoodSlot, string])[] = [["breakfast", "Breakfast"], ["lunch", "Lunch"], ["snack", "Snack"], ["dinner", "Dinner"], ["other", "Other"]];
export const FOOD_AMOUNTS: readonly (readonly [FoodAmount, string])[] = [["none", "None"], ["some", "A little"], ["half", "Half"], ["most", "Most"], ["all", "All"]];
export const MILK_KINDS: readonly (readonly [FoodMilkKind, string])[] = [["breast", "Breast"], ["formula", "Formula"], ["water", "Water"], ["other", "Other"]];
export const POO_KINDS: readonly (readonly [FoodPoo, string])[] = [["none", "None"], ["soft", "Soft"], ["hard", "Hard"], ["loose", "Loose"]];
export const MENU_DAYS: readonly MenuDay[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
export const MENU_KIND_LABEL = { nursery: "Nursery day", nanny: "Nanny day", home: "Home day" } as const;
export interface FoodGroup { id: string; name: string; portion: string; per_day: number; examples: string[]; for_her?: string; sources?: Source[] }
export interface FoodMenuRow { day: MenuDay; kind: keyof typeof MENU_KIND_LABEL; breakfast: string; lunch: string; snack: string; dinner: string; notes?: string }
/** content/parenting/nila/food/plan.md: how much and how often, by food group, with the rules and a 7-day menu. */
export interface FoodPlan {
  updated_at?: string; age_text?: string; weight_basis?: { value_kg: number; as_of: string; from: string };
  daily?: { meals: number; snacks: number; milk: { what: string; amount: string; when: string }[] };
  groups?: FoodGroup[];
  nutrients?: { id: string; name: string; target: string; how_dairy_free: string; sources?: Source[] }[];
  limits?: { id: string; text: string; why: string; sources?: Source[] }[];
  allergy_swaps?: { avoid: string; use_instead: string; why: string; sources?: Source[] }[];
  choking?: { text: string; sources?: Source[] }[];
  too_much_too_little?: { sign: string; means: string; action: string }[];
  menu?: FoodMenuRow[];
  history_fit?: HistoryFit; body?: string;
}
export interface FoodMeal { slot: FoodSlot; items: string; amount: FoodAmount; note?: string }
export interface FoodMilk { what: FoodMilkKind; amount_ml?: number; count?: number }
export interface FoodDay { date: string; meals: FoodMeal[]; milk: FoodMilk[]; poo?: FoodPoo; reaction?: string; logged_by?: string; logged_at?: string }
export interface FoodLogInput { date: string; slot?: FoodSlot; items?: string; amount?: FoodAmount; note?: string; milk?: FoodMilk[]; poo?: FoodPoo; reaction?: string }

export interface MilestoneResult { id?: string; title: string; action: "seen" | "emerging" | "added" | "none"; seen_on?: string; note?: string }
export interface MilestoneRequest { id: string; requested_at: string; status: "pending" | "done" | "failed"; result?: MilestoneResult[] }

export interface ParentingData {
  person: string;
  /** Records the Mac could not read (paths relative to content/). */
  broken?: string[];
  dob: string | null;
  summary: Summary | null;
  context: ContextDoc | null;
  milestones: { milestones?: Milestone[] } | null;
  catalog: { windows?: CatalogWindow[]; updated_at?: string } | null;
  sleep_plan: SleepPlan | null;
  sleep_log: Night[];
  /** Timed naps and nights from the last two weeks, newest first. */
  sleep_sessions: SleepSession[];
  nap_prediction: NapPrediction | null;
  food_plan: FoodPlan | null;
  /** This month's and last month's rows, newest first. */
  food_log: FoodDay[];
  problems: Problem[];
  asks: Ask[];
  tip_today: TipToday | null;
  /** The newest weekly dashboard, and every week's id (its Sunday), newest first. */
  weekly: Weekly | null;
  weeks: string[];
  jobs: HealthJob[];
  /** Every weekly dashboard by id, from the Firestore copy (the Mac's overview carries only the newest). */
  weekDocs?: Record<string, Weekly>;
  /** Free-text milestone notes sent to the Mac, newest first. Only the Mac's answer carries them. */
  milestone_requests?: MilestoneRequest[];
}

/** An error answer from the Mac, with the bridge's message (for example why a context edit was refused). */
export class ParentingHttpError extends HealthHttpError {
  constructor(status: number, readonly detail: string | null) { super(status); }
}

/** The phone's IANA time zone, sent on every parenting call so the Mac works out today, naps and reminders in it. */
export const phoneZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** "India Standard Time", the zone's long name as Intl gives it. */
export const zoneName = (zone: string = phoneZone()): string =>
  new Intl.DateTimeFormat("en-GB", { timeZone: zone, timeZoneName: "long" }).formatToParts(new Date()).find((x) => x.type === "timeZoneName")?.value ?? zone;

async function call(ctx: HealthCtx, path: string, method = "GET", body?: unknown): Promise<unknown> {
  // No network at all: fail at once instead of after the timeout.
  if (!navigator.onLine) throw new HealthOfflineError();
  const token = await ctx.getToken();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), API_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${ctx.base}/parenting/${PARENTING_PERSON}${path}`, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}`, "X-Timezone": phoneZone(), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      cache: "no-store",
      signal: ctl.signal,
    });
  } catch {
    throw new HealthOfflineError();
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const detail = await res.json().then((j: { error?: unknown }) => (typeof j?.error === "string" ? j.error : null), () => null);
    throw new ParentingHttpError(res.status, detail);
  }
  return res.json();
}

export interface NightInput { date: string; bedtime: string; asleep_at?: string; wakes?: number; feeds?: number; settle?: string; settled_by?: string; note?: string }

export const parentingApi = {
  get: async (ctx: HealthCtx): Promise<ParentingData> => {
    const d = (await call(ctx, "")) as Partial<ParentingData>;
    return {
      person: d.person ?? PARENTING_PERSON,
      dob: d.dob ?? null,
      summary: d.summary ?? null,
      context: d.context ?? null,
      milestones: d.milestones ?? null,
      catalog: d.catalog ?? null,
      sleep_plan: d.sleep_plan ?? null,
      sleep_log: d.sleep_log ?? [],
      sleep_sessions: d.sleep_sessions ?? [],
      nap_prediction: d.nap_prediction ?? null,
      food_plan: d.food_plan ?? null,
      food_log: d.food_log ?? [],
      problems: d.problems ?? [],
      asks: d.asks ?? [],
      tip_today: d.tip_today ?? null,
      weekly: d.weekly ?? null,
      weeks: d.weeks ?? [],
      jobs: d.jobs ?? [],
      broken: d.broken ?? [],
      milestone_requests: d.milestone_requests ?? [],
    };
  },
  milestone: (ctx: HealthCtx, m: { id?: string; title?: string; area?: Area; status?: MilestoneStatus; seen_on?: string; note?: string }) => call(ctx, "/milestones", "POST", m),
  /** Sends a free-text note about what she did; the Mac works out which milestones it covers. */
  describeMilestones: async (ctx: HealthCtx, text: string) => (await call(ctx, "/milestones/describe", "POST", { text })) as { request_id: string; job_id: string },
  sleep: (ctx: HealthCtx, night: NightInput) => call(ctx, "/sleep", "POST", night),
  problem: async (ctx: HealthCtx, text: string, choices: string[]) =>
    (await call(ctx, "/problems", "POST", choices.length ? { text, choices } : { text })) as { problem_id: string; duplicate: boolean },
  problemStatus: (ctx: HealthCtx, id: string, status: ProblemStatus) => call(ctx, `/problems/${encodeURIComponent(id)}`, "PATCH", { status }),
  problemStep: (ctx: HealthCtx, id: string, currentStep: string) => call(ctx, `/problems/${encodeURIComponent(id)}`, "PATCH", { current_step: currentStep }),
  sessionStart: (ctx: HealthCtx, s: { kind: SessionKind; where?: SessionWhere; down?: string; start?: string; end?: string }) => call(ctx, "/sleep/sessions/start", "POST", s),
  sessionStop: (ctx: HealthCtx, end?: string) => call(ctx, "/sleep/sessions/stop", "POST", end ? { end } : {}),
  /** Edits a session: `where` null and `note` "" clear them. */
  sessionEdit: (ctx: HealthCtx, id: string, patch: { kind?: SessionKind; start?: string; end?: string; down?: string | null; where?: SessionWhere | null; note?: string }) =>
    call(ctx, `/sleep/sessions/${encodeURIComponent(id)}`, "PATCH", patch),
  sessionDelete: (ctx: HealthCtx, id: string) => call(ctx, `/sleep/sessions/${encodeURIComponent(id)}`, "DELETE"),
  /** Asks the Mac for a fresh nap guide and settle guide; `duplicate` when one is already on its way. */
  napsRefresh: async (ctx: HealthCtx) => (await call(ctx, "/sleep/naps/refresh", "POST", {})) as { job_id: string | null; duplicate: boolean },
  foodLog: (ctx: HealthCtx, row: FoodLogInput) => call(ctx, "/food/log", "POST", row),
  /** Asks the Mac for a fresh food plan; `duplicate` when one is already on its way. */
  foodRefresh: async (ctx: HealthCtx) => (await call(ctx, "/food/refresh", "POST", {})) as { job_id: string | null; duplicate: boolean },
  ask: (ctx: HealthCtx, question: string) => call(ctx, "/ask", "POST", { question }),
  note: (ctx: HealthCtx, section: string, text: string) => call(ctx, "/notes", "POST", { section, text }),
  context: async (ctx: HealthCtx) => (await call(ctx, "/context")) as { body: string },
  saveContext: (ctx: HealthCtx, body: string) => call(ctx, "/context", "PUT", { body }),
  /** Asks the Mac for this week's dashboard; `duplicate` when one is already on its way. */
  summariseWeek: async (ctx: HealthCtx) => (await call(ctx, "/weekly", "POST", {})) as { job_id: string | null; duplicate: boolean },
  week: async (ctx: HealthCtx, id: string) => (await call(ctx, `/weekly/${encodeURIComponent(id)}`)) as Weekly,
  reminders: async (ctx: HealthCtx) => (await call(ctx, "/reminders")) as RemindersDoc,
  saveReminders: async (ctx: HealthCtx, reminders: Reminder[]) => (await call(ctx, "/reminders", "PUT", { reminders })) as RemindersDoc,
};

export type ParentingStatus = "loading" | "ready" | "offline" | "error";
export interface UseParenting { data: ParentingData | null; status: ParentingStatus; refresh: () => Promise<void>; ctx: HealthCtx; live: boolean | null; stale: Stale | null }

const isOffline = (e: unknown) => e instanceof HealthOfflineError;

/** The page data from the Firestore copy: the display fields only. The working details (context, questions and
 * answers, logs, jobs) stay empty until the Mac answers. Null while nothing is published. */
export function parentingFromViews(docs: ViewDocs): ParentingData | null {
  const meta = docs.meta as { person?: string; dob?: string | null; weeks?: string[]; tip_today?: TipToday | null } | undefined;
  if (!meta) return null;
  const weekDocs = withPrefix<Weekly>(docs, "week_");
  const weeks = meta.weeks ?? [];
  return {
    person: meta.person ?? PARENTING_PERSON,
    dob: meta.dob ?? null,
    summary: (docs.summary as Summary | undefined) ?? null,
    context: null,
    milestones: (docs.milestones as ParentingData["milestones"]) ?? null,
    catalog: (docs.catalog as ParentingData["catalog"]) ?? null,
    sleep_plan: (docs.sleep_plan as SleepPlan | undefined) ?? null,
    sleep_log: [],
    sleep_sessions: [],
    nap_prediction: null,
    food_plan: (docs.food_plan as FoodPlan | undefined) ?? null,
    food_log: [],
    problems: Object.values(withPrefix<Problem>(docs, "problem_")).sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")),
    asks: [],
    tip_today: meta.tip_today ?? null,
    weekly: weeks.length ? weekDocs[weeks[0]] ?? null : null,
    weeks,
    jobs: [],
    broken: [],
    weekDocs,
  };
}

const withWeekDocs = (full: ParentingData, published: ParentingData | null): ParentingData => ({ ...full, weekDocs: published?.weekDocs });
const parentingBusy = (d: ParentingData) => d.jobs.some(jobIsActive);

/** Page data: the Firestore copy at once, then GET /parenting/nila from the Mac (which adds the working details);
 * polls every 10 s while a research job is queued or running. Without the Mac the copy stays and `live` is false;
 * without a network (or the Mac) the last saved data shows and `stale` says when it was saved. */
export function useParenting(): UseParenting {
  const ctx = useHealthApi();
  const load = useCallback(() => parentingApi.get(ctx), [ctx]);
  const options = useMemo(() => ({ area: "parenting" as const, person: PARENTING_PERSON, compose: parentingFromViews, load, isOffline, polling: parentingBusy, pollMs: POLL_MS, merge: withWeekDocs, offline: true }), [load]);
  const rc = useReadCopy(options);
  return { ...rc, ctx };
}

/** A problem raised with the "Prevention" choice is a guide (good habits to keep), not a current problem. */
export const isGuide = (pr: Pick<Problem, "choices">) => !!pr.choices?.includes("Prevention") && !isStepPlan(pr);

/** A problem raised with the "Step by step" choice: a gradual plan the family moves through one step at a time. */
export const isStepPlan = (pr: Pick<Problem, "choices">) => !!pr.choices?.includes("Step by step");

/** The plan's steps in order (by week, then as written). */
export const orderedSteps = (pr: Pick<Problem, "steps">) =>
  (pr.steps ?? []).map((s, i) => ({ s, i })).sort((a, b) => a.s.week - b.s.week || a.i - b.i).map(({ s }) => s);

/** True while the Mac has a research job of this task (or any task) queued or running. */
export function researching(data: ParentingData, task?: string): boolean {
  return data.jobs.some((j) => jobIsActive(j) && (!task || j.task === task));
}

// ---- age ----

/** Whole months and the days left over between a date of birth and `today` (both YYYY-MM-DD). Null when unusable. */
export function ageParts(dob: string | null | undefined, today: string = dayKey()): { months: number; days: number } | null {
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob ?? "");
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today);
  if (!b || !t || today < (dob as string)) return null;
  let months = (+t[1] - +b[1]) * 12 + (+t[2] - +b[2]);
  if (+t[3] < +b[3]) months--;
  // The day of the month she turned `months` old, clamped to the month's length (born on the 31st).
  const y = +b[1] + Math.floor((+b[2] - 1 + months) / 12);
  const m = ((+b[2] - 1 + months) % 12) + 1;
  const last = new Date(y, m, 0).getDate();
  const anchor = `${y}-${String(m).padStart(2, "0")}-${String(Math.min(+b[3], last)).padStart(2, "0")}`;
  return { months, days: daysBetween(anchor, today) };
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/** "11 months" (under two), "2 years 3 months" after; with days, "11 months and 3 days". */
export function ageLabel(dob: string | null | undefined, today: string = dayKey(), withDays = false): string | null {
  const a = ageParts(dob, today);
  if (!a) return null;
  if (a.months < 1) return plural(daysBetween(dob as string, today), "day");
  const main = a.months < 24 ? plural(a.months, "month") : `${plural(Math.floor(a.months / 12), "year")}${a.months % 12 ? ` ${plural(a.months % 12, "month")}` : ""}`;
  return withDays && a.days > 0 ? `${main} and ${plural(a.days, "day")}` : main;
}

// ---- milestones ----

/** Catalog windows from the one she is in now onwards; all of them when her age is unknown. */
export function comingWindows(windows: CatalogWindow[], months: number | null): CatalogWindow[] {
  const sorted = [...windows].sort((a, b) => a.from_months - b.from_months);
  return months === null ? sorted : sorted.filter((w) => w.to_months >= months);
}

/** Her whole months when a milestone was seen; null without a date of birth or a usable date. */
export function ageAtSeen(dob: string | null | undefined, seenOn: string | undefined): number | null {
  return ageParts(dob, seenKey(seenOn))?.months ?? null;
}

/** How a month age sits against a window: early or late by whole months, otherwise on time. */
export function windowTiming(w: CatalogWindow, months: number): { kind: "early" | "on-time" | "late"; by: number } {
  if (months < w.from_months) return { kind: "early", by: w.from_months - months };
  if (months > w.to_months) return { kind: "late", by: months - w.to_months };
  return { kind: "on-time", by: 0 };
}

// ---- sleep ----

/** The plan's week for `today`: week 1 from `start_date`, capped at the last week. Null without steps. */
export function currentWeek(plan: SleepPlan | null, today: string = dayKey()): number | null {
  const weeks = (plan?.steps ?? []).map((s) => s.week).filter((w) => Number.isFinite(w));
  if (!weeks.length) return null;
  const first = Math.min(...weeks);
  const last = Math.max(...weeks);
  if (!plan?.start_date || !/^\d{4}-\d{2}-\d{2}$/.test(plan.start_date)) return first;
  const elapsed = daysBetween(plan.start_date, today);
  if (elapsed < 0) return first;
  return Math.min(last, Math.max(first, Math.floor(elapsed / 7) + 1));
}

/** Minutes after noon, so evening times and the small hours average in the right order. */
const fromNoon = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return ((h + 12) % 24) * 60 + m;
};
const clock = (mins: number) => {
  const total = (Math.round(mins) + 12 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export interface SleepTrend {
  nights: number; logged: number; bedtime: string | null; settleMins: number | null; wakes: number | null; feeds: number | null;
  /** One entry per night, oldest first; null when the night was not logged. */
  series: { date: string; wakes: number | null }[];
}

/** The last `n` nights ending last night (the evening before `today`). */
export function sleepTrend(log: Night[], n: number, today: string = dayKey()): SleepTrend {
  const byDate = new Map(log.map((x) => [x.date, x]));
  const dates = Array.from({ length: n }, (_, i) => addDays(today, i - n));
  const rows = dates.map((d) => byDate.get(d)).filter((x): x is Night => !!x);
  const settle = rows.flatMap((x) => (x.asleep_at ? [((fromNoon(x.asleep_at) - fromNoon(x.bedtime)) + 1440) % 1440] : []));
  const bed = avg(rows.map((x) => fromNoon(x.bedtime)));
  return {
    nights: n,
    logged: rows.length,
    bedtime: bed === null ? null : clock(bed),
    settleMins: avg(settle),
    wakes: avg(rows.flatMap((x) => (typeof x.wakes === "number" ? [x.wakes] : []))),
    feeds: avg(rows.flatMap((x) => (typeof x.feeds === "number" ? [x.feeds] : []))),
    series: dates.map((d) => ({ date: d, wakes: typeof byDate.get(d)?.wakes === "number" ? (byDate.get(d)?.wakes as number) : null })),
  };
}

/** The evening a night log is about: last night before midday, tonight after. */
export function defaultNight(now: Date = new Date()): string {
  return now.getHours() < 12 ? addDays(dayKey(now), -1) : dayKey(now);
}

// ---- naps ----

/** Re-renders every `everyMs` with the current time in ms, for live "awake for" timers. */
export function useNow(everyMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

/** "1 h 25 m", "40 m", "2 h"; whole minutes, never negative. */
export function fmtDuration(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes));
  const h = Math.floor(m / 60);
  return h === 0 ? `${m} m` : m % 60 === 0 ? `${h} h` : `${h} h ${m % 60} m`;
}

/** "12:40" in the device's time zone from an ISO time. */
export const hm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Minutes from `iso` to `now` (ms). */
export const minutesSince = (iso: string, now: number) => (now - Date.parse(iso)) / 60_000;

/** Longest a nap or night is taken to last; the bridge closes an open session this old by itself (parentingNaps.mjs). */
export const SESSION_CAP_MINUTES: Record<SessionKind, number> = { nap: 240, night: 840 };

/** "Awake for 1 h 25 m", "Asleep for 40 m", "Timer still running since Sat 14:10. Did she wake up?" when the open session is
 *  past its cap (the Mac was offline), or "No sleep logged yet". `sessions` holds the open one. */
export function statusLine(p: NapPrediction | null, now: number, sessions: SleepSession[]): string {
  if (!p || p.state === "unknown" || !p.since) return "No sleep logged yet";
  const open = p.state === "asleep" ? sessions.find((s) => s.id === p.open_session_id) : undefined;
  if (open && minutesSince(open.start, now) > SESSION_CAP_MINUTES[open.kind]) {
    const day = new Date(open.start).toLocaleDateString("en-GB", { weekday: "short" });
    return `Timer still running since ${day} ${hm(open.start)}. Did she wake up?`;
  }
  return `${p.state === "asleep" ? "Asleep" : "Awake"} for ${fmtDuration(minutesSince(p.since, now))}`;
}

/** Where `now` (ms) is against a window: before it opens, inside it, or after it closed. */
export const windowPhase = (w: NapWindow, now: number): "before" | "open" | "after" => (now < Date.parse(w.start) ? "before" : now <= Date.parse(w.end) ? "open" : "after");

/** "Next nap 12:40 to 13:10", the one-line version for Today; "Asleep for 40 m" while she sleeps; null with nothing to say. */
export function napLine(p: NapPrediction | null, now: number, sessions: SleepSession[]): string | null {
  if (!p) return null;
  if (p.state === "asleep") return statusLine(p, now, sessions);
  if (p.state === "awake" && p.window) return `Next nap ${hm(p.window.start)} to ${hm(p.window.end)}`;
  return null;
}

/** A nap by default before 18:00, night sleep from then on. */
export const defaultSessionKind = (d: Date = new Date()): SessionKind => (d.getHours() >= 18 ? "night" : "nap");

/** The 24 hours shown on the timeline: from the last 06:00 (device time) to the next, as epoch ms. */
export function sleepDay(now: number): { start: number; end: number } {
  const d = new Date(now);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 6, 0, 0, 0);
  if (start.getTime() > now) start.setDate(start.getDate() - 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

/** The 06:00 to 06:00 day `back` days before the one holding `now` (0 is today), as epoch ms. */
export function sleepDayBack(now: number, back: number): { start: number; end: number } {
  const today = sleepDay(now);
  const start = new Date(today.start);
  start.setDate(start.getDate() - back);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

/** How far back the day switcher goes: the overview only carries 14 days of sessions. */
export const MAX_DAYS_BACK = 13;

/** "Today", "Yesterday" or "Sat 10 Oct" for a day `back` days ago starting at `start` (ms). */
export function dayLabel(back: number, start: number): string {
  if (back === 0) return "Today";
  if (back === 1) return "Yesterday";
  const d = new Date(start);
  return `${d.toLocaleDateString("en-GB", { weekday: "short" })} ${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })}`;
}

/** A time field's HH:MM as an ISO time: today, or yesterday when that is still ahead of `now` (ms). */
export function recentTime(hhmm: string, now: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(now);
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0);
  if (t.getTime() > now) t.setDate(t.getDate() - 1);
  return t.toISOString();
}

export interface SleepDay {
  start: number; end: number;
  /** The day's sessions, oldest first. */
  sessions: SleepSession[];
  napCount: number; dayMinutes: number; nightMinutes: number;
}

/** Sessions on the 06:00 to 06:00 day holding `now`. Naps count by their start, night sleep by its end (last night's
 * sleep counts today); an open session runs to `now`. */
export function sleepToday(sessions: SleepSession[], now: number, day: { start: number; end: number } = sleepDay(now)): SleepDay {
  const { start, end } = day;
  const stop = (s: SleepSession) => (s.end ? Date.parse(s.end) : now);
  const inDay = sessions.filter((s) => (s.kind === "nap" ? Date.parse(s.start) : stop(s)) >= start && (s.kind === "nap" ? Date.parse(s.start) : stop(s)) < end);
  const mins = (s: SleepSession) => Math.max(0, stop(s) - Date.parse(s.start)) / 60_000;
  const naps = inDay.filter((s) => s.kind === "nap");
  return {
    start, end,
    sessions: [...inDay].sort((a, b) => Date.parse(a.start) - Date.parse(b.start)),
    napCount: naps.length,
    dayMinutes: Math.round(naps.reduce((n, s) => n + mins(s), 0)),
    nightMinutes: Math.round(inDay.filter((s) => s.kind === "night").reduce((n, s) => n + mins(s), 0)),
  };
}

/** Left and width, in percent of the timeline, for a session clipped to the day. */
export function barSpan(s: SleepSession, day: { start: number; end: number }, now: number): { left: number; width: number } {
  const a = Math.max(day.start, Date.parse(s.start));
  const b = Math.min(day.end, s.end ? Date.parse(s.end) : now);
  const span = day.end - day.start;
  return { left: ((a - day.start) / span) * 100, width: Math.max(0.6, ((Math.max(a, b) - a) / span) * 100) };
}

/** A put-down time field's HH:MM as an ISO time at or before `start` (an ISO time): the same day, or the day before
 * when the clock time is later than the start's (put down 23:50, asleep 00:05). */
export const downIso = (start: string, hhmm: string): string => isoOnDay(start, hhmm, hhmm > hm(start) ? -1 : 0);

/** A time field's HH:MM on the local calendar day of `base` (an ISO time), as an ISO string. */
export function isoOnDay(base: string, hhmm: string, plusDays = 0): string {
  const d = new Date(base);
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + plusDays, h, m, 0, 0).toISOString();
}

// ---- context.md ----

/** The fixed sections of context.md, in order (lib/schema.ts PARENTING_CONTEXT_SECTIONS). */
export const CONTEXT_SECTIONS = ["Parenting aims", "Sleep", "Feeding", "Behaviour", "Health", "Routines and environment", "Carers and languages", "Open worries"];

export interface ContextLine { date?: string; who?: string; text: string }
export interface ContextSection { heading: string; lines: ContextLine[] }

/** The intro and `##` sections of context.md, each a list of bullets (dated `- YYYY-MM-DD (Who): text` or plain);
 * continuation lines join their bullet. */
export function parseContext(body: string): { intro: string; sections: ContextSection[] } {
  const intro: string[] = [];
  const sections: ContextSection[] = [];
  let current: ContextSection | null = null;
  for (const raw of body.split("\n")) {
    const heading = /^##\s+(.+?)\s*$/.exec(raw);
    if (heading) {
      current = { heading: heading[1], lines: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      if (!/^#\s/.test(raw)) intro.push(raw);
      continue;
    }
    const bullet = /^\s*[-*]\s+(.*)$/.exec(raw);
    if (bullet) {
      const dated = /^(\d{4}-\d{2}-\d{2}) \(([^()]{1,60})\): (.*)$/.exec(bullet[1]);
      current.lines.push(dated ? { date: dated[1], who: dated[2], text: dated[3] } : { text: bullet[1] });
    } else if (raw.trim()) {
      const last = current.lines[current.lines.length - 1];
      if (last && /^\s/.test(raw)) last.text += ` ${raw.trim()}`;
      else current.lines.push({ text: raw.trim() });
    }
  }
  return { intro: intro.join("\n").trim(), sections };
}

// ---- weekly ----

/** "Sun 4 Oct" from a YYYY-MM-DD, read as a local calendar day. */
export function fmtWeekday(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  return new Date(dayMs(ymd)).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** "Sun 4 Oct – Sat 10 Oct" for the week starting on the Sunday `start`. */
export function weekRange(start: string): string {
  return `${fmtWeekday(start)} – ${fmtWeekday(addDays(start, 6))}`;
}

/** "11–17 Oct", or "28 Sep – 4 Oct" across a month end, for the week starting on the Sunday `start`. */
export function weekRangeShort(start: string): string {
  const fmt = (ymd: string, opts: Intl.DateTimeFormatOptions) => new Date(dayMs(ymd)).toLocaleDateString("en-GB", opts);
  const end = addDays(start, 6);
  const sameMonth = fmt(start, { month: "short" }) === fmt(end, { month: "short" });
  return sameMonth
    ? `${fmt(start, { day: "numeric" })}–${fmt(end, { day: "numeric", month: "short" })}`
    : `${fmt(start, { day: "numeric", month: "short" })} – ${fmt(end, { day: "numeric", month: "short" })}`;
}

/** The Sunday that starts the week before the week starting on `start`: the week a weekly's summary covers. */
export const summaryWeekStart = (start: string) => addDays(start, -7);

/** When a milestone was seen: "10 Oct 2026", "Mar 2026" for a month-only date, with "about " for an approximate one. */
export function fmtSeen(seenOn: string | undefined, approx = false): string {
  const m = /^(\d{4})-(\d{2})$/.exec(seenOn ?? "");
  const text = m ? new Date(+m[1], +m[2] - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : fmtYmd(seenOn);
  return text && approx ? `about ${text}` : text;
}

/** Sort key for a seen_on: a month-only date sorts as the 1st of that month. */
export const seenKey = (seenOn: string | undefined) => (seenOn && /^\d{4}-\d{2}$/.test(seenOn) ? `${seenOn}-01` : seenOn ?? "");

/** "10 Oct 2026" from a YYYY-MM-DD, read as a local calendar day. */
export function fmtYmd(ymd: string | undefined): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  return new Date(dayMs(ymd)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ---- food ----

/** The menu row for a date (YYYY-MM-DD), by weekday. */
export function menuFor(plan: FoodPlan | null, date: string = dayKey()): FoodMenuRow | null {
  if (!plan?.menu?.length) return null;
  const day = MENU_DAYS[new Date(dayMs(date)).getDay()];
  return plan.menu.find((m) => m.day === day) ?? null;
}

/** The menu line for one slot, or null for "other". */
export const menuLine = (row: FoodMenuRow | null, slot: FoodSlot): string | null => (row && slot !== "other" ? row[slot] : null);

const AMOUNT_SHARE: Record<FoodAmount, number> = { none: 0, some: 0.25, half: 0.5, most: 0.75, all: 1 };
const SKIP_WORDS = new Set(["and", "with", "the", "food", "foods", "other", "some"]);
const words = (t: string) => (t.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []).filter((w) => !SKIP_WORDS.has(w));

/** An estimate of portions eaten per food group today: a logged meal counts for every group whose name or examples
 * share a word with what was typed, by how much she ate. Rounded to a quarter portion, capped at the target. */
export function groupProgress(plan: FoodPlan | null, day: FoodDay | undefined): { group: FoodGroup; have: number }[] {
  return (plan?.groups ?? []).map((group) => {
    const vocab = new Set([...group.examples, group.name].flatMap(words));
    const have = (day?.meals ?? []).reduce((sum, m) => (words(m.items).some((w) => vocab.has(w)) ? sum + AMOUNT_SHARE[m.amount] : sum), 0);
    return { group, have: Math.min(group.per_day, Math.round(have * 4) / 4) };
  });
}

/** Today's row of the food log, if any. */
export const foodDayFor = (data: Pick<ParentingData, "food_log">, date: string = dayKey()) => data.food_log.find((d) => d.date === date);
