'use client';

import { Link } from "@/common/apps/family/router";
import { Badge, SectionTitle } from "@/common/apps/family/components/ui";
import { ChevronRightIcon } from "@/common/apps/family/components/Icons";
import { SectionedMarkdown } from "@/common/apps/family/components/Points";
import { SourceList } from "@/common/apps/family/components/health/parts";
import { PointList, ResearchComing } from "@/common/apps/family/components/parenting/parts";
import { fmtDate } from "@/common/apps/family/lib/health";
import { dayKey } from "@/common/apps/family/lib/fitness";
import { fmtYmd, researching, summaryWeekStart, weekRange, type Check, type ParentingData, type Summary, type WhatWorksItem } from "@/common/apps/family/lib/parenting";

// The full pages behind the cards on Today. Each opens from a hub card and goes back to Today.

const WHERE: Record<string, string> = { uk: "UK", india: "India" };

function CheckRow({ c, today }: { c: Check; today: string }) {
  const overdue = !!c.due && c.due < today;
  return (
    <li className="space-y-1 p-3.5" data-testid="check">
      <p className="font-bold leading-snug">{c.title}</p>
      <div className="flex flex-wrap gap-1.5">
        <Badge tone={c.kind === "jab" ? "accent" : "muted"}>{c.kind === "jab" ? "Jab" : "Check"}</Badge>
        {c.due && <Badge tone={overdue ? "gold" : "muted"}>{overdue ? "Was due " : "Due "}{fmtYmd(c.due) || c.due}</Badge>}
        {c.where && WHERE[c.where] && <Badge tone="muted">{WHERE[c.where]}</Badge>}
      </div>
      <SourceList sources={c.sources} />
    </li>
  );
}

/** Checks and jabs in due order (undated last). */
export function sortedChecks(s: Summary): Check[] {
  return [...(s.checks ?? [])].sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
}

/** /nila/jabs: the whole schedule, then when to get help. */
export function JabsPage({ data }: { data: ParentingData }) {
  const s = data.summary;
  const today = dayKey();
  const checks = s ? sortedChecks(s) : [];
  return (
    <div className="space-y-6">
      <section className="space-y-2.5" aria-label="Checks and jabs">
        <SectionTitle title="Checks and jabs" count={checks.length ? `${checks.length} on the schedule` : undefined} />
        {checks.length === 0 ? <p className="card !px-4 !py-3.5 text-muted">No checks or jabs on the schedule yet.</p> : <ul className="card card--flush divide-y divide-border">{checks.map((c) => <CheckRow key={c.id} c={c} today={today} />)}</ul>}
      </section>
      {!!s?.red_flags?.length && (
        <section className="space-y-2.5" aria-label="When to get help">
          <SectionTitle title="When to get help" />
          <ul className="card card--flush divide-y divide-border">
            {s.red_flags.map((f, i) => (
              <li key={`${f.sign}-${i}`} className="flex gap-3 p-3.5">
                <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/[0.12] text-sm font-extrabold text-destructive">!</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-snug">{f.sign}</p>
                  <p className="text-[0.95rem] text-muted">{f.action}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export const WHAT_WORKS: [keyof NonNullable<Summary["what_works"]>, string][] = [
  ["calms", "What calms her"], ["triggers", "What sets her off"], ["helped_before", "Helped before"], ["didnt_help", "Didn't help"],
];

/** The groups of "what works" that have items. */
export const worksGroups = (s: Summary) => WHAT_WORKS.filter(([k]) => s.what_works?.[k]?.length);

function WorksRow({ item }: { item: WhatWorksItem }) {
  return (
    <li className="space-y-1 py-2">
      <p className="font-semibold leading-snug">{item.text}</p>
      {item.from === "research" && <Badge tone="accent">Research</Badge>}
      <SourceList sources={item.sources} />
    </li>
  );
}

/** /nila/works: what works for her, from the family's notes and from research, grouped. */
export function WorksPage({ data }: { data: ParentingData }) {
  const s = data.summary;
  const groups = s ? worksGroups(s) : [];
  return (
    <div className="space-y-5">
      {!s || groups.length === 0 ? (
        <p className="card !px-4 !py-3.5 text-muted">Nothing here yet. It fills in as you add notes and the Mac researches.</p>
      ) : (
        <div className="card space-y-3 !p-4">
          {groups.map(([k, title]) => (
            <div key={k} className="space-y-0.5">
              <p className="text-sm font-bold text-domain">{title}</p>
              <ul aria-label={title} className="divide-y divide-border/70">{s.what_works?.[k]?.map((x, i) => <WorksRow key={`${x.text}-${i}`} item={x} />)}</ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** /nila/focus: the focus areas. */
export function FocusPage({ data }: { data: ParentingData }) {
  const s = data.summary;
  return (
    <div className="space-y-5">
      {s?.updated_at && <p className="text-sm text-muted">Updated {fmtDate(s.updated_at)}</p>}
      {s?.focus?.length ? <div className="card !px-3.5 !py-1"><PointList items={s.focus} label="Focus areas" /></div> : <p className="card !px-4 !py-3.5 text-muted">No focus areas yet.</p>}
    </div>
  );
}

/** /nila/research: the long summary prose. */
export function ResearchPage({ data }: { data: ParentingData }) {
  const s = data.summary;
  return (
    <div className="space-y-5">
      {s?.body?.trim() ? <SectionedMarkdown text={s.body} cards /> : <ResearchComing title="Her summary is not ready yet" busy={researching(data)} />}
    </div>
  );
}

/** /nila/weeks: every past weekly summary, each opening /nila/week/:id. */
export function WeeksPage({ data }: { data: ParentingData }) {
  return (
    <div className="space-y-5">
      {data.weeks.length === 0 ? (
        <p className="card !px-4 !py-3.5 text-muted">No past weeks yet.</p>
      ) : (
        <ul className="card card--flush divide-y divide-border">
          {data.weeks.map((id) => (
            <li key={id}>
              <Link to={`/nila/week/${id}`} className="tap flex min-h-14 items-center gap-3 px-3.5 py-2.5 hover:bg-subtle">
                <span className="min-w-0 flex-1 font-semibold">{weekRange(summaryWeekStart(id))}</span>
                <span className="shrink-0 text-muted"><ChevronRightIcon /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
