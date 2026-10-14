'use client';

import { useState } from "react";
import { Link } from "@/common/apps/family/router";
import { HubCard, SectionTitle, outlineBtn, softBtn } from "@/common/apps/family/components/ui";
import { ChevronRightIcon } from "@/common/apps/family/components/Icons";
import { PointList, ResearchComing } from "@/common/apps/family/components/parenting/parts";
import { sortedChecks, worksGroups } from "@/common/apps/family/pages/parenting/TodayPages";
import Spinner from "@/common/apps/family/components/Spinner";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { currentWeek, fmtYmd, foodDayFor, isStepPlan, menuFor, napLine, orderedSteps, parentingApi, researching, summaryWeekStart, useNow, weekRange, type ParentingData, type UseParenting } from "@/common/apps/family/lib/parenting";
import { splitSections } from "@/common/apps/family/lib/text";
import { dayKey } from "@/common/apps/family/lib/fitness";

/** The three bullets the card shows: what to expect first, then the activities. */
function weekBullets(w: NonNullable<ParentingData["weekly"]>) {
  return [
    ...(w.expect ?? []).map((x) => ({ text: x.text, detail: x.detail, sources: x.sources })),
    ...(w.activities ?? []).map((a) => ({ text: a.text, detail: a.why, sources: a.sources })),
  ].slice(0, 3);
}

/** The newest weekly dashboard at the top of Today, the button that asks for one, and the past weeks. */
function ThisWeek({ p, data }: { p: UseParenting; data: ParentingData }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const w = data.weekly;
  const running = researching(data, "weekly");
  async function summarise() {
    setBusy(true);
    try {
      await parentingApi.summariseWeek(p.ctx);
      toast.show({ message: "Summary on its way" });
      await p.refresh();
    } catch {
      toast.show({ message: "Could not reach the Mac, try again", error: true });
    }
    setBusy(false);
  }
  const button = (
    <button type="button" disabled={busy || running} onClick={() => void summarise()} className={`${outlineBtn} w-full`}>
      {(busy || running) && <Spinner />}{running ? "Summarising the week…" : busy ? "Sending..." : "Summarise the week"}
    </button>
  );
  return (
    <>
      {w ? (
        <section aria-label="This week" className="card space-y-4 !p-4" data-testid="this-week" style={{ backgroundImage: "linear-gradient(160deg, color-mix(in srgb, var(--domain) 10%, var(--surface)) 0%, var(--surface) 75%)" }}>
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold leading-snug" data-testid="week-title">Week {w.week_number} ({weekRange(w.week_start)})</h2>
            {w.age_text && <p className="text-sm text-muted" data-testid="week-age">{w.age_text}</p>}
            {w.status_headline && <p className="text-[1.05rem] font-semibold leading-snug">{w.status_headline}</p>}
          </div>
          {weekBullets(w).length > 0 && <PointList items={weekBullets(w)} label="This week" />}
          <Link to={`/nila/week/${w.id}`} className={`${softBtn} w-full`}>See the week</Link>
          {button}
        </section>
      ) : (
        <section aria-label="This week" className="card space-y-2 !p-4 text-center" data-testid="this-week-empty">
          <p className="text-lg font-extrabold">No weekly summary yet</p>
          <p className="text-muted">Each Sunday morning the Mac writes what to expect this week and how last week went. You can ask for one now.</p>
          {button}
        </section>
      )}
    </>
  );
}

/** Today's habit (the Mac rotates one `do` from the playbooks each day): one line, the why and sources behind the info icon. */
function TodaysHabit({ data }: { data: ParentingData }) {
  const t = data.tip_today;
  if (!t) return null;
  const detail = [t.why, t.aim && `Fits the aim: ${t.aim}`, `From the playbook: ${t.title}`].filter(Boolean).join("\n\n");
  return (
    <section id="tip" aria-label="Today's habit" className="card space-y-0.5 !px-4 !py-2.5" style={{ backgroundImage: "linear-gradient(200deg, color-mix(in srgb, var(--gold) 16%, var(--surface)) 0%, var(--surface) 70%)" }}>
      <p className="text-sm font-bold" style={{ color: "var(--gold)" }}>Today's habit</p>
      <PointList items={[{ id: "tip", text: t.text, detail, sources: t.sources }]} label="Today's habit" />
    </section>
  );
}

function RemindersLink() {
  return <HubCard to="/nila/sleep#reminders" title="Reminders" lines={["Bedtime, the night log, today's habit and this week's update"]} />;
}

function AboutLink() {
  return <HubCard to="/nila/about" title="About Nila" lines={["Your notes on her sleep, feeding, routines and aims"]} />;
}

