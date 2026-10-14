'use client';

import { useEffect, useState } from "react";
import { Link } from "@/common/apps/family/router";
import { useViewTab } from "@/common/apps/family/hooks/useViewTab";
import { Badge, SectionTitle, Segmented, primaryBtn, type Tone } from "@/common/apps/family/components/ui";
import { ChevronRightIcon } from "@/common/apps/family/components/Icons";
import { ChoiceChips, STATUS_TONE } from "@/common/apps/family/components/parenting/parts";
import Spinner from "@/common/apps/family/components/Spinner";
import { AskBox, PastAsks } from "@/common/apps/family/pages/parenting/Ask";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { PROBLEM_STATUS, isGuide, isStepPlan, orderedSteps, parentingApi, type ParentingData, type Problem, type ProblemStatus, type UseParenting } from "@/common/apps/family/lib/parenting";

const CHOICES = ["At bedtime", "In the night", "At mealtimes", "With other children", "Out and about", "Every day", "New this week", "Step by step", "Prevention"];

/** `preset` ticks a choice up front: "Step by step" on the Plans tab, "Prevention" on Habits. */
function AddProblem({ p, preset }: { p: UseParenting; preset?: string }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [choices, setChoices] = useState<string[]>(preset ? [preset] : []);
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    try {
      const r = await parentingApi.problem(p.ctx, text.trim(), choices);
      setText("");
      setChoices(preset ? [preset] : []);
      toast.show({ message: r.duplicate ? "That one is already on the list" : "Added. The Mac is researching a playbook for it." });
      await p.refresh();
    } catch {
      toast.show({ message: "Could not send that, try again", error: true });
    }
    setBusy(false);
  }
  return (
    <section className="card space-y-3 !p-4" aria-label="Add a problem">
      <SectionTitle title="Add a problem" />
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-muted">What you see</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={3} placeholder="For example: cries when we leave the room at bedtime" className="field" />
      </label>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-muted">When does it happen? (optional)</p>
        <ChoiceChips label="When it happens" options={CHOICES} value={choices} onChange={setChoices} />
      </div>
      <button type="button" disabled={busy || !text.trim()} onClick={() => void send()} className={`${primaryBtn} w-full`}>{busy ? <><Spinner />Sending...</> : "Get a playbook"}</button>
    </section>
  );
}

type SectionKey = "plans" | "habits" | "problems";
const SCROLL_KEY = "nila-help-scroll";

/** The one line under a card's title. */
function cardLine(pr: Problem, kind: SectionKey): { text: string; tone?: Tone; pulse?: boolean } {
  if (pr.research === "pending") return { text: "Researching…", tone: "muted", pulse: true };
  if (pr.research === "failed") return { text: "Research failed", tone: "destructive" };
  if (kind === "plans") {
    const steps = orderedSteps(pr);
    if (!steps.length) return { text: "Plan coming" };
    const at = Math.max(0, steps.findIndex((s) => s.id === pr.current_step));
    return { text: `Step ${at + 1} of ${steps.length}: ${steps[at].title}` };
  }
  if (kind === "habits") return { text: pr.dos?.[0]?.text ?? "" };
  return { text: PROBLEM_STATUS.find(([s]) => s === pr.status)?.[1] ?? pr.status, tone: STATUS_TONE[pr.status] };
}

/** One compact card: title, a one-line status and a chevron; the playbook is on its own page. */
function ProblemRow({ pr, kind }: { pr: Problem; kind: SectionKey }) {
  const line = cardLine(pr, kind);
  return (
    <li>
      <Link
        to={`/nila/help/${pr.id}`}
        onClick={() => { try { sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)); } catch { /* not remembered */ } }}
        className="tap card flex min-h-16 items-center gap-3 !px-3.5 !py-3 hover:bg-subtle"
        data-testid="problem-row"
      >
        <span className="min-w-0 flex-1 space-y-1">
          <span className="block font-bold leading-snug">{pr.title}</span>
          {line.tone ? <Badge tone={line.tone} pulse={line.pulse}>{line.text}</Badge> : line.text && <span className="block truncate text-sm text-muted">{line.text}</span>}
        </span>
        <span className="shrink-0 text-muted"><ChevronRightIcon /></span>
      </Link>
    </li>
  );
}

const SECTIONS: [SectionKey, string, string, string][] = [
  ["plans", "Step by step plans", "Plans", "No step by step plans yet. Add one above."],
  ["habits", "Good habits", "Habits", "No good habits yet. Add one above."],
  ["problems", "Problems we're working on", "Problems", "Nothing open. Add one above to get a playbook for it."],
];
type HelpTab = "questions" | SectionKey;
const VIEWS: readonly (readonly [HelpTab, string])[] = [["questions", "Questions"], ["problems", "Problems"], ["plans", "Plans"], ["habits", "Habits"]];
const PRESET: Record<SectionKey, string | undefined> = { problems: undefined, plans: "Step by step", habits: "Prevention" };

/** One tab: every card in the group. */
function Group({ kind, title, empty, items }: { kind: SectionKey; title: string; empty: string; items: Problem[] }) {
  return (
    <section className="space-y-2.5" aria-label={title}>
      {items.length === 0 ? (
        <p className="card !px-4 !py-3.5 text-muted">{empty}</p>
      ) : (
        <ul className="space-y-2.5">{items.map((pr) => <ProblemRow key={pr.id} pr={pr} kind={kind} />)}</ul>
      )}
    </section>
  );
}

export default function Help({ p, data }: { p: UseParenting; data: ParentingData }) {
  useEffect(() => {
    // Coming back from a problem's page: back to where the list was.
    try {
      const y = Number(sessionStorage.getItem(SCROLL_KEY));
      sessionStorage.removeItem(SCROLL_KEY);
      if (y > 0) window.scrollTo(0, y);
    } catch {
      // storage blocked
    }
  }, []);
  const order: Record<ProblemStatus, number> = { open: 0, improving: 1, resolved: 2 };
  const byKind: Record<SectionKey, Problem[]> = {
    plans: data.problems.filter(isStepPlan),
    habits: data.problems.filter(isGuide),
    problems: data.problems.filter((x) => !isStepPlan(x) && !isGuide(x)).sort((a, b) => order[a.status] - order[b.status]),
  };
  const [tab, choose] = useViewTab(VIEWS, "questions");
  const count = (key: HelpTab) => (key === "questions" ? data.asks.length : byKind[key].length);
  return (
    <div className="space-y-6">
      <Segmented center scroll label="Help" value={tab} onChange={choose} options={VIEWS.map(([key, short]) => [key, count(key) ? `${short} · ${count(key)}` : short] as const)} />
      {tab === "questions" && (
        <>
          <AskBox p={p} />
          {p.live === false ? <p className="card !px-4 !py-3.5 text-muted">Your questions and answers are on the Mac, which is offline. They come back when it does.</p> : <PastAsks data={data} />}
        </>
      )}
      {SECTIONS.filter(([key]) => key === tab).map(([key, title, , empty]) => (
        <div key={key} className="space-y-6">
          <AddProblem p={p} preset={PRESET[key]} />
          <Group kind={key} title={title} empty={empty} items={byKind[key]} />
        </div>
      ))}
    </div>
  );
}
