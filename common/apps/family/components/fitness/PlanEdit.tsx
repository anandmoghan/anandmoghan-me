'use client';

import { useState } from "react";
import { NumberField, Sheet, numOrNull } from "@/common/apps/family/components/fitness/parts";
import { Segmented, primaryBtn } from "@/common/apps/family/components/ui";
import Spinner from "@/common/apps/family/components/Spinner";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { fitnessApi, type Op, type Plan, type PlanPatch } from "@/common/apps/family/lib/fitness";
import type { HealthCtx } from "@/common/apps/family/lib/health";
import type { Person } from "@/common/apps/family/types";

const OPS: [Op, string][] = [["lt", "Under"], ["lte", "At most"], ["gt", "Over"], ["gte", "At least"], ["between", "Between"]];
const str = (v: number | null | undefined) => (typeof v === "number" ? String(v) : "");

/** Edits the parts of the plan the bridge accepts from the app: target numbers, calories, protein, water, checklist targets. */
export default function PlanEdit({ open, onClose, onSaved, plan, ctx, person }: { open: boolean; onClose: () => void; onSaved: () => void; plan: Plan; ctx: HealthCtx; person: Person }) {
  return (
    <Sheet open={open} title="Edit targets" onClose={onClose}>
      <EditForm key={String(open)} plan={plan} ctx={ctx} person={person} onDone={onSaved} />
    </Sheet>
  );
}

