'use client';

import { useEffect, useState } from "react";
import { SectionTitle, outlineBtn } from "@/common/apps/family/components/ui";
import { ClampText } from "@/common/apps/family/components/parenting/plan";
import { ListSkeleton } from "@/common/apps/family/components/Skeleton";
import { HealthOfflineError } from "@/common/apps/family/lib/health";
import { ParentingHttpError, parentingApi, summaryWeekStart, weekRange, type UseParenting, type Weekly, type WeeklySummary } from "@/common/apps/family/lib/parenting";

/** The summary's bullets, grouped the way the family's weekly summary reads. Empty groups are left out. */
function summarySections(s: WeeklySummary): [string, string[]][] {
  const list = (xs: string[] | undefined) => (xs ?? []).filter((x) => x.trim());
  const one = (label: string, v: string | undefined) => (v?.trim() ? [`${label}: ${v.trim()}`] : []);
  const sections: [string, string[]][] = [
    ["Key incidents", list(s.incidents)],
    ["Developmental progress", [...list(s.milestones_hit), ...one("Growth", s.growth)]],
    [
      "Medications and interventions",
      [
        ...(s.medications ?? []).map((m) => [m.name, m.dose_freq].filter(Boolean).join(", ") + (m.efficacy ? `: ${m.efficacy}` : "")),
        ...(s.interventions ?? []).map((i) => (i.result ? `${i.action}: ${i.result}` : i.action)),
      ],
    ],
    ["Feeding and sleep", [...one("Feeding", s.feeding), ...one("Sleep", s.sleep)]],
    ["Activity", s.activity?.trim() ? [s.activity.trim()] : []],
  ];
  return sections.filter(([, items]) => items.length > 0);
}

/** /nila/week/:id: the summary of the week before the weekly dashboard `id` (a Sunday), in sections. */
export default function Week({ p, id }: { p: UseParenting; id: string }) {
  const published = p.data?.weekDocs?.[id] ?? null;
  const [fetched, setWeek] = useState<Weekly | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "offline" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const week = published ?? fetched;
  useEffect(() => {
    // The Firestore copy of the week is enough; only a week that is not published is asked of the Mac.
    if (published) return;
    let live = true;
    parentingApi.week(p.ctx, id).then(
      (w) => {
        if (!live) return;
        setWeek(w);
        setState("ready");
      },
      (e) => {
        if (!live) return;
        setState(e instanceof HealthOfflineError ? "offline" : e instanceof ParentingHttpError && (e.status === 404 || e.status === 400) ? "missing" : "error");
      },
    );
    return () => { live = false; };
  }, [p.ctx, id, attempt, published]);

  if (!week && state === "loading") return <ListSkeleton rows={3} />;
  if (!week) {
    return (
      <div className="space-y-3">
        <div className="card space-y-2 !p-4" role="alert">
          <p className="text-lg font-extrabold">{state === "missing" ? "That week is not on the Mac" : state === "offline" ? "The home Mac is offline" : "That week could not be loaded"}</p>
          {state !== "missing" && <button type="button" onClick={() => { setState("loading"); setAttempt((n) => n + 1); }} className={outlineBtn}>Retry</button>}
        </div>
      </div>
    );
  }
  const sections = week.summary ? summarySections(week.summary) : [];
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-lg font-extrabold" data-testid="summary-range">{weekRange(summaryWeekStart(week.week_start))}</p>
        <p className="text-sm text-muted">From your sleep log, milestones, notes and problems, written with the Week {week.week_number} dashboard.</p>
      </div>
      {sections.length === 0 ? (
        <p className="card !px-4 !py-3.5 text-muted">Nothing was recorded for this week.</p>
      ) : (
        sections.map(([title, items]) => (
          <section key={title} className="space-y-2.5" aria-label={title}>
            <SectionTitle title={title} />
            <ul className="card list-disc space-y-1.5 !py-3 !pr-4 !pl-8">
              {items.map((x, i) => <li key={i} className="leading-snug"><ClampText text={x} /></li>)}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
