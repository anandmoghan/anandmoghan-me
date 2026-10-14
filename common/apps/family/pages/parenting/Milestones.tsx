'use client';

import { useEffect, useState, type ReactNode } from "react";
import { useViewTab } from "@/common/apps/family/hooks/useViewTab";
import { Badge, SectionTitle, Segmented, outlineBtn, primaryBtn, softBtn } from "@/common/apps/family/components/ui";
import { Sheet } from "@/common/apps/family/components/fitness/parts";
import { SourceList } from "@/common/apps/family/components/health/parts";
import { ResearchComing } from "@/common/apps/family/components/parenting/parts";
import Spinner from "@/common/apps/family/components/Spinner";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { dayKey } from "@/common/apps/family/lib/fitness";
import {
  AREAS, AREA_LABEL, ageAtSeen, ageParts, comingWindows, fmtSeen, parentingApi, researching, seenKey, windowTiming,
  type Area, type CatalogMilestone, type CatalogWindow, type Milestone, type ParentingData, type UseParenting,
} from "@/common/apps/family/lib/parenting";

interface Pick { id?: string; title: string; area: Area }

type View = "coming" | "working" | "done";
const VIEWS: readonly (readonly [View, string])[] = [["coming", "Coming up"], ["working", "Working on"], ["done", "Done"]];

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

interface Entry { m: Milestone | CatalogMilestone; w: CatalogWindow | null }

const windowRange = (w: CatalogWindow) => `${w.from_months}–${w.to_months} months`;

/** Earliest expected start first (then end, then title); milestones without a window go last. */
function byExpected(a: Entry, b: Entry): number {
  if (!a.w || !b.w) return a.w ? -1 : b.w ? 1 : 0;
  return a.w.from_months - b.w.from_months || a.w.to_months - b.w.to_months || a.m.title.localeCompare(b.m.title);
}

function timingText(t: { kind: "early" | "on-time" | "late"; by: number }, approx: boolean): string {
  const about = approx ? "about " : "";
  if (t.kind === "on-time") return `${about}on time`;
  return `${about}${t.by} month${t.by === 1 ? "" : "s"} ${t.kind}`;
}

/** Free-text note about what she did; the Mac marks the milestones it finds. */
function Describe({ p, data }: { p: UseParenting; data: ParentingData }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const latest = [...(data.milestone_requests ?? [])].sort((a, b) => b.requested_at.localeCompare(a.requested_at))[0];
  const pending = latest?.status === "pending";
  const offline = p.live === false;
  const { refresh } = p;

  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(timer);
  }, [pending, refresh]);

  async function send() {
    setBusy(true);
    try {
      await parentingApi.describeMilestones(p.ctx, text.trim());
      setText("");
      toast.show({ message: "Sent. The Mac will mark what it finds." });
      await p.refresh();
    } catch {
      toast.show({ message: "Could not send that, try again", error: true });
    }
    setBusy(false);
  }

  const marked = (latest?.result ?? []).filter((r) => r.action !== "none").map((r) => r.title);

  return (
    <form className="card space-y-3 !p-4" onSubmit={(e) => { e.preventDefault(); void send(); }}>
      <h3 className="text-[1.08rem] font-extrabold">Tell us what she did</h3>
      <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={3} aria-label="What she did" placeholder="For example: pulled herself up on the sofa and waved bye" className="field" />
      <button type="submit" disabled={busy || offline || !text.trim()} className={`${primaryBtn} w-full`}>{busy ? <><Spinner />Sending...</> : "Send to the Mac"}</button>
      {offline && <p className="text-sm text-muted">The Mac is offline, try again when it is back.</p>}
      {latest && !offline && (
        <p className="flex flex-wrap items-center gap-2 text-sm" data-testid="milestone-request">
          {pending && <><Badge tone="muted" pulse>Working</Badge><span className="text-muted">Working on your last note…</span></>}
          {latest.status === "done" && <span className="text-muted">{marked.length ? `Marked: ${marked.join(", ")}` : "Nothing to mark in your last note"}</span>}
          {latest.status === "failed" && <Badge tone="destructive">Could not read your last note</Badge>}
        </p>
      )}
    </form>
  );
}

