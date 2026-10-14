'use client';

import { useState } from "react";
import { Badge, SectionTitle, outlineBtn } from "@/common/apps/family/components/ui";
import { SourceList } from "@/common/apps/family/components/health/parts";
import { FitnessNotice, NoPlan, usePlanRequest } from "@/common/apps/family/components/fitness/parts";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { personLabel, toMillis } from "@/common/apps/family/lib/format";
import {
  WHERE_LABEL, dayKey, fitnessApi, fmtDay, gpShareText, localIso, testsInOrder, type FitnessData, type PlanTest, type UseFitness,
} from "@/common/apps/family/lib/fitness";
import type { Person } from "@/common/apps/family/types";

function RedFlags({ data }: { data: FitnessData }) {
  const flags = data.plan?.red_flags ?? [];
  return (
    <section className="space-y-2.5 rounded-2xl border-2 border-destructive/40 bg-destructive/[0.06] p-4 print:hidden" aria-label="Red flags" data-testid="red-flags">
      <h2 className="text-lg font-extrabold text-destructive">Get help now if</h2>
      {flags.length ? (
        <ul className="space-y-2.5">
          {flags.map((f) => (
            <li key={f.id}>
              <p className="font-bold leading-snug">{f.sign}</p>
              <p className="text-[0.95rem] text-foreground/85">{f.action}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-sm text-muted">In an emergency call 112 in India, or 999 in the UK (111 for urgent advice).</p>
    </section>
  );
}

function TestRow({ t, done, onToggle }: { t: PlanTest; done: boolean; onToggle: (done: boolean) => void }) {
  const due = toMillis(t.due);
  const overdue = !done && due !== null && due < Date.now() - 86400000;
  return (
    <li className="flex items-start gap-1 px-3 py-3" data-testid="test-row">
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
        <input type="checkbox" checked={done} onChange={(e) => onToggle(e.target.checked)} aria-label={`Mark done: ${t.title}`} className="peer absolute inset-0 h-11 w-11 cursor-pointer opacity-0" />
        <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-foreground/35 text-sm font-bold text-domain-foreground peer-checked:border-domain peer-checked:bg-domain peer-focus-visible:outline peer-focus-visible:outline-2">{done ? "✓" : ""}</span>
      </span>
      <div className="min-w-0 flex-1 space-y-1.5 pt-2">
        <p className={`font-bold leading-snug ${done ? "text-muted line-through" : ""}`}>{t.title}</p>
        <div className="flex flex-wrap gap-1.5">
          {t.due && <Badge tone={overdue ? "destructive" : "muted"}>{overdue ? "Overdue, was due " : "Due "}{fmtDay(t.due, true)}</Badge>}
          {t.where && <Badge tone="muted">{WHERE_LABEL[t.where] ?? t.where}</Badge>}
          {done && t.done_at && <Badge tone="success">Done {fmtDay(t.done_at)}</Badge>}
        </div>
        {!done && !!t.items?.length && <p className="text-[0.95rem]">{t.items.join(", ")}</p>}
        {!done && t.prep && <p className="text-[0.95rem] text-muted"><span className="font-semibold text-foreground/80">Before the test: </span>{t.prep}</p>}
        {!done && <SourceList sources={t.sources} />}
      </div>
    </li>
  );
}

export default function Tests({ person, f, data }: { person: Person; f: UseFitness; data: FitnessData }) {
  const toast = useToast();
  const req = usePlanRequest(f, person);
  const [overrides, setOverrides] = useState<Record<string, string | null>>({});
  const plan = data.plan;
  if (!plan) return <div className="space-y-6"><RedFlags data={data} /><NoPlan person={person} onRequest={() => void req.request()} busy={req.busy || req.sent} /><FitnessNotice /></div>;

  const tests = (plan.tests ?? []).map((t) => (t.id in overrides ? { ...t, done_at: overrides[t.id] } : t));
  const { open, done } = testsInOrder(tests);
  const questions = plan.gp_questions ?? [];
  const name = personLabel(person);

  async function toggle(id: string, isDone: boolean) {
    const done_at = isDone ? localIso() : null;
    setOverrides((o) => ({ ...o, [id]: done_at }));
    try {
      await fitnessApi.plan(f.ctx, person, { tests: [{ id, done_at }] });
      await f.refresh();
    } catch {
      toast.show({ message: "Could not save that, try again", error: true });
    }
    setOverrides((o) => {
      const rest = { ...o };
      delete rest[id];
      return rest;
    });
  }

  async function share() {
    const text = gpShareText(name, questions, dayKey());
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `Questions for my GP (${name})`, text });
        return;
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.show({ message: "Copied the questions" });
    } catch {
      toast.show({ message: "Could not copy, try Print instead", error: true });
    }
  }

  return (
    <div className="space-y-8 print:space-y-4">
      <RedFlags data={data} />

      <section className="space-y-2.5 print:hidden" aria-label="Test timeline">
        <SectionTitle title="Test timeline" count={open.length ? `${open.length} to do` : undefined} />
        {open.length ? (
          <ul className="card card--flush divide-y divide-border">{open.map((t) => <TestRow key={t.id} t={t} done={false} onToggle={(d) => void toggle(t.id, d)} />)}</ul>
        ) : (
          <p className="card !px-4 !py-3.5 text-muted">No tests due.</p>
        )}
        {done.length > 0 && (
          <details>
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-muted">Done ({done.length})</summary>
            <ul className="card card--flush divide-y divide-border">{done.map((t) => <TestRow key={t.id} t={t} done onToggle={(d) => void toggle(t.id, d)} />)}</ul>
          </details>
        )}
      </section>

      <section className="space-y-2.5" aria-label="Questions for your GP" data-testid="gp-questions">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold print:hidden">Questions for your GP</h2>
            <h1 className="hidden text-2xl font-extrabold print:block">Questions for my GP ({name}), {fmtDay(dayKey(), true)}</h1>
          </div>
          {questions.length > 0 && (
            <div className="flex gap-2 print:hidden">
              <button type="button" onClick={() => window.print()} className={outlineBtn}>Print</button>
              <button type="button" onClick={() => void share()} className={outlineBtn}>Share</button>
            </div>
          )}
        </div>
        {questions.length ? (
          <ol className="card card--flush divide-y divide-border print:divide-y-0 print:border-0">
            {questions.map((q, i) => (
              <li key={q.id} className="flex gap-3 p-4 print:break-inside-avoid print:px-0 print:py-2">
                <span className="w-6 shrink-0 text-right font-extrabold text-domain print:text-black">{i + 1}.</span>
                <div className="min-w-0">
                  <p className="font-bold leading-snug">{q.question}</p>
                  {q.context && <p className="mt-0.5 text-[0.95rem] text-muted print:text-black">{q.context}</p>}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="card !px-4 !py-3.5 text-muted">No questions yet.</p>
        )}
      </section>

      <FitnessNotice />
    </div>
  );
}
