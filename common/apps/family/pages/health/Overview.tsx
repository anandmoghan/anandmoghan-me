'use client';

import { useState } from "react";
import { Link } from "@/common/apps/family/router";
import { Badge, SectionTitle, outlineBtn } from "@/common/apps/family/components/ui";
import { Points } from "@/common/apps/family/components/Points";
import { SeverityBadge, SourceList } from "@/common/apps/family/components/health/parts";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { SEVERITY_ORDER, doneFollowups, fmtDate, healthApi, locationNote, type Concern, type DoItem, type Followup, type HealthData, type UseHealth } from "@/common/apps/family/lib/health";
import { toMillis } from "@/common/apps/family/lib/format";
import type { Person } from "@/common/apps/family/types";

export function EmptyOverview({ person }: { person: Person }) {
  return (
    <div className="card !p-5 text-center" data-testid="health-empty">
      <p className="text-lg font-extrabold">No summary yet</p>
      <p className="mt-1 text-muted">Upload a lab report or a doctor's letter and the Mac will build an overview from it.</p>
      <Link to={`/health?p=${person}&tab=upload`} className={`${outlineBtn} mt-4`}>Go to Upload</Link>
    </div>
  );
}

function ConcernCard({ c, person }: { c: Concern; person: Person }) {
  return (
    <li className="card space-y-2 !p-4" data-testid="concern">
      <div className="flex flex-wrap items-center gap-2">
        {c.status === "resolved" ? <Badge tone="success">Resolved</Badge> : <SeverityBadge severity={c.severity} />}
      </div>
      <h3 className="text-[1.08rem] font-extrabold leading-snug">{c.title}</h3>
      <Points text={c.detail} max={2} />
      {!!c.evidence?.length && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {c.evidence.map((e, i) => (
            <Link key={`${e.report}-${i}`} to={`/health/${person}/reports/${e.report}`} className="inline-flex min-h-11 items-center rounded-full bg-subtle px-3.5 text-sm font-semibold hover:bg-domain/[0.12] hover:text-domain">
              {[e.test, e.value, e.date && fmtDate(e.date)].filter(Boolean).join(", ") || "Report"}
            </Link>
          ))}
        </div>
      )}
      <SourceList sources={c.sources} />
    </li>
  );
}

function FollowupRow({ f, done, onToggle }: { f: Followup; done: boolean; onToggle: (done: boolean) => void }) {
  const due = toMillis(f.due);
  const overdue = !done && due !== null && due < Date.now() - 24 * 3600 * 1000;
  return (
    <li className="flex items-start gap-1 px-3 py-2.5">
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
        <input type="checkbox" checked={done} onChange={(e) => onToggle(e.target.checked)} aria-label={`Mark done: ${f.title}`} className="peer absolute inset-0 h-11 w-11 cursor-pointer opacity-0" />
        <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-foreground/35 text-sm font-bold text-domain-foreground peer-checked:border-domain peer-checked:bg-domain peer-focus-visible:outline peer-focus-visible:outline-2">{done ? "✓" : ""}</span>
      </span>
      <div className="min-w-0 flex-1 pt-2">
        <p className={["font-bold leading-snug", done ? "text-muted line-through" : ""].join(" ")}>{f.title}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {f.due && (
            <span className={["badge", overdue ? "badge--destructive" : "badge--muted"].join(" ")} data-testid={overdue ? "followup-overdue" : undefined}>
              {overdue ? "Overdue, was due " : "Due "}{fmtDate(f.due) || f.due}
            </span>
          )}
          {f.where && f.where !== "either" && <span className="badge badge--muted">{f.where === "india" ? "In India" : "In the UK"}</span>}
        </div>
        {!done && <Points text={f.why} max={2} muted small className="mt-1.5" />}
      </div>
    </li>
  );
}

