'use client';

import { useState } from "react";
import { Badge, SectionTitle, outlineBtn, softBtn } from "@/common/apps/family/components/ui";
import { Points, SectionedMarkdown } from "@/common/apps/family/components/Points";
import { SourceList } from "@/common/apps/family/components/health/parts";
import { FitnessNotice, NoPlan, StatusBadge, usePlanRequest } from "@/common/apps/family/components/fitness/parts";
import PlanEdit from "@/common/apps/family/components/fitness/PlanEdit";
import { ListSkeleton } from "@/common/apps/family/components/Skeleton";
import Spinner from "@/common/apps/family/components/Spinner";
import { useHealth } from "@/common/apps/family/lib/health";
import { fmtDay, targetRow, targetText, type FitnessData, type TargetRow, type UseFitness } from "@/common/apps/family/lib/fitness";
import type { Person } from "@/common/apps/family/types";

function TargetItem({ row }: { row: TargetRow }) {
  const t = row.target;
  return (
    <li className="space-y-1 p-4" data-testid="target-row">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 font-bold leading-snug">{t.label}</p>
        <StatusBadge status={row.status} />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[0.95rem]">
        <dt className="text-muted">Now</dt>
        <dd className="min-w-0">
          {row.current ? <><strong>{row.current.display}</strong>{row.current.date && <span className="text-muted">, {fmtDay(row.current.date, true)}</span>}</> : <span className="text-muted">No reading yet</span>}
        </dd>
        <dt className="text-muted">Target</dt>
        <dd className="min-w-0">{targetText(t)}{t.horizon && <span className="text-muted">, within {t.horizon}</span>}</dd>
      </dl>
      {row.status === "needs-repeat" && <p className="text-sm text-muted">{row.current?.note ?? "The sample was delayed, so this result needs a repeat test before it counts."}</p>}
      <Points text={t.why} max={2} muted small className="pt-0.5" />
      <SourceList sources={t.sources} />
    </li>
  );
}

export default function PlanTab({ person, f, data }: { person: Person; f: UseFitness; data: FitnessData }) {
  const h = useHealth(person);
  const req = usePlanRequest(f, person);
  const [editing, setEditing] = useState(false);
  const plan = data.plan;
  if (!plan) return <div className="space-y-6"><NoPlan person={person} onRequest={() => void req.request()} busy={req.busy || req.sent} /><FitnessNotice /></div>;

  const reports = h.data?.reports ?? [];
  const rows = (plan.targets ?? []).map((t) => targetRow(t, data, reports));

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-extrabold">{plan.title ?? "My plan"}</h2>
          {plan.status === "draft" && <Badge tone="gold">Draft</Badge>}
        </div>
        <p className="text-sm text-muted">
          {[plan.start_date && `Started ${fmtDay(plan.start_date, true)}`, plan.review_date && `review ${fmtDay(plan.review_date, true)}`, plan.updated_at && `updated ${fmtDay(plan.updated_at)}${plan.source === "user" ? " by you" : ""}`].filter(Boolean).join(", ")}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setEditing(true)} className={softBtn}>Edit targets</button>
          <button type="button" onClick={() => void req.request()} disabled={req.busy || req.sent} className={outlineBtn}>
            {req.busy && <Spinner />}{req.sent ? "New plan on its way" : req.busy ? "Asking..." : "Redo my plan with latest data"}
          </button>
        </div>
      </div>

      {rows.length > 0 && (
        <section className="space-y-2.5" aria-label="Targets">
          <SectionTitle title="Targets" />
          {h.status === "loading" ? <ListSkeleton rows={3} /> : <ul className="card card--flush divide-y divide-border">{rows.map((r) => <TargetItem key={r.target.id} row={r} />)}</ul>}
        </section>
      )}

      {(plan.pillars ?? []).map((p) => (
        <section key={p.id} className="space-y-2.5" aria-label={p.title}>
          <SectionTitle title={p.title} />
          <ul className="card card--flush divide-y divide-border">
            {(p.items ?? []).map((i) => (
              <li key={i.id} className="p-4">
                <p className="font-bold leading-snug">{i.text}</p>
                <Points text={i.detail} max={2} muted small className="mt-1" />
                <SourceList sources={i.sources} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {plan.body?.trim() && <SectionedMarkdown text={plan.body} cards />}
      <FitnessNotice />
      <PlanEdit open={editing} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); void f.refresh(); }} plan={plan} ctx={f.ctx} person={person} />
    </div>
  );
}
