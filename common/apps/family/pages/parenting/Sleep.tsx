'use client';

import { useEffect, useState } from "react";
import { useLocation } from "@/common/apps/family/router";
import { SectionTitle, Segmented, outlineBtn, primaryBtn } from "@/common/apps/family/components/ui";
import { ChoiceChips, PointList, ResearchComing } from "@/common/apps/family/components/parenting/parts";
import { Collapsible, NowCard, PlanSteps, TriedBefore } from "@/common/apps/family/components/parenting/plan";
import Reminders from "@/common/apps/family/components/parenting/Reminders";
import { NapStatus, SettleGuide, SleepTimeline } from "@/common/apps/family/components/parenting/Naps";
import Spinner from "@/common/apps/family/components/Spinner";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { useData } from "@/common/apps/family/hooks/useData";
import { addDays, dayKey, fmtNum } from "@/common/apps/family/lib/fitness";
import { HealthOfflineError } from "@/common/apps/family/lib/health";
import {
  ParentingHttpError, currentWeek, defaultNight, fmtYmd, hm, parentingApi, researching, sleepDayBack, sleepTrend,
  type Night, type NightInput, type ParentingData, type SleepPlan, type SleepSession, type UseParenting,
} from "@/common/apps/family/lib/parenting";

const SETTLE = ["Fed to sleep", "Rocked", "Patted", "Stayed beside her", "Settled on her own"];
const EVIDENCE: Record<string, string> = { strong: "Strong evidence", moderate: "Moderate evidence", weak: "Weak evidence", uncertain: "Uncertain" };
const PAUSE: Record<string, string> = { illness: "Illness", teething: "Teething", travel: "Travel", other: "Other" };

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="min-w-0">
      <span className="mb-1 block text-sm font-semibold text-muted">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= 0} onClick={() => onChange(value - 1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-lg font-bold disabled:opacity-40">−</button>
        <span className="w-8 text-center text-lg font-extrabold" data-testid={`count-${label.toLowerCase()}`}>{value}</span>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= 30} onClick={() => onChange(value + 1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-lg font-bold disabled:opacity-40">+</button>
      </div>
    </div>
  );
}

/** A second log for the same night replaces the first on the Mac.
 * "Bed 19:00 · asleep 19:30 · 2 wakes · 1 feed · Patted · Robin" for one logged night. */
function nightLine(n: Night): string {
  return [`Bed ${n.bedtime}`, n.asleep_at && `asleep ${n.asleep_at}`, typeof n.wakes === "number" && `${n.wakes} ${n.wakes === 1 ? "wake" : "wakes"}`, typeof n.feeds === "number" && `${n.feeds} ${n.feeds === 1 ? "feed" : "feeds"}`, n.settle, n.settled_by].filter(Boolean).join(" · ");
}

const split = (v: string | undefined) => (v ? v.split(", ").filter(Boolean) : []);

/** The night log: wakes and feeds, how she settled, who settled her and notes. The evening comes from the day switcher.
 * Bedtime and asleep-at come from that evening's night timer session when there is one; only without it are they typed. */
function NightForm({ p, who, title, date: night, initial, session, onSaved }: { p: UseParenting; who: string[]; title: string; date: string; initial?: Night; session?: SleepSession; onSaved?: () => void }) {
  const toast = useToast();
  const today = dayKey();
  const date = initial?.date ?? night;
  const [bedtime, setBedtime] = useState(initial?.bedtime ?? "19:00");
  const [asleep, setAsleep] = useState(initial?.asleep_at ?? "");
  const [wakes, setWakes] = useState(initial?.wakes ?? 0);
  const [feeds, setFeeds] = useState(initial?.feeds ?? 0);
  const [settle, setSettle] = useState<string[]>(split(initial?.settle));
  const [by, setBy] = useState<string[]>(split(initial?.settled_by));
  const [note, setNote] = useState(initial?.note ?? "");
  const [busy, setBusy] = useState(false);
  const bed = session ? hm(session.down ?? session.start) : bedtime;
  const asleepAt = session ? hm(session.start) : asleep;

  async function save() {
    const entry: NightInput = { date, bedtime: bed, wakes, feeds };
    if (asleepAt) entry.asleep_at = asleepAt;
    if (settle.length) entry.settle = settle.join(", ");
    if (by.length) entry.settled_by = by.join(", ");
    if (note.trim()) entry.note = note.trim();
    setBusy(true);
    try {
      await parentingApi.sleep(p.ctx, entry);
      toast.show({ message: `Saved the night of ${fmtYmd(date)}` });
      setNote("");
      await p.refresh();
      onSaved?.();
    } catch (e) {
      toast.show({ message: e instanceof ParentingHttpError && e.status === 400 && e.detail ? `Not saved: ${e.detail}` : e instanceof HealthOfflineError ? "Could not reach the Mac, try again" : "Could not save that, try again", error: true });
    }
    setBusy(false);
  }

  return (
    <form id="log" className="card space-y-3 !p-4" aria-label="Log a night" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <p className="font-bold">{title}</p>
      {session ? (
        <p className="text-sm text-muted" data-testid="night-from-timer">Bed {bed} · asleep {asleepAt}, from the timer</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <label className="block min-w-0">
            <span className="mb-1 block text-sm font-semibold text-muted">Bedtime</span>
            <input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} required className="field !min-h-11 min-w-0" />
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-sm font-semibold text-muted">Asleep at</span>
            <input type="time" value={asleep} onChange={(e) => setAsleep(e.target.value)} className="field !min-h-11 min-w-0" />
          </label>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Counter label="Wakes" value={wakes} onChange={setWakes} />
        <Counter label="Feeds" value={feeds} onChange={setFeeds} />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-muted">How she settled</p>
        <ChoiceChips label="How she settled" options={SETTLE} value={settle} onChange={setSettle} />
      </div>
      {who.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-muted">Who settled her</p>
          <ChoiceChips label="Who settled her" options={who} value={by} onChange={setBy} />
        </div>
      )}
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-muted">Notes (optional)</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} className="field" />
      </label>
      <button type="submit" disabled={busy || !bed || date > today} className={`${primaryBtn} w-full`}>{busy ? <><Spinner />Saving...</> : "Save night"}</button>
    </form>
  );
}

function Trend({ data }: { data: ParentingData }) {
  const [n, setN] = useState<"7" | "14" | "30">("7");
  const t = sleepTrend(data.sleep_log, Number(n));
  const max = Math.max(1, ...t.series.map((s) => s.wakes ?? 0));
  const tiles: [string, string][] = [
    ["Nights logged", `${t.logged} of ${t.nights}`],
    ["Usual bedtime", t.bedtime ?? "Not yet"],
    ["Time to fall asleep", t.settleMins === null ? "Not yet" : `${Math.round(t.settleMins)} min`],
    ["Wakes a night", t.wakes === null ? "Not yet" : fmtNum(t.wakes)],
    ["Feeds a night", t.feeds === null ? "Not yet" : fmtNum(t.feeds)],
  ];
  return (
    <section className="space-y-3" aria-label="Trend">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <SectionTitle title="Trend" />
        <div className="w-full sm:w-auto"><Segmented label="Nights" value={n} onChange={setN} options={[["7", "7 nights"], ["14", "14 nights"], ["30", "30 nights"]] as const} /></div>
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5" data-testid="sleep-trend">
        {tiles.map(([k, v]) => (
          <div key={k} className="card !px-3 !py-2.5">
            <dt className="text-sm text-muted">{k}</dt>
            <dd className="text-lg font-extrabold">{v}</dd>
          </div>
        ))}
      </dl>
      {t.logged > 0 && (
        <div className="card !p-3.5">
          <p className="mb-2 text-sm font-semibold text-muted">Wakes each night, oldest first</p>
          <div className="flex h-20 items-end gap-[2px]" role="img" aria-label={`Wakes over the last ${n} nights`}>
            {t.series.map((s) => (
              <div key={s.date} className="flex h-full min-w-0 flex-1 items-end" title={`${fmtYmd(s.date)}: ${s.wakes ?? "not logged"}`}>
                <div className={`w-full rounded-t ${s.wakes === null ? "h-[3px] bg-border" : "bg-domain/70"}`} style={s.wakes === null ? undefined : { height: `${Math.max(6, (s.wakes / max) * 100)}%` }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function PlanView({ plan, week }: { plan: SleepPlan; week: number | null }) {
  const steps = [...(plan.steps ?? [])].sort((a, b) => a.week - b.week);
  const now = steps.filter((s) => s.week === week);
  const weeks = [...new Set(steps.map((s) => s.week))];
  return (
    <div className="space-y-7">
      {now.length > 0 && <NowCard label={`Tonight, week ${week}`} steps={now} testId="tonight-step" />}
      <TriedBefore fit={plan.history_fit} />
      <PlanSteps
        label="The plan"
        title={plan.title || "The plan"}
        count={[plan.method, plan.status === "paused" ? "Paused" : plan.status === "draft" ? "Not started" : null, plan.start_date ? `Started ${fmtYmd(plan.start_date)}` : null].filter(Boolean).join(" · ") || undefined}
        groups={weeks.map((w) => ({ key: String(w), heading: `Week ${w}`, current: w === week, currentLabel: "This week", steps: steps.filter((s) => s.week === w) }))}
      />

      {/* Reference sections sit closed so the plan stays a short page; each heading shows how many points it holds. */}
      {!!plan.night_waking?.length && (
        <Collapsible title="When she wakes in the night" count={plan.night_waking.length}>
          <div className="card !px-3.5 !py-1"><PointList items={plan.night_waking} label="When she wakes" /></div>
        </Collapsible>
      )}
      {!!plan.pauses?.length && (
        <Collapsible title="When to pause the plan" count={plan.pauses.length}>
          <div className="card !px-3.5 !py-1">
            <PointList label="When to pause" items={plan.pauses.map((x) => ({ id: x.id, text: `${PAUSE[x.when] ?? x.when}: ${x.what}`, sources: x.sources }))} />
          </div>
        </Collapsible>
      )}
      {!!plan.safe_sleep?.length && (
        <Collapsible title="Safe sleep checks" count={plan.safe_sleep.length}>
          <div className="card !px-3.5 !py-1"><PointList items={plan.safe_sleep} label="Safe sleep checks" /></div>
        </Collapsible>
      )}
      {!!plan.methods?.length && (
        <Collapsible title="What the evidence shows" count={plan.methods.length}>
          <div className="card !px-3.5 !py-1">
            <PointList label="What the evidence shows" items={plan.methods.map((m) => ({ id: m.id, text: `${m.method} (${(EVIDENCE[m.evidence] ?? m.evidence).toLowerCase()})`, detail: m.summary, sources: m.sources }))} />
          </div>
        </Collapsible>
      )}
    </div>
  );
}

type View = "today" | "plan" | "trends" | "reminders";
const VIEWS = [["today", "Dashboard"], ["plan", "Plan"], ["trends", "Trends"], ["reminders", "Reminders"]] as const;

/** The view a link asks for: ?log=1 is Today, #settle (and the old ?view=settle) is Plan, #reminders is
 * Reminders, else ?view=. */
function linkedView(search: string, hash: string): View | null {
  const q = new URLSearchParams(search);
  if (q.get("log") === "1") return "today";
  if (hash === "#settle" || q.get("view") === "settle") return "plan";
  if (hash === "#reminders") return "reminders";
  const v = q.get("view");
  return VIEWS.some(([k]) => k === v) ? (v as View) : null;
}

export default function Sleep({ p, data }: { p: UseParenting; data: ParentingData }) {
  const { people } = useData();
  const parents = people.filter((x) => x.id !== "nila" && x.name).map((x) => String(x.name).split(" ")[0]);
  const who = parents.length ? [...parents, "Together"] : [];
  const plan = data.sleep_plan;
  const recent = data.sleep_log.slice(0, 7);
  const { search, hash } = useLocation();
  const wantsLog = new URLSearchParams(search).get("log") === "1";
  const [back, setBack] = useState(0);
  const [editing, setEditing] = useState(false);
  const day = sleepDayBack(Date.now(), back);
  // Today follows the time of day (last night before midday, tonight after); an earlier day is that evening.
  const nightDate = back === 0 ? defaultNight() : dayKey(new Date(day.start));
  const last = data.sleep_log.find((n) => n.date === nightDate);
  const noonOf = new Date(`${nightDate}T12:00:00`).getTime();
  const nightSession = data.sleep_sessions.find((s) => s.kind === "night" && Date.parse(s.start) >= noonOf && Date.parse(s.start) < noonOf + 24 * 3_600_000);
  const nightTitle = nightDate === dayKey() ? "Tonight" : nightDate === addDays(dayKey(), -1) ? "Last night" : `Night of ${fmtYmd(nightDate)}`;
  const [view, setView] = useState<View>(linkedView(search, hash) ?? "today");
  useEffect(() => {
    const v = linkedView(search, hash);
    if (v) setView(v);
  }, [search, hash]);
  // A reminder opens /nila/sleep?log=1: bring the night log into view and put the cursor in it. #reminders
  // (from Today) opens the Reminders view; #settle opens Plan at the settle guide.
  useEffect(() => {
    if (wantsLog) {
      if (view !== "today") return;
      const form = document.getElementById("log");
      form?.scrollIntoView?.({ block: "start" });
      form?.querySelector<HTMLInputElement>("input")?.focus();
    } else if (hash === "#reminders" || hash === "#settle") {
      document.getElementById(hash.slice(1))?.scrollIntoView?.({ block: "start" });
    }
  }, [wantsLog, hash, editing, view]);

  return (
    <div className="space-y-6">
      <Segmented center label="Sleep view" value={view} onChange={setView} options={VIEWS} />
      {view === "today" && (
        <div className="space-y-8">
          <SleepTimeline
            p={p}
            data={data}
            back={back}
            onBack={(n) => { setBack(n); setEditing(false); }}
            top={back === 0 ? <NapStatus p={p} data={data} /> : undefined}
            middle={last && !editing && !wantsLog ? (
              <section className="card flex flex-wrap items-center gap-3 !p-4" aria-label="Night log" data-testid="last-night">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{nightTitle}: logged</p>
                  <p className="text-sm text-muted">{nightLine(last)}</p>
                </div>
                <button type="button" onClick={() => setEditing(true)} className={outlineBtn}>Edit</button>
              </section>
            ) : (
              <NightForm key={`${nightDate}-${last ? "logged" : "new"}-${nightSession?.id ?? ""}-${nightSession?.start ?? ""}-${nightSession?.down ?? ""}`} p={p} who={who} title={nightTitle} date={nightDate} initial={last} session={nightSession} onSaved={() => setEditing(false)} />
            )}
          />
        </div>
      )}
      {view === "plan" && (
        <div className="space-y-8">
          {plan?.steps?.length ? <PlanView plan={plan} week={currentWeek(plan)} /> : <ResearchComing title="Her sleep plan is not ready yet" busy={researching(data, "plan")} />}
          <SettleGuide p={p} data={data} />
        </div>
      )}
      {view === "reminders" && <Reminders p={p} />}
      {view === "trends" && (
        <div className="space-y-8">
          <Trend data={data} />
          {recent.length > 0 ? (
            <section className="space-y-2.5" aria-label="Recent nights">
              <SectionTitle title="Recent nights" />
              <ul className="card card--flush divide-y divide-border">
                {recent.map((n) => (
                  <li key={n.date} className="p-3.5" data-testid="night">
                    <p className="font-bold">{fmtYmd(n.date)}</p>
                    <p className="text-sm text-muted">{nightLine(n)}</p>
                    {n.note && <p className="mt-0.5 text-[0.95rem]">{n.note}</p>}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
