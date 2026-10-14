'use client';

import { useState } from "react";
import { NumberField, Sheet, numOrNull } from "@/common/apps/family/components/fitness/parts";
import { Segmented, primaryBtn } from "@/common/apps/family/components/ui";
import Spinner from "@/common/apps/family/components/Spinner";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { fitnessApi, localIso, type BpRun, type Measurement } from "@/common/apps/family/lib/fitness";
import type { HealthCtx } from "@/common/apps/family/lib/health";
import type { Person } from "@/common/apps/family/types";

const BODY = [
  ["weight_kg", "Weight", "kg"],
  ["waist_cm", "Waist", "cm"],
  ["body_fat_pct", "Body fat", "%"],
  ["visceral_fat", "Visceral fat", ""],
] as const;
type BodyKey = (typeof BODY)[number][0];

interface Reading { sys: string; dia: string; pulse: string }
const EMPTY_READING: Reading = { sys: "", dia: "", pulse: "" };

export type LogMode = "all" | "bp";

/** Manual body and blood pressure logs. A BP pair is two readings a minute apart (the protocol takes two each sitting). */
export default function QuickLog({
  open, mode, onClose, onSaved, ctx, person, run,
}: { open: boolean; mode: LogMode; onClose: () => void; onSaved: () => void; ctx: HealthCtx; person: Person; run: BpRun | null }) {
  return (
    <Sheet open={open} title={mode === "bp" ? "Log blood pressure" : "Quick log"} onClose={onClose}>
      <LogForm key={`${mode}-${String(open)}`} mode={mode} onDone={onSaved} ctx={ctx} person={person} run={run} />
    </Sheet>
  );
}

function LogForm({ mode, onDone, ctx, person, run }: { mode: LogMode; onDone: () => void; ctx: HealthCtx; person: Person; run: BpRun | null }) {
  const toast = useToast();
  const [body, setBody] = useState<Record<BodyKey, string>>({ weight_kg: "", waist_cm: "", body_fat_pct: "", visceral_fat: "" });
  const [session, setSession] = useState<"am" | "pm">(new Date().getHours() < 12 ? "am" : "pm");
  const [readings, setReadings] = useState<Reading[]>([EMPTY_READING, EMPTY_READING]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function entries(): Measurement[] | string {
    const now = new Date();
    const at = localIso(now);
    const out: Measurement[] = [];
    if (mode === "all") {
      for (const [k] of BODY) {
        const v = numOrNull(body[k]);
        if (v !== null) out.push({ at, metric: k, value: v, source: "manual" });
      }
    }
    for (const [i, r] of readings.entries()) {
      const sys = numOrNull(r.sys);
      const dia = numOrNull(r.dia);
      const pulse = numOrNull(r.pulse);
      if (sys === null && dia === null && pulse === null) continue;
      if (sys === null || dia === null) return `Reading ${i + 1} needs both numbers, the top (systolic) and the bottom (diastolic).`;
      if (sys <= dia) return `Reading ${i + 1}: the top number is usually the bigger one, check the order.`;
      // A minute apart, so the second reading is not taken for a duplicate of the first.
      out.push({
        at: localIso(new Date(now.getTime() + i * 60000)), metric: "bp", sys, dia, ...(pulse !== null ? { pulse } : {}), session,
        ...(run ? { protocol: run.id } : {}), source: "manual",
      });
    }
    return out.length ? out : "Fill in at least one reading.";
  }

  async function save() {
    const e = entries();
    if (typeof e === "string") return setError(e);
    setError(null);
    setBusy(true);
    try {
      await fitnessApi.measurements(ctx, person, e);
      toast.show({ message: e.length === 1 ? "Saved" : `Saved ${e.length} readings` });
      onDone();
    } catch {
      toast.show({ message: "Could not save that, try again", error: true });
    }
    setBusy(false);
  }

  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      {mode === "all" && (
        <fieldset className="space-y-2">
          <legend className="mb-1 font-extrabold">Body</legend>
          <div className="grid grid-cols-2 gap-3">
            {BODY.map(([k, label, unit]) => (
              <NumberField key={k} label={label} unit={unit || undefined} value={body[k]} onChange={(v) => setBody((b) => ({ ...b, [k]: v }))} />
            ))}
          </div>
        </fieldset>
      )}
      <fieldset className="space-y-3">
        <legend className="mb-1 font-extrabold">Blood pressure</legend>
        <Segmented label="When" value={session} onChange={setSession} options={[["am", "Morning"], ["pm", "Evening"]] as const} />
        {readings.map((r, i) => (
          <div key={i} className="space-y-1">
            <p className="text-sm font-bold">Reading {i + 1}</p>
            <div className="grid grid-cols-3 gap-2">
              {(["sys", "dia", "pulse"] as const).map((k) => (
                <NumberField
                  key={k}
                  label={k === "sys" ? `Top ${i + 1}` : k === "dia" ? `Bottom ${i + 1}` : `Pulse ${i + 1}`}
                  value={r[k]}
                  step="1"
                  onChange={(v) => setReadings((rs) => rs.map((x, j) => (j === i ? { ...x, [k]: v } : x)))}
                />
              ))}
            </div>
          </div>
        ))}
        <p className="text-sm text-muted">Sit quietly for 5 minutes, arm resting at heart level, then take two readings a minute apart.{run ? " These count towards your 7-day protocol." : ""}</p>
      </fieldset>
      {error && <p className="font-semibold text-destructive" role="alert">{error}</p>}
      <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>{busy ? <><Spinner />Saving...</> : "Save"}</button>
    </form>
  );
}