function EditForm({ plan, ctx, person, onDone }: { plan: Plan; ctx: HealthCtx; person: Person; onDone: () => void }) {
  const toast = useToast();
  const food = plan.food ?? {};
  const [targets, setTargets] = useState(() => (plan.targets ?? []).map((t) => ({ id: t.id, label: t.label, unit: t.unit, op: t.op, value: str(t.value), value2: str(t.value2) })));
  const [mode, setMode] = useState<"maintenance" | "cut">(food.calories?.mode === "cut" ? "cut" : "maintenance");
  const [kcal, setKcal] = useState({ maintenance: str(food.calories?.maintenance), cut: str(food.calories?.cut) });
  const [protein, setProtein] = useState({ min: str(food.protein_g?.min), max: str(food.protein_g?.max) });
  const [water, setWater] = useState({ min: str(food.water_l?.min), max: str(food.water_l?.max) });
  const numberItems = (plan.checklist ?? []).filter((c) => c.kind === "number" && c.source !== "apple-health");
  const [checks, setChecks] = useState(() => Object.fromEntries(numberItems.map((c) => [c.id, str(c.target)])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch(): PlanPatch | string {
    const out: PlanPatch = {};
    if (targets.length) {
      out.targets = [];
      for (const t of targets) {
        const value = numOrNull(t.value);
        const value2 = t.op === "between" ? numOrNull(t.value2) : null;
        if (value === null) return `${t.label} needs a number.`;
        if (t.op === "between" && (value2 === null || value2 <= value)) return `${t.label}: the upper number must be bigger than the lower one.`;
        out.targets.push({ id: t.id, op: t.op, value, value2 });
      }
    }
    if (plan.food) {
      const f: NonNullable<PlanPatch["food"]> = {};
      if (plan.food.calories) {
        f.calories = { mode };
        const m = numOrNull(kcal.maintenance);
        const c = numOrNull(kcal.cut);
        if (m !== null) f.calories.maintenance = m;
        if (c !== null) f.calories.cut = c;
      }
      if (plan.food.protein_g) f.protein_g = { ...(numOrNull(protein.min) !== null ? { min: Number(protein.min) } : {}), ...(numOrNull(protein.max) !== null ? { max: Number(protein.max) } : {}) };
      if (plan.food.water_l) f.water_l = { ...(numOrNull(water.min) !== null ? { min: Number(water.min) } : {}), ...(numOrNull(water.max) !== null ? { max: Number(water.max) } : {}) };
      out.food = f;
    }
    if (numberItems.length) out.checklist = numberItems.flatMap((c) => (numOrNull(checks[c.id]) !== null ? [{ id: c.id, target: Number(checks[c.id]) }] : []));
    return out;
  }

  async function save() {
    const p = patch();
    if (typeof p === "string") return setError(p);
    setError(null);
    setBusy(true);
    try {
      await fitnessApi.plan(ctx, person, p);
      toast.show({ message: "Plan updated" });
      onDone();
    } catch {
      toast.show({ message: "Could not save that, try again", error: true });
    }
    setBusy(false);
  }

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      {targets.length > 0 && (
        <fieldset className="space-y-4">
          <legend className="mb-1 font-extrabold">Targets</legend>
          {targets.map((t, i) => {
            const set = (k: "op" | "value" | "value2", v: string) => setTargets((ts) => ts.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
            return (
              <div key={t.id} className="space-y-1.5">
                <p className="font-bold">{t.label}</p>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="block w-32">
                    <span className="mb-1 block text-sm font-semibold text-muted">Rule</span>
                    <select value={t.op} onChange={(e) => set("op", e.target.value)} aria-label={`${t.label} rule`} className="field !min-h-11">
                      {OPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                  <NumberField label={t.op === "between" ? "From" : "Value"} ariaLabel={`${t.label} ${t.op === "between" ? "from" : "value"}`} unit={t.unit} value={t.value} onChange={(v) => set("value", v)} width="w-28 flex-1" />
                  {t.op === "between" && <NumberField label="To" ariaLabel={`${t.label} to`} unit={t.unit} value={t.value2} onChange={(v) => set("value2", v)} width="w-28 flex-1" />}
                </div>
              </div>
            );
          })}
        </fieldset>
      )}

      {plan.food?.calories && (
        <fieldset className="space-y-3">
          <legend className="mb-1 font-extrabold">Calories</legend>
          <Segmented label="Calories mode" value={mode} onChange={setMode} options={[["maintenance", "Maintenance"], ["cut", "Cut"]] as const} />
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Maintenance" unit="kcal" step="10" value={kcal.maintenance} onChange={(v) => setKcal((k) => ({ ...k, maintenance: v }))} />
            <NumberField label="Cut" unit="kcal" step="10" value={kcal.cut} onChange={(v) => setKcal((k) => ({ ...k, cut: v }))} />
          </div>
        </fieldset>
      )}

      {(plan.food?.protein_g || plan.food?.water_l) && (
        <fieldset className="space-y-3">
          <legend className="mb-1 font-extrabold">Protein and water</legend>
          {plan.food?.protein_g && (
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Protein from" unit="g" value={protein.min} onChange={(v) => setProtein((p) => ({ ...p, min: v }))} />
              <NumberField label="Protein to" unit="g" value={protein.max} onChange={(v) => setProtein((p) => ({ ...p, max: v }))} />
            </div>
          )}
          {plan.food?.water_l && (
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Water from" unit="L" value={water.min} onChange={(v) => setWater((w) => ({ ...w, min: v }))} />
              <NumberField label="Water to" unit="L" value={water.max} onChange={(v) => setWater((w) => ({ ...w, max: v }))} />
            </div>
          )}
        </fieldset>
      )}

      {numberItems.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="mb-1 font-extrabold">Daily checklist</legend>
          <div className="grid grid-cols-2 gap-3">
            {numberItems.map((c) => (
              <NumberField key={c.id} label={c.label} unit={c.unit} value={checks[c.id] ?? ""} onChange={(v) => setChecks((x) => ({ ...x, [c.id]: v }))} />
            ))}
          </div>
        </fieldset>
      )}

      {error && <p className="font-semibold text-destructive" role="alert">{error}</p>}
      <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>{busy ? <><Spinner />Saving...</> : "Save changes"}</button>
    </form>
  );
}
