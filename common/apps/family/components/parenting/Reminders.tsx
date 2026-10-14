'use client';

import { useEffect, useState } from "react";
import { SectionTitle, primaryBtn } from "@/common/apps/family/components/ui";
import { ChoiceChips } from "@/common/apps/family/components/parenting/parts";
import Spinner from "@/common/apps/family/components/Spinner";
import { useData } from "@/common/apps/family/hooks/useData";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { NAP_LEADS, REMINDER_DAYS, REMINDER_LABEL, parentingApi, phoneZone, zoneName, type Reminder, type ReminderDays, type UseParenting } from "@/common/apps/family/lib/parenting";

/** Push reminders (sent to the PWA install; this site does not register devices yet) for the sleep plan and habits: on or off, time, days and which parents get each. The phone only
 * ever shows fixed text ("Bedtime routine starts soon"), never anything from her records. */
export default function Reminders({ p }: { p: UseParenting }) {
  const toast = useToast();
  const { people } = useData();
  const [list, setList] = useState<Reminder[] | null>(null);
  const [parents, setParents] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let live = true;
    parentingApi.reminders(p.ctx).then(
      (r) => {
        if (!live) return;
        setList(r.reminders);
        setParents(r.parents);
      },
      () => { if (live) setFailed(true); },
    );
    return () => { live = false; };
  }, [p.ctx]);

  const name = (id: string) => String(people.find((x) => x.id === id)?.name ?? id).split(" ")[0];
  const update = (id: string, patch: Partial<Reminder>) => {
    setList((l) => l?.map((r) => (r.id === id ? { ...r, ...patch } : r)) ?? l);
    setDirty(true);
  };

  async function save() {
    if (!list) return;
    setBusy(true);
    try {
      const r = await parentingApi.saveReminders(p.ctx, list);
      setList(r.reminders);
      setDirty(false);
      toast.show({ message: "Reminders saved" });
    } catch {
      toast.show({ message: "Could not save the reminders, try again", error: true });
    }
    setBusy(false);
  }

  return (
    <section id="reminders" className="space-y-3" aria-label="Reminders">
      <SectionTitle title="Reminders" />
      <p className="text-muted">A short nudge on your phone. It never says anything from her records.</p>
      <p className="text-xs text-muted" data-testid="reminder-zone">Times are in {zoneName()} ({phoneZone()}).</p>
      {failed && <p className="card !px-4 !py-3.5 text-muted" role="alert">The reminders could not be loaded from the Mac.</p>}
      {list && (
        <ul className="space-y-2.5">
          {list.map((r) => {
            const label = REMINDER_LABEL[r.kind] ?? r.kind;
            return (
              <li key={r.id} className="card space-y-3 !p-4" data-testid="reminder">
                <div className="flex min-h-11 items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold" id={`rem-${r.id}`}>{label}</p>
                    {r.kind === "sleep-step" && <p className="text-sm text-muted">Only while the sleep plan is active</p>}
                    {r.kind === "nap" && <p className="text-sm text-muted">Only after you log a wake today</p>}
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={r.enabled}
                    aria-labelledby={`rem-${r.id}`}
                    onClick={() => update(r.id, { enabled: !r.enabled })}
                    className={`relative h-11 w-16 shrink-0 rounded-full transition-colors ${r.enabled ? "bg-domain" : "bg-border"}`}
                  >
                    <span aria-hidden className={`absolute top-1.5 h-8 w-8 rounded-full bg-surface shadow-card transition-all ${r.enabled ? "left-[1.875rem]" : "left-1.5"}`} />
                  </button>
                </div>
                {r.kind === "nap" ? (
                  <label className="block min-w-0">
                    <span className="mb-1 block text-sm font-semibold text-muted">Minutes before the window opens</span>
                    <select aria-label={`Minutes before: ${label}`} value={r.lead_minutes ?? 15} onChange={(e) => update(r.id, { lead_minutes: Number(e.target.value) })} className="field !min-h-11">
                      {NAP_LEADS.map((n) => <option key={n} value={n}>{n} minutes</option>)}
                    </select>
                  </label>
                ) : (
                <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                  <label className="block min-w-0">
                    <span className="mb-1 block text-sm font-semibold text-muted">Time</span>
                    <input type="time" aria-label={`Time: ${label}`} value={r.time} onChange={(e) => update(r.id, { time: e.target.value })} className="field !min-h-11" />
                  </label>
                  <label className="block min-w-0">
                    <span className="mb-1 block text-sm font-semibold text-muted">Days</span>
                    <select aria-label={`Days: ${label}`} value={r.days} onChange={(e) => update(r.id, { days: e.target.value as ReminderDays })} className="field !min-h-11">
                      {REMINDER_DAYS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                </div>
                )}
                {parents.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-muted">Who gets it</p>
                    <ChoiceChips
                      label={`Who gets it: ${label}`}
                      options={parents.map(name)}
                      value={r.to.map(name)}
                      onChange={(names) => update(r.id, { to: parents.filter((id) => names.includes(name(id))) })}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {list && (
        <button type="button" disabled={busy || !dirty || list.some((r) => !r.time)} onClick={() => void save()} className={`${primaryBtn} w-full`}>{busy ? <><Spinner />Saving...</> : "Save reminders"}</button>
      )}
    </section>
  );
}
