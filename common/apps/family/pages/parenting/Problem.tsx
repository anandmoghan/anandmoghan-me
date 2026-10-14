'use client';

import { useState, type ReactNode } from "react";
import { Badge, Segmented, outlineBtn } from "@/common/apps/family/components/ui";
import { Markdown, Points } from "@/common/apps/family/components/Points";
import { markdownPoints } from "@/common/apps/family/lib/text";
import { SourceList } from "@/common/apps/family/components/health/parts";
import { AdviceList, PointList, STATUS_TONE } from "@/common/apps/family/components/parenting/parts";
import { Collapsible, NowCard, PlanSteps, TriedBefore } from "@/common/apps/family/components/parenting/plan";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { fmtDate } from "@/common/apps/family/lib/health";
import { PROBLEM_STATUS, isGuide, isStepPlan, orderedSteps, parentingApi, type ParentingData, type Problem, type ProblemStatus, type UseParenting } from "@/common/apps/family/lib/parenting";

// Everything is open except the long reference sections.
const CLOSED = ["Sources", "The full playbook"];

/** A paragraph as short bullets, one per sentence. */
const bullets = (t: string) => (markdownPoints(t, 4).length ? markdownPoints(t, 4) : [t]).map((x) => ({ text: x }));

/** The plan's numbered steps and the current one with its buttons; the same layout as the sleep plan. */
function StepPlan({ pr, p }: { pr: Problem; p: UseParenting }) {
  const toast = useToast();
  const steps = orderedSteps(pr);
  const [current, setCurrent] = useState(pr.current_step && steps.some((s) => s.id === pr.current_step) ? pr.current_step : steps[0]?.id);
  const [busy, setBusy] = useState(false);
  if (!steps.length) return null;
  const at = Math.max(0, steps.findIndex((s) => s.id === current));
  async function go(to: number) {
    const prev = current;
    setCurrent(steps[to].id);
    setBusy(true);
    try {
      await parentingApi.problemStep(p.ctx, pr.id, steps[to].id);
      await p.refresh();
    } catch {
      setCurrent(prev);
      toast.show({ message: "Could not save that, try again", error: true });
    }
    setBusy(false);
  }
  return (
    <>
      <NowCard label={`Step ${at + 1} of ${steps.length}, week ${steps[at].week}`} steps={[steps[at]]} testId="current-step">
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" className={outlineBtn} disabled={busy || at === 0} onClick={() => void go(at - 1)}>Go back a step</button>
          <button type="button" className={outlineBtn} disabled={busy || at === steps.length - 1} onClick={() => void go(at + 1)}>Done, next step</button>
        </div>
        <p className="text-sm text-muted">If she struggles, go back a step for a few days. That is part of the plan.</p>
      </NowCard>
      <PlanSteps
        label="Step by step"
        title="Step by step"
        groups={steps.map((s, i) => ({ key: s.id, heading: `Step ${i + 1}, week ${s.week}`, current: i === at, currentLabel: "Now", steps: [s] }))}
      />
    </>
  );
}

/** The status control for a problem (not for a good-habit guide, whose status stays in the file). */
function StatusControl({ pr, p }: { pr: Problem; p: UseParenting }) {
  const toast = useToast();
  const [status, setStatus] = useState<ProblemStatus>(pr.status);
  async function change(next: ProblemStatus) {
    const prev = status;
    setStatus(next);
    try {
      await parentingApi.problemStatus(p.ctx, pr.id, next);
      await p.refresh();
    } catch {
      setStatus(prev);
      toast.show({ message: "Could not save that, try again", error: true });
    }
  }
  return (
    <div className="space-y-1.5">
      <Badge tone={STATUS_TONE[status]}>{PROBLEM_STATUS.find(([s]) => s === status)?.[1] ?? status}</Badge>
      <Segmented label={`Status: ${pr.title}`} value={status} onChange={(s) => void change(s)} options={PROBLEM_STATUS} />
    </div>
  );
}

/** /nila/help/:id: one problem, guide or step by step plan, in full. */
export default function ProblemPage({ p, data, id }: { p: UseParenting; data: ParentingData; id: string }) {
  const pr = data.problems.find((x) => x.id === id);
  if (!pr) {
    return (
      <p className="card !px-4 !py-3.5 text-muted" role="alert">That one is not on the Mac any more.</p>
    );
  }
  const guide = isGuide(pr);
  const plan = isStepPlan(pr);
  const pending = pr.research === "pending";
  const sections: [string, ReactNode][] = [];
  if (pr.typical) sections.push(["What's typical at her age", <PointList label="What's typical at her age" items={bullets(pr.typical)} />]);
  if (pr.why) sections.push(["Why it happens", <PointList label="Why it happens" items={bullets(pr.why)} />]);
  if (pr.dos?.length) sections.push(["Do", <AdviceList items={pr.dos} good label={`Do: ${pr.title}`} />]);
  if (pr.donts?.length) sections.push(["Don't", <AdviceList items={pr.donts} good={false} label={`Don't: ${pr.title}`} />]);
  if (pr.scripts?.length) {
    sections.push(["What to say", <PointList label="What to say" items={pr.scripts.map((s) => ({ text: `“${s.say}”`, detail: [s.when, s.aim && `Aim: ${s.aim}`].filter(Boolean).join(". ") || undefined }))} />]);
  }
  if (pr.track?.length) sections.push(["What to track", <PointList label="What to track" items={pr.track.map((t) => ({ text: t }))} />]);
  if (pr.get_help?.length) sections.push(["When to get help", <PointList label="When to get help" items={pr.get_help.map((g) => ({ text: g.sign, detail: g.action, sources: g.sources }))} />]);
  if (pr.sources?.length) sections.push(["Sources", <SourceList sources={pr.sources} bare />]);
  if (pr.body?.trim()) sections.push(["The full playbook", <Markdown text={pr.body} />]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-xl font-extrabold leading-snug">{pr.title}</h2>
        {pr.seen !== pr.title && <Points text={pr.seen} muted small />}
        {(pr.choices?.length || pr.created_at) && <p className="text-sm text-muted">{[...(pr.choices ?? []), pr.created_at && `Added ${fmtDate(pr.created_at)}`].filter(Boolean).join(" · ")}</p>}
        {pending ? <Badge tone="muted" pulse>Researching…</Badge> : pr.research === "failed" ? <Badge tone="destructive">Research failed</Badge> : !guide && !plan && <StatusControl pr={pr} p={p} />}
      </header>
      {pending ? (
        <p className="card !px-4 !py-3.5">The Mac is reading the research for this. The playbook appears here when it is done.</p>
      ) : (
        <>
          <TriedBefore fit={pr.history_fit} open />
          {plan && <StepPlan pr={pr} p={p} />}
          {plan && <StatusControl pr={pr} p={p} />}
          <div className="space-y-3">
            {sections.map(([title, body]) => (
              <Collapsible key={title} title={title} open={!CLOSED.includes(title)}>
                <div className="card !px-3.5 !py-2">{body}</div>
              </Collapsible>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
