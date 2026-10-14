'use client';

// Plan pieces shared by the Sleep tab and a problem's page in Help: the highlighted "now" card, the numbered
// plan, the "Tried before" block and collapsible sections.
import { useState, type ReactNode } from "react";
import { Badge, SectionTitle } from "@/common/apps/family/components/ui";
import { ChevronRightIcon, InfoIcon } from "@/common/apps/family/components/Icons";
import { Points } from "@/common/apps/family/components/Points";
import { SourceList } from "@/common/apps/family/components/health/parts";
import type { Source } from "@/common/apps/family/lib/health";
import type { HistoryFit } from "@/common/apps/family/lib/parenting";

export const nowCardStyle = { backgroundImage: "linear-gradient(160deg, color-mix(in srgb, var(--domain) 10%, var(--surface)) 0%, var(--surface) 75%)" };

export interface PlanStepItem { id: string; title: string; detail?: string; for_her?: string; move_on_when?: string; sources?: Source[] }

/** A paragraph cut to three lines with a "More" when it is long; the full text opens in place. */
export function ClampText({ text, className = "" }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 150;
  return (
    <span className="block">
      <span className={`block ${className} ${long && !open ? "line-clamp-3" : ""}`}>{text}</span>
      {long && <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="-ml-2 inline-flex min-h-11 items-center px-2 text-sm font-semibold text-domain">{open ? "Show less" : "More"}</button>}
    </span>
  );
}

/** The one line on how a step or a "do" fits her, from her records. */
export function ForHer({ text }: { text?: string }) {
  if (!text?.trim()) return null;
  return <p className="text-[0.92rem] text-foreground/80" data-testid="for-her"><span className="font-semibold text-domain">For her: </span>{text}</p>;
}

/** A bullet longer than this is clamped to two lines and shown in full behind its info button. */
const LONG_BULLET = 56;

/** One short bullet (two lines at most). Everything else (the why, how it fits her, the aim, the move-on sign, sources)
 * sits behind the info button, which opens in place. */
export function DetailBullet({ text, detail, aim, forHer, moveOn, sources, mark }: { text: string; detail?: string; aim?: string; forHer?: string; moveOn?: string; sources?: Source[]; mark: ReactNode }) {
  const [open, setOpen] = useState(false);
  const long = text.length > LONG_BULLET;
  const more = !!(detail?.trim() || aim || sources?.length || forHer?.trim() || moveOn?.trim() || long);
  return (
    <li className="flex items-start gap-2.5 py-2">
      {mark}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1">
          <p className="line-clamp-2 min-w-0 flex-1 pt-0.5 font-semibold leading-snug" data-testid="bullet-text">{text}</p>
          {more && (
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? `Hide detail: ${text}` : `More about: ${text}`}
              onClick={() => setOpen(!open)}
              className="-mt-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-domain hover:bg-domain/10"
            >
              <InfoIcon />
            </button>
          )}
        </div>
        {open && (
          <div className="mt-1 space-y-1" data-testid="bullet-detail">
            {long && <p className="text-[0.94rem] leading-relaxed">{text}</p>}
            <Points text={detail} max={3} muted small />
            <ForHer text={forHer} />
            {moveOn?.trim() && <p className="text-[0.95rem]"><span className="font-semibold">Move on when: </span>{moveOn}</p>}
            {aim && <p className="text-sm text-muted">Fits the aim: <span className="font-semibold text-foreground/80">{aim}</span></p>}
            <SourceList sources={sources} />
          </div>
        )}
      </div>
    </li>
  );
}

const planDot = <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-domain/70" aria-hidden />;