/** One tappable row: title on one line and a chevron. */
function TodayRow({ to, title, testId }: { to: string; title: string; testId: string }) {
  return (
    <li>
      <Link to={to} data-testid={testId} className="tap card flex min-h-14 items-center gap-3 !px-3.5 !py-2.5 hover:bg-subtle">
        <span className="min-w-0 flex-1 line-clamp-2 font-bold leading-snug">{title}</span>
        <span className="shrink-0 text-muted"><ChevronRightIcon /></span>
      </Link>
    </li>
  );
}

/** One row per active plan: the sleep plan, every researched step by step plan, and today's food menu. */
function TodayPlans({ data }: { data: ParentingData }) {
  const now = useNow(30_000);
  const rows: { to: string; title: string; testId: string }[] = [];
  const nap = napLine(data.nap_prediction, now);
  if (nap) rows.push({ to: "/nila/sleep", title: nap, testId: "today-nap" });
  const plan = data.sleep_plan;
  const week = currentWeek(plan);
  const sleepStep = plan?.status !== "paused" ? (plan?.steps ?? []).find((s) => s.week === week) : undefined;
  if (sleepStep) rows.push({ to: "/nila/sleep", title: `Sleep: ${sleepStep.title}`, testId: "today-sleep" });
  for (const pr of data.problems.filter((x) => isStepPlan(x) && x.research === "done")) {
    const steps = orderedSteps(pr);
    if (!steps.length) continue;
    const at = Math.max(0, steps.findIndex((s) => s.id === pr.current_step));
    rows.push({ to: `/nila/help/${pr.id}`, title: `${pr.title}: Step ${at + 1}, ${steps[at].title}`, testId: "today-plan" });
  }
  const menu = menuFor(data.food_plan);
  if (menu) rows.push({ to: "/nila/food", title: `Food: ${[menu.breakfast, menu.lunch, menu.dinner].join(", ")}`, testId: "today-food" });
  else if (data.food_plan && foodDayFor(data)) rows.push({ to: "/nila/food", title: "Food: see today's log", testId: "today-food" });
  if (!rows.length) return null;
  return (
    <section className="space-y-2" aria-label="Today's plans">
      <SectionTitle title="Today" />
      <ul className="space-y-2">{rows.map((r) => <TodayRow key={r.testId + r.to} {...r} />)}</ul>
    </section>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The cards that open Today's full pages. Each shows one or two lines; the detail is on its own page. */
function HubCards({ data }: { data: ParentingData }) {
  const s = data.summary;
  if (!s) return null;
  const today = dayKey();
  const checks = sortedChecks(s);
  const next = checks.find((c) => c.due) ?? checks[0];
  const works = worksGroups(s).reduce((n, [k]) => n + (s.what_works?.[k]?.length ?? 0), 0);
  const sections = s.body?.trim() ? splitSections(s.body).filter((x) => x.heading).length : 0;
  const latest = data.weeks[0];
  return (
    <section className="space-y-2" aria-label="More about Nila">
      <ul className="space-y-2">
        {(checks.length > 0 || !!s.red_flags?.length) && (
          <li>
            <HubCard
              to="/nila/jabs" testId="hub-jabs" title="Checks and jabs"
              lines={next ? [next.title, next.due ? `${next.due < today ? "Was due" : "Due"} ${fmtYmd(next.due) || next.due}` : "No date yet"] : ["When to get help"]}
            />
          </li>
        )}
        {works > 0 && <li><HubCard to="/nila/works" testId="hub-works" title="What works for Nila" lines={[plural(works, "idea", "ideas"), "What calms her and what sets her off"]} /></li>}
        {!!s.focus?.length && <li><HubCard to="/nila/focus" testId="hub-focus" title="Focus areas" lines={[plural(s.focus.length, "area", "areas"), s.focus[0].text]} /></li>}
        {sections > 0 && <li><HubCard to="/nila/research" testId="hub-research" title="More from the research" lines={[plural(sections, "section", "sections")]} /></li>}
        {data.weeks.length > 0 && <li><HubCard to="/nila/weeks" testId="hub-weeks" title="Past weeks" lines={[plural(data.weeks.length, "week", "weeks"), `Latest: ${weekRange(summaryWeekStart(latest))}`]} /></li>}
      </ul>
    </section>
  );
}

export default function Today({ p, data }: { p: UseParenting; data: ParentingData }) {
  if (!data.summary) {
    return (
      <div className="space-y-5">
        <ThisWeek p={p} data={data} />
        <TodaysHabit data={data} />
        <TodayPlans data={data} />
        <ResearchComing title="Her summary is not ready yet" busy={researching(data)} />
        <AboutLink />
        <RemindersLink />
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <ThisWeek p={p} data={data} />
      <TodaysHabit data={data} />
      <TodayPlans data={data} />
      <HubCards data={data} />
      <AboutLink />
      <RemindersLink />
    </div>
  );
}
