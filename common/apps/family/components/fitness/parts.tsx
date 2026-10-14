'use client';

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@/common/apps/family/router";
import { Badge, outlineBtn, type Tone } from "@/common/apps/family/components/ui";
import { CloseIcon } from "@/common/apps/family/components/Icons";
import Spinner from "@/common/apps/family/components/Spinner";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { DISCLAIMER, STATUS_LABEL, fitnessApi, type TargetStatus, type UseFitness } from "@/common/apps/family/lib/fitness";
import type { Person } from "@/common/apps/family/types";

/** "Not medical advice; review with your GP" (Plan, Food, Tests) plus where the data lives. */
export function FitnessNotice({ advice = true }: { advice?: boolean }) {
  return (
    <div className="space-y-1 rounded-2xl bg-subtle px-4 py-3 text-sm leading-relaxed text-muted print:bg-transparent print:px-0" data-testid="fitness-notice">
      {advice && <p className="font-semibold text-foreground/80">{DISCLAIMER}</p>}
      <p className="print:hidden">Fitness records stay on the home Mac and are only sent to your phone while you look at them.</p>
    </div>
  );
}

const STATUS_TONE: Record<TargetStatus, Tone> = {
  "on-track": "success", improving: "accent", "off-track": "gold", worse: "destructive", "needs-repeat": "muted", "no-data": "muted",
};
export function StatusBadge({ status }: { status: TargetStatus }) {
  return <Badge tone={STATUS_TONE[status]} testId="target-status">{STATUS_LABEL[status]}</Badge>;
}

/** Bottom sheet on phones, a centred card on wide screens. Escape, the close button and a backdrop tap all close it. */
export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={() => { if (open) onClose(); }}
      onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[88dvh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-surface p-0 text-foreground shadow-float backdrop:bg-black/40 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
    >
      {open && (
        <div className="p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-subtle">
              <CloseIcon />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/** "Redo my plan": queues the health agent's plan task on the Mac. */
export function usePlanRequest(f: UseFitness, person: Person): { request: () => Promise<void>; busy: boolean; sent: boolean } {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  async function request() {
    setBusy(true);
    try {
      await fitnessApi.requestPlan(f.ctx, person);
      setSent(true);
      toast.show({ message: "Asked the Mac for a new plan. It takes a few minutes." });
    } catch {
      toast.show({ message: "Could not reach the Mac, try again", error: true });
    }
    setBusy(false);
  }
  return { request, busy, sent };
}

/** No plan written yet: what happens next. */
export function NoPlan({ person, onRequest, busy }: { person: Person; onRequest: () => void; busy: boolean }) {
  return (
    <div className="card space-y-2 !p-5 text-center" data-testid="fitness-no-plan">
      <p className="text-lg font-extrabold">No plan yet</p>
      <p className="text-muted">The Mac writes a plan from your health records, measurements and current research. It takes a few minutes.</p>
      <div className="flex flex-wrap justify-center gap-2 pt-1">
        <button type="button" onClick={onRequest} disabled={busy} className={outlineBtn}>{busy ? <><Spinner />Asking...</> : "Make my plan"}</button>
        <Link to={`/health?p=${person}`} className={outlineBtn}>Open Health</Link>
      </div>
    </div>
  );
}

/** Small labelled number field, 44px tall. */
export function NumberField({
  label, value, onChange, unit, step = "any", min, width = "w-full", ariaLabel,
}: { label: string; value: string; onChange: (v: string) => void; unit?: string; step?: string; min?: number; width?: string; ariaLabel?: string }) {
  return (
    <label className={`block min-w-0 ${width}`}>
      <span className="mb-1 block text-sm font-semibold text-muted">{label}{unit ? ` (${unit})` : ""}</span>
      <input type="number" inputMode="decimal" step={step} min={min} value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel} className="field !min-h-11" />
    </label>
  );
}

export const numOrNull = (s: string): number | null => (s.trim() === "" || !Number.isFinite(Number(s)) ? null : Number(s));

export const APPLE_HEALTH_STEPS = "On your iPhone open the Health app, tap your profile picture, then Export All Health Data. AirDrop the export to the home Mac; it imports it within a few minutes and keeps only steps, sleep, heart, blood pressure and body readings.";