function DoList({ title, items, good }: { title: string; items: DoItem[]; good: boolean }) {
  return (
    <section className="space-y-2.5" aria-label={title}>
      <SectionTitle title={title} />
      <ul className="card card--flush divide-y divide-border">
        {items.map((d, i) => (
          <li key={i} className="flex gap-3 p-3.5">
            <span aria-hidden className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${good ? "bg-success/[0.14] text-success" : "bg-destructive/[0.12] text-destructive"}`}>{good ? "✓" : "✕"}</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold leading-snug">{d.text}</p>
              <Points text={d.why} max={2} muted small className="mt-1" />
              <SourceList sources={d.sources} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Overview({ person, h, data }: { person: Person; h: UseHealth; data: HealthData }) {
  const toast = useToast();
  const summary = data.summary;
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  if (!summary) return <EmptyOverview person={person} />;

  const tracked = doneFollowups(data.tracking);
  const isDone = (id: string) => overrides[id] ?? tracked.has(id);
  async function toggle(id: string, done: boolean) {
    setOverrides((o) => ({ ...o, [id]: done }));
    try {
      await healthApi.followup(h.ctx, person, id, done);
      await h.refresh();
    } catch {
      toast.show({ message: "Could not save that, try again", error: true });
    }
    setOverrides((o) => {
      const rest = { ...o };
      delete rest[id];
      return rest;
    });
  }

  const concerns = (summary.concerns ?? []).filter((c) => c.status !== "resolved");
  const resolved = (summary.concerns ?? []).filter((c) => c.status === "resolved");
  const sorted = [...concerns].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
  const followups = [...(summary.followups ?? [])].sort((a, b) => (toMillis(a.due) ?? Infinity) - (toMillis(b.due) ?? Infinity));
  const routine = summary.routine ?? [];

  return (
    <div className="space-y-8">
      {(locationNote(summary.location) || summary.updated_at) && (
        <div className="space-y-0.5">
          {locationNote(summary.location) && <p className="font-semibold" data-testid="health-location">{locationNote(summary.location)}</p>}
          {summary.updated_at && <p className="text-sm text-muted">Updated {fmtDate(summary.updated_at)}</p>}
        </div>
      )}
      <section className="space-y-2.5" aria-label="Concerns">
        <SectionTitle title="Concerns" />
        {sorted.length ? <ul className="space-y-3">{sorted.map((c) => <ConcernCard key={c.id} c={c} person={person} />)}</ul> : <p className="card !px-4 !py-3.5 text-muted">Nothing to flag right now.</p>}
        {resolved.length > 0 && (
          <details>
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-muted">Resolved ({resolved.length})</summary>
            <ul className="space-y-3">{resolved.map((c) => <ConcernCard key={c.id} c={c} person={person} />)}</ul>
          </details>
        )}
      </section>

      {followups.length > 0 && (
        <section className="space-y-2.5" aria-label="Follow-ups">
          <SectionTitle title="Follow-ups" />
          <ul className="card card--flush divide-y divide-border">
            {followups.map((f) => <FollowupRow key={f.id} f={f} done={isDone(f.id)} onToggle={(d) => void toggle(f.id, d)} />)}
          </ul>
        </section>
      )}

      {routine.length > 0 && (
        <section className="space-y-2.5" aria-label="Do regularly">
          <SectionTitle title="Do regularly" />
          <ul className="card card--flush divide-y divide-border">
            {routine.map((r) => (
              <li key={r.id} className="p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p className="font-bold leading-snug">{r.title}</p>
                  {r.frequency && <span className="badge badge--accent">{r.frequency}</span>}
                </div>
                <Points text={r.why} max={2} muted small className="mt-1" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {((summary.dos?.length ?? 0) > 0 || (summary.donts?.length ?? 0) > 0) && (
        <div className="grid gap-6 md:grid-cols-2 md:items-start">
          {!!summary.dos?.length && <DoList title="Do" items={summary.dos} good />}
          {!!summary.donts?.length && <DoList title="Don't" items={summary.donts} good={false} />}
        </div>
      )}
    </div>
  );
}
