'use client';

import { useState } from "react";
import { SectionTitle, Segmented } from "@/common/apps/family/components/ui";
import { SourceList } from "@/common/apps/family/components/health/parts";
import { FitnessNotice, NoPlan, usePlanRequest } from "@/common/apps/family/components/fitness/parts";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { fitnessApi, fmtNum, type FitnessData, type UseFitness } from "@/common/apps/family/lib/fitness";
import type { Person } from "@/common/apps/family/types";

const range = (r: { min?: number; max?: number } | undefined, unit: string) =>
  !r ? null : r.min !== undefined && r.max !== undefined && r.max !== r.min ? `${fmtNum(r.min, 2)} to ${fmtNum(r.max, 2)} ${unit}` : `${fmtNum((r.min ?? r.max) as number, 2)} ${unit}`;

function Stat({ label, value, sub, wide = false }: { label: string; value: string; sub?: string; wide?: boolean }) {
  return (
    <div className={`card min-w-0 !p-4 ${wide ? "col-span-2 md:col-span-1" : ""}`}>
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="text-xl font-extrabold leading-tight">{value}</p>
      {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
    </div>
  );
}

export default function FoodTab({ person, f, data }: { person: Person; f: UseFitness; data: FitnessData }) {
  const toast = useToast();
  const req = usePlanRequest(f, person);
  const food = data.plan?.food;
  const [mode, setMode] = useState<"maintenance" | "cut">(food?.calories?.mode === "cut" ? "cut" : "maintenance");
  if (!data.plan || !food) return <div className="space-y-6"><NoPlan person={person} onRequest={() => void req.request()} busy={req.busy || req.sent} /><FitnessNotice /></div>;

  async function switchMode(m: "maintenance" | "cut") {
    const before = mode;
    setMode(m);
    try {
      await fitnessApi.plan(f.ctx, person, { food: { calories: { mode: m } } });
      await f.refresh();
    } catch {
      setMode(before);
      toast.show({ message: "Could not save that, try again", error: true });
    }
  }

  const cal = food.calories;
  const kcal = cal ? (mode === "cut" ? cal.cut : cal.maintenance) : undefined;
  const protein = range(food.protein_g, "g");
  const water = range(food.water_l, "L");

  return (
    <div className="space-y-8">
      {food.pattern && (
        <section className="space-y-1" aria-label="Eating window">
          <SectionTitle title="Eating window" />
          <p className="text-[1.05rem]">{food.pattern}</p>
        </section>
      )}

      <section className="space-y-3" aria-label="Daily targets">
        <SectionTitle title="Daily targets" />
        {cal && (cal.cut !== undefined || cal.maintenance !== undefined) && (
          <Segmented label="Calories" value={mode} onChange={(m) => void switchMode(m)} options={[["maintenance", "Maintenance"], ["cut", "Cut"]] as const} />
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {kcal !== undefined && <Stat wide label="Calories" value={`${fmtNum(kcal, 0)} kcal`} sub={mode === "cut" ? (cal?.cut_weeks ? `For ${cal.cut_weeks} weeks` : "While cutting") : "To keep weight steady"} />}
          {protein && <Stat label="Protein" value={protein} />}
          {water && <Stat label="Water" value={water} />}
        </div>
      </section>

      {!!food.meals?.length && (
        <section className="space-y-2.5" aria-label="Meals">
          <SectionTitle title="Meals" />
          <ul className="card card--flush divide-y divide-border">
            {food.meals.map((m) => (
              <li key={m.id} className="p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="font-bold">{m.label}{m.time && <span className="font-semibold text-muted">, {m.time}</span>}</p>
                  <p className="text-sm font-bold text-domain">
                    {[m.kcal !== undefined && `${fmtNum(m.kcal, 0)} kcal`, m.protein_g !== undefined && `${m.protein_g} g protein`].filter(Boolean).join(", ")}
                  </p>
                </div>
                {m.notes && <p className="mt-1 text-[0.95rem] text-muted">{m.notes}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!!food.daily_foods?.length && (
        <section className="space-y-2.5" aria-label="Every day">
          <SectionTitle title="Every day" />
          <ul className="card card--flush divide-y divide-border">
            {food.daily_foods.map((d) => (
              <li key={d.id} className="flex gap-3 p-3.5">
                <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/[0.14] text-sm font-extrabold text-success">✓</span>
                <p className="min-w-0">{d.text}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(!!food.limit?.length || !!food.swaps?.length) && (
        <div className="grid gap-8 md:grid-cols-2 md:items-start">
          {!!food.limit?.length && (
            <section className="space-y-2.5" aria-label="Limit">
              <SectionTitle title="Limit" />
              <ul className="card card--flush divide-y divide-border">
                {food.limit.map((l) => (
                  <li key={l} className="flex gap-3 p-3.5">
                    <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/[0.12] text-sm font-extrabold text-destructive">−</span>
                    <p className="min-w-0">{l}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!!food.swaps?.length && (
            <section className="space-y-2.5" aria-label="Swaps">
              <SectionTitle title="Swaps" />
              <ul className="card card--flush divide-y divide-border">
                {food.swaps.map((s) => (
                  <li key={`${s.from}-${s.to}`} className="p-3.5">
                    <p className="text-muted line-through decoration-muted/60">{s.from}</p>
                    <p className="font-bold"><span aria-hidden className="text-domain">→ </span><span className="sr-only">Instead: </span>{s.to}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <SourceList sources={food.sources} />
      <FitnessNotice />
    </div>
  );
}
