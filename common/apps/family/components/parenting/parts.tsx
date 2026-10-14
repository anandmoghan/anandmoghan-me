'use client';

import { useState, type ReactNode } from "react";
import Spinner from "@/common/apps/family/components/Spinner";
import { Badge, outlineBtn, type Tone } from "@/common/apps/family/components/ui";
import { DetailBullet } from "@/common/apps/family/components/parenting/plan";
import { DISCLAIMER, type Advice, type ProblemStatus } from "@/common/apps/family/lib/parenting";

/** Badge colour for a problem's status. */
export const STATUS_TONE: Record<ProblemStatus, Tone> = { open: "gold", improving: "accent", resolved: "success" };
import type { Source } from "@/common/apps/family/lib/health";

/** The one-line not-medical-advice note with emergency numbers, at the foot of every Nila page. */
export function ParentingNotice() {
  return (
    <p className="px-1 text-xs leading-relaxed text-muted" data-testid="parenting-notice">
      {DISCLAIMER} Emergency: 999 UK (111 urgent), 112 India.
    </p>
  );
}

export function ParentingOffline({ offline, onRetry }: { offline: boolean; onRetry: () => void | Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="card space-y-2 !p-4" role="alert" data-testid="parenting-offline">
      <p className="text-lg font-extrabold">{offline ? "The home Mac is offline" : "Nila's records could not be loaded"}</p>
      <p className="text-muted">
        Her logs, notes and questions are kept on the Mac.
        {offline ? " Once the Mac is back on, try again." : " The Mac answered with an error, try again in a moment."}
      </p>
      <button type="button" disabled={busy} aria-busy={busy} onClick={() => { setBusy(true); void Promise.resolve(onRetry()).finally(() => setBusy(false)); }} className={outlineBtn}>
        {busy ? <><Spinner />Retrying...</> : "Retry"}
      </button>
    </div>
  );
}

/** Empty state while the agent's research has not landed yet. */
export function ResearchComing({ title, busy, children }: { title: string; busy: boolean; children?: ReactNode }) {
  return (
    <div className="card space-y-1.5 !p-5 text-center" data-testid="research-coming">
      <p className="text-lg font-extrabold">{title}</p>
      <p className="text-muted">
        {busy ? "The Mac is researching this now. It appears here when it is done." : "Research is on its way. It appears here once the Mac has done it."}
      </p>
      {busy && <div className="flex justify-center pt-1"><Badge tone="accent" pulse>Researching…</Badge></div>}
      {children}
    </div>
  );
}

const dot = <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-domain/70" aria-hidden />;
const tick = (good: boolean) => (
  <span aria-hidden className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${good ? "bg-success/[0.14] text-success" : "bg-destructive/[0.12] text-destructive"}`}>{good ? "✓" : "✕"}</span>
);

/** Dos (ticks) or don'ts (crosses), each with its info button. */
export function AdviceList({ items, good, label }: { items: Advice[]; good: boolean; label: string }) {
  return (
    <ul aria-label={label} className="divide-y divide-border/70">
      {items.map((a, i) => <DetailBullet key={`${a.text}-${i}`} text={a.text} detail={a.why} aim={a.aim} forHer={a.for_her} sources={a.sources} mark={tick(good)} />)}
    </ul>
  );
}

/** Plain bullets with the info button: focus areas, safe-sleep checks, what to do on a night waking. */
export function PointList({ items, label }: { items: { id?: string; text: string; detail?: string; forHer?: string; sources?: Source[] }[]; label: string }) {
  return (
    <ul aria-label={label} className="divide-y divide-border/70">
      {items.map((p, i) => <DetailBullet key={p.id ?? `${p.text}-${i}`} text={p.text} detail={p.detail} forHer={p.forHer} sources={p.sources} mark={dot} />)}
    </ul>
  );
}

/** Quick-choice chips, several can be on at once. */
export function ChoiceChips({ options, value, onChange, label }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void; label: string }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={["min-h-11 rounded-full px-4 text-sm font-semibold transition-colors", on ? "bg-domain text-domain-foreground shadow-card" : "border border-border bg-surface text-foreground/80 hover:bg-subtle"].join(" ")}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