/** The highlighted card for what to do now (tonight's sleep step, a problem's current step), with any actions below. */
export function NowCard({ label, steps, testId, children }: { label: string; steps: PlanStepItem[]; testId: string; children?: ReactNode }) {
  return (
    <section className="card space-y-2 !p-4" aria-label={label} style={nowCardStyle}>
      <p className="text-sm font-bold text-domain">{label}</p>
      {steps.map((s) => (
        <ul key={s.id} className="space-y-1" data-testid={testId}>
          <DetailBullet text={s.title} detail={s.detail} forHer={s.for_her} moveOn={s.move_on_when} sources={s.sources} mark={planDot} />
        </ul>
      ))}
      {children}
    </section>
  );
}

export interface PlanGroup { key: string; heading: string; current: boolean; currentLabel: string; steps: PlanStepItem[] }

/** The plan as numbered cards (a week of the sleep plan, or one step of a problem's plan), the current one ringed. */
export function PlanSteps({ title, count, groups, label }: { title: string; count?: string; groups: PlanGroup[]; label: string }) {
  return (
    <section className="space-y-2.5" aria-label={label}>
      <SectionTitle title={title} count={count} />
      <ol className="space-y-2" aria-label={`${label} steps`}>
        {groups.map((g) => (
          <li key={g.key} aria-current={g.current ? "step" : undefined} data-testid={g.current ? "current-plan-step" : "plan-step"} className={`card !p-3.5 ${g.current ? "ring-2 ring-domain/60" : ""}`}>
            <div className="flex items-center gap-2">
              <p className="font-extrabold">{g.heading}</p>
              {g.current && <Badge tone="accent">{g.currentLabel}</Badge>}
            </div>
            <ul className="mt-1.5">
              {g.steps.map((s) => (
                <DetailBullet key={s.id} text={s.title} detail={s.detail} forHer={s.for_her} moveOn={s.move_on_when} sources={s.sources} mark={planDot} />
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}

const RESULT: Record<string, [string, "success" | "accent" | "destructive" | "muted"]> = {
  worked: ["Worked", "success"], partly: ["Partly", "accent"], didnt: ["Didn't work", "destructive"], unknown: ["Not sure", "muted"],
};

/** What the family tried before (from their records) and why this plan was chosen, behind its heading. */
export function TriedBefore({ fit, open = false }: { fit?: HistoryFit; open?: boolean }) {
  if (!fit || (!fit.tried_before?.length && !fit.why_this_plan)) return null;
  return (
    <Collapsible title="Tried before" open={open} count={fit.tried_before?.length || undefined}>
      <div className="card space-y-2 !p-4">
        {!!fit.tried_before?.length && (
          <ul className="divide-y divide-border/70">
            {fit.tried_before.map((t, i) => (
              <li key={`${t.what}-${i}`} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 py-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{t.what}</p>
                  {(t.when || t.note) && <ClampText text={[t.when, t.note].filter(Boolean).join(". ")} className="text-sm text-muted" />}
                </div>
                <Badge tone={(RESULT[t.result] ?? RESULT.unknown)[1]}>{(RESULT[t.result] ?? RESULT.unknown)[0]}</Badge>
              </li>
            ))}
          </ul>
        )}
        {fit.why_this_plan && <ClampText text={`Why this plan: ${fit.why_this_plan}`} className="text-[0.95rem]" />}
      </div>
    </Collapsible>
  );
}

/** A section behind its heading; `open` sets where it starts, `onToggle` hears each change. */
export function Collapsible({ title, open: initial = false, onToggle, children, count }: { title: string; open?: boolean; onToggle?: (open: boolean) => void; children: ReactNode; count?: number }) {
  const [open, setOpen] = useState(initial);
  return (
    <section aria-label={title} className="space-y-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => { setOpen(!open); onToggle?.(!open); }}
        className="flex min-h-11 w-full items-center gap-2 text-left text-lg font-extrabold"
      >
        <span className={`shrink-0 text-muted transition-transform ${open ? "rotate-90" : ""}`} aria-hidden><ChevronRightIcon /></span>
        <span className="min-w-0 flex-1">{title}</span>
        {count !== undefined && <span className="text-sm font-semibold text-muted">{count}</span>}
      </button>
      {open && children}
    </section>
  );
}
