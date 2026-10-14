'use client';

import { useState } from "react";
import { Badge, SectionTitle, Segmented, outlineBtn, primaryBtn, softBtn } from "@/common/apps/family/components/ui";
import { Sheet } from "@/common/apps/family/components/fitness/parts";
import { SourceList } from "@/common/apps/family/components/health/parts";
import { ResearchComing } from "@/common/apps/family/components/parenting/parts";
import Spinner from "@/common/apps/family/components/Spinner";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { dayKey } from "@/common/apps/family/lib/fitness";
import {
  AREAS, AREA_LABEL, ageParts, comingWindows, fmtSeen, parentingApi, researching, seenKey,
  type Area, type CatalogMilestone, type CatalogWindow, type Milestone, type ParentingData, type UseParenting,
} from "@/common/apps/family/lib/parenting";

interface Pick { id?: string; title: string; area: Area }

/** Mark one milestone seen: the date defaults to today, a note is optional. Also adds one by hand (no id). */
function SeenForm({ pick, onDone, p }: { pick: Pick | null; onDone: () => void; p: UseParenting }) {
  const toast = useToast();
  const today = dayKey();
  const [title, setTitle] = useState(pick?.title ?? "");
  const [area, setArea] = useState<Area>(pick?.area ?? "motor");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const byHand = !pick?.id;

  async function save() {
    setBusy(true);
    try {
      await parentingApi.milestone(p.ctx, {
        ...(pick?.id ? { id: pick.id } : {}),
        title: title.trim(),
        area,
        status: "seen",
        seen_on: date,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      toast.show({ message: "Saved" });
      onDone();
      await p.refresh();
    } catch {
      toast.show({ message: "Could not save that, try again", error: true });
    }
    setBusy(false);
  }

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      {byHand ? (
        <>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-muted">What she did</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="For example: claps along to a song" className="field !min-h-11" />
          </label>
          <Segmented label="Area" scroll value={area} onChange={setArea} options={AREAS} />
        </>
      ) : (
        <p className="text-[1.05rem] font-bold leading-snug">{pick?.title}</p>
      )}
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-muted">When you saw it</span>
        <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="field !min-h-11" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-muted">Note (optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="field !min-h-11" />
      </label>
      <button type="submit" disabled={busy || !title.trim() || !date || date > today} className={`${primaryBtn} w-full`}>{busy ? <><Spinner />Saving...</> : "Save"}</button>
    </form>
  );
}

function WindowCard({ w, seen, current, onPick }: { w: CatalogWindow; seen: Map<string, Milestone>; current: boolean; onPick: (m: CatalogMilestone) => void }) {
  const items = w.milestones ?? [];
  return (
    <li className="card space-y-3 !p-4" data-testid="window">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[1.08rem] font-extrabold">{w.label}</h3>
        {current && <Badge tone="accent">Now</Badge>}
      </div>
      {items.length > 0 && (
        <ul className="divide-y divide-border/70">
          {items.map((m) => {
            const done = seen.get(m.id);
            return (
              <li key={m.id} className="flex items-start gap-3 py-2">
                {done ? (
                  <span aria-hidden className="mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-domain text-sm font-bold text-domain-foreground">✓</span>
                ) : (
                  <span aria-hidden className="mt-1.5 h-6 w-6 shrink-0 rounded-full border-2 border-foreground/30" />
                )}
                <div className="min-w-0 flex-1 pt-1">
                  <p className={`font-semibold leading-snug ${done ? "text-muted" : ""}`}>{m.title}</p>
                  <p className="text-sm text-muted">{[AREA_LABEL[m.area], done?.seen_on ? `Seen ${fmtSeen(done.seen_on, done.seen_on_approx)}` : m.typical].filter(Boolean).join(" · ")}</p>
                </div>
                {!done && <button type="button" onClick={() => onPick(m)} aria-label={`Seen it: ${m.title}`} className={`${softBtn} shrink-0`}>Seen it</button>}
              </li>
            );
          })}
        </ul>
      )}
      {!!w.act_early?.length && (
        <div className="rounded-2xl bg-gold/10 p-3">
          <p className="text-sm font-bold text-gold">When to get advice</p>
          <ul className="mt-1 space-y-1.5">
            {w.act_early.map((a) => (
              <li key={a.id} className="flex items-start gap-2.5 text-[0.95rem]">
                <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                <span className="min-w-0 flex-1"><span className="font-semibold">{a.sign}</span>{a.action ? <span className="text-muted">. {a.action}</span> : null}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <SourceList sources={w.sources} />
    </li>
  );
}

export default function Milestones({ p, data }: { p: UseParenting; data: ParentingData }) {
  const [pick, setPick] = useState<Pick | null>(null);
  const [open, setOpen] = useState(false);
  const list = data.milestones?.milestones ?? [];
  const seen = new Map(list.filter((m) => m.status === "seen").map((m) => [m.id, m]));
  const done = [...seen.values()].sort((a, b) => seenKey(b.seen_on).localeCompare(seenKey(a.seen_on)));
  const working = list.filter((m) => m.status === "emerging" || m.status === "watching");
  const months = ageParts(data.dob)?.months ?? null;
  const windows = comingWindows(data.catalog?.windows ?? [], months);

  function choose(next: Pick | null) {
    setPick(next);
    setOpen(true);
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2.5" aria-label="Coming up">
        <div className="flex items-end justify-between gap-3">
          <SectionTitle title="Coming up" />
          <button type="button" onClick={() => choose(null)} className={outlineBtn}>Add one</button>
        </div>
        {windows.length === 0 ? (
          <ResearchComing title="What to look for next is not ready yet" busy={researching(data, "plan")} />
        ) : (
          <ul className="space-y-3">
            {windows.map((w) => (
              <WindowCard key={w.id} w={w} seen={seen} current={months !== null && w.from_months <= months && months <= w.to_months} onPick={(m) => choose({ id: m.id, title: m.title, area: m.area })} />
            ))}
          </ul>
        )}
      </section>

      {working.length > 0 && (
        <section className="space-y-2.5" aria-label="Working on">
          <SectionTitle title="Working on" />
          <ul className="card card--flush divide-y divide-border">
            {working.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <p className="font-semibold leading-snug">{m.title}</p>
                  <p className="text-sm text-muted">{[AREA_LABEL[m.area], m.status === "emerging" ? "Starting to" : "Watching"].filter(Boolean).join(" · ")}</p>
                </div>
                <button type="button" onClick={() => choose({ id: m.id, title: m.title, area: m.area })} aria-label={`Seen it: ${m.title}`} className={`${softBtn} shrink-0`}>Seen it</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2.5" aria-label="What she has done">
        <SectionTitle title="What she has done" count={done.length ? `${done.length} so far` : undefined} />
        {done.length === 0 ? (
          <p className="card !px-4 !py-3.5 text-muted">Nothing marked yet. Tap "Seen it" on a milestone, or add one.</p>
        ) : (
          <ol className="card relative space-y-0 !py-1" data-testid="done-timeline">
            {done.map((m) => (
              <li key={m.id} className="relative flex gap-3 px-3.5 py-2.5">
                <span className="w-[5.6rem] shrink-0 pt-0.5 text-sm font-semibold text-muted">{fmtSeen(m.seen_on, m.seen_on_approx) || "Date unknown"}</span>
                <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-domain" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{m.title}</p>
                  <p className="text-sm text-muted">{[AREA_LABEL[m.area], m.note].filter(Boolean).join(" · ")}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <Sheet open={open} title={pick?.id ? "Mark as seen" : "Add a milestone"} onClose={() => setOpen(false)}>
        <SeenForm key={`${pick?.id ?? "new"}-${String(open)}`} pick={pick} p={p} onDone={() => setOpen(false)} />
      </Sheet>
    </div>
  );
}