export default function Milestones({ p, data }: { p: UseParenting; data: ParentingData }) {
  const [pick, setPick] = useState<Pick | null>(null);
  const [open, setOpen] = useState(false);
  const list = data.milestones?.milestones ?? [];
  const allWindows = data.catalog?.windows ?? [];
  // Catalog membership across every window, so a milestone from a later window still finds its own.
  const windowOf = new Map(allWindows.flatMap((w) => (w.milestones ?? []).map((m) => [m.id, w] as const)));
  const seen = new Map(list.filter((m) => m.status === "seen").map((m) => [m.id, m]));
  // Newest first; undated last.
  const done = [...seen.values()].sort((a, b) => seenKey(b.seen_on).localeCompare(seenKey(a.seen_on)));
  const working: Entry[] = list.filter((m) => m.status === "emerging" || m.status === "watching").map((m) => ({ m, w: windowOf.get(m.id) ?? null })).sort(byExpected);
  const months = ageParts(data.dob)?.months ?? null;
  const windows = comingWindows(allWindows, months);
  const coming: Entry[] = windows.flatMap((w) => (w.milestones ?? []).filter((m) => !seen.has(m.id)).map((m) => ({ m, w }))).sort(byExpected);
  const advice = windows.filter((w) => w.act_early?.length || w.sources?.length);

  const views = VIEWS.filter(([v]) => v !== "working" || working.length > 0);
  const [shown, setView] = useViewTab(views, "coming");

  function choose(next: Pick | null) {
    setPick(next);
    setOpen(true);
  }

  return (
    <div className="space-y-5">
      <Describe p={p} data={data} />
      <Segmented center label="Milestones view" value={shown} onChange={setView} options={views} />

      {shown === "coming" && <section className="space-y-2.5" aria-label="Coming up">
        <div className="flex items-end justify-between gap-3">
          <SectionTitle title="Coming up" />
          <button type="button" onClick={() => choose(null)} className={outlineBtn}>Add one</button>
        </div>
        {coming.length === 0 ? (
          <ResearchComing title="What to look for next is not ready yet" busy={researching(data, "plan")} />
        ) : (
          <ul className="card card--flush divide-y divide-border" data-testid="coming-list">
            {coming.map(({ m, w }) => {
              const now = months !== null && !!w && w.from_months <= months && months <= w.to_months;
              const overdue = months !== null && !!w && months > w.to_months;
              return (
                <li key={m.id} className="flex items-start gap-3 p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">{m.title}</p>
                    <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm ${overdue ? "text-gold" : "text-muted"}`}>
                      <span>{[AREA_LABEL[m.area], w ? `Expected ${windowRange(w)}` : null].filter(Boolean).join(" · ")}</span>
                      {now && <Badge tone="accent">Now</Badge>}
                      {overdue && <Badge tone="gold">Overdue</Badge>}
                    </p>
                  </div>
                  <button type="button" onClick={() => choose({ id: m.id, title: m.title, area: m.area })} aria-label={`Seen it: ${m.title}`} className={`${softBtn} shrink-0`}>Seen it</button>
                </li>
              );
            })}
          </ul>
        )}
        {advice.length > 0 && (
          <div className="space-y-2 pt-2">
            <SectionTitle title="When to get advice" />
            {advice.map((w) => (
              <details key={w.id} className="card !p-4" data-testid="window">
                <summary className="cursor-pointer font-bold">{w.label}</summary>
                <div className="mt-3 space-y-3">
                  {!!w.act_early?.length && (
                    <div className="rounded-2xl bg-gold/10 p-3">
                      <ul className="space-y-1.5">
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
                </div>
              </details>
            ))}
          </div>
        )}
      </section>}

      {shown === "working" && (
        <section className="space-y-2.5" aria-label="Working on">
          <SectionTitle title="Working on" />
          <ul className="card card--flush divide-y divide-border">
            {working.map(({ m }) => (
              <li key={m.id} className="flex items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <p className="font-semibold leading-snug">{m.title}</p>
                  <p className="text-sm text-muted">{[AREA_LABEL[m.area], (m as Milestone).status === "emerging" ? "Starting to" : "Watching"].filter(Boolean).join(" · ")}</p>
                </div>
                <button type="button" onClick={() => choose({ id: m.id, title: m.title, area: m.area })} aria-label={`Seen it: ${m.title}`} className={`${softBtn} shrink-0`}>Seen it</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {shown === "done" && <section className="space-y-2.5" aria-label="What she has done">
        <div className="flex items-end justify-between gap-3">
          <SectionTitle title="What she has done" count={done.length ? `${done.length} so far` : undefined} />
          <button type="button" onClick={() => choose(null)} className={outlineBtn}>Add one</button>
        </div>
        {done.length === 0 ? (
          <p className="card !px-4 !py-3.5 text-muted">Nothing marked yet. Tap "Seen it" on a milestone, or add one.</p>
        ) : (
          <ul className="card card--flush divide-y divide-border" data-testid="done-timeline">
            {done.map((m) => {
              const w = windowOf.get(m.id);
              const age = ageAtSeen(data.dob, m.seen_on);
              const t = w && age !== null ? windowTiming(w, age) : null;
              return (
                <li key={m.id} className="p-3.5">
                  <p className="font-semibold leading-snug">{m.title}</p>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                    <span>{[AREA_LABEL[m.area], fmtSeen(m.seen_on, m.seen_on_approx) || "Date unknown", age !== null ? `at ${age} month${age === 1 ? "" : "s"}` : null, m.note].filter(Boolean).join(" · ")}</span>
                    {t && <Badge tone={t.kind === "early" ? "accent" : t.kind === "late" ? "gold" : "muted"}>{timingText(t, !!m.seen_on_approx)}</Badge>}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>}

      <Sheet open={open} title={pick?.id ? "Mark as seen" : "Add a milestone"} onClose={() => setOpen(false)}>
        <SeenForm key={`${pick?.id ?? "new"}-${String(open)}`} pick={pick} p={p} onDone={() => setOpen(false)} />
      </Sheet>
    </div>
  );
}
