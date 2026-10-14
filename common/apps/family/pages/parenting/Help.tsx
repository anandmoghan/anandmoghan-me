'use client';

import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "@/common/apps/family/router";
import { Badge, HubCard, SectionTitle, Segmented, outlineBtn, primaryBtn, type Tone } from "@/common/apps/family/components/ui";
import { ChevronRightIcon } from "@/common/apps/family/components/Icons";
import { ChoiceChips, STATUS_TONE } from "@/common/apps/family/components/parenting/parts";
import Spinner from "@/common/apps/family/components/Spinner";
import { AskBox } from "@/common/apps/family/pages/parenting/Ask";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { toMillis } from "@/common/apps/family/lib/format";
import { PROBLEM_STATUS, isGuide, isStepPlan, orderedSteps, parentingApi, type ParentingData, type Problem, type ProblemStatus, type UseParenting } from "@/common/apps/family/lib/parenting";

const CHOICES = ["At bedtime", "In the night", "At mealtimes", "With other children", "Out and about", "Every day", "New this week", "Step by step", "Prevention"];

function AddProblem({ p }: { p: UseParenting }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [choices, setChoices] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    try {
      const r = await parentingApi.problem(p.ctx, text.trim(), choices);
      setText("");
      setChoices([]);
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
const SHOWN = 3;

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
  ["plans", "Step by step plans", "Plans", "No step by step plans yet. Pick \"Step by step\" when you add a problem."],
  ["habits", "Good habits", "Habits", "No good habits yet. Pick \"Prevention\" when you add one."],
  ["problems", "Problems we're working on", "Problems", "Nothing open. Use Add a problem above to get a playbook for it."],
];
// The open tab, kept for the session so coming back from a problem lands on the same tab.
const TAB_KEY = "nila-help-tab";

/** A one-tap card that opens a form in place, so a question or a new problem is one tap away without a long page. */
function ExpandCard({ title, hint, startOpen = false, testId, children }: { title: string; hint: string; startOpen?: boolean; testId: string; children: ReactNode }) {
  const [open, setOpen] = useState(startOpen);
  if (open) return <div className="space-y-2">{children}<button type="button" onClick={() => setOpen(false)} className={`${outlineBtn} w-full`}>Close</button></div>;
  return (
    <button type="button" data-testid={testId} aria-expanded={false} onClick={() => setOpen(true)} className="tap card flex min-h-16 w-full items-center gap-3 !px-3.5 !py-3 text-left hover:bg-subtle">
      <span className="min-w-0 flex-1">
        <span className="block font-bold leading-snug">{title}</span>
        <span className="block text-sm text-muted">{hint}</span>
      </span>
      <span className="shrink-0 text-muted" aria-hidden><ChevronRightIcon /></span>
    </button>
  );
}

/** One group: its first few cards, and See all for the rest. */
function Group({ kind, title, empty, items }: { kind: SectionKey; title: string; empty: string; items: Problem[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, SHOWN);
  return (
    <section className="space-y-2.5" aria-label={title}>
      {items.length === 0 ? (
        <p className="card !px-4 !py-3.5 text-muted">{empty}</p>
      ) : (
        <ul className="space-y-2.5">{shown.map((pr) => <ProblemRow key={pr.id} pr={pr} kind={kind} />)}</ul>
      )}
      {items.length > SHOWN && (
        <button type="button" aria-expanded={all} onClick={() => setAll(!all)} className={`${outlineBtn} w-full`}>{all ? "Show fewer" : `See all (${items.length})`}</button>
      )}
    </section>
  );
}

const ASK_LABEL = { answered: "Answered", failed: "Failed", pending: "Researching…" } as const;

export default function Help({ p, data }: { p: UseParenting; data: ParentingData }) {
  const { hash } = useLocation();
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
  const [tab, setTab] = useState<SectionKey>(() => {
    try {
      const stored = sessionStorage.getItem(TAB_KEY);
      if (SECTIONS.some(([key]) => key === stored)) return stored as SectionKey;
    } catch {
      // storage blocked
    }
    return SECTIONS.find(([key]) => byKind[key].length)?.[0] ?? "plans";
  });
  function choose(next: SectionKey) {
    setTab(next);
    try {
      sessionStorage.setItem(TAB_KEY, next);
    } catch {
      // storage blocked
    }
  }
  const latest = [...data.asks].sort((a, b) => (toMillis(b.asked_at) ?? 0) - (toMillis(a.asked_at) ?? 0))[0];
  return (
    <div className="space-y-6">
      <div className="space-y-2.5">
        <ExpandCard key={hash === "#ask" ? "ask-open" : "ask"} title="Ask a question" hint="Answered with guidelines and studies, with sources" startOpen={hash === "#ask"} testId="hub-ask"><AskBox p={p} /></ExpandCard>
        <HubCard to="/nila/questions" testId="hub-questions" title="Your questions" lines={data.asks.length ? [`${data.asks.length} ${data.asks.length === 1 ? "question" : "questions"}`, latest && `Latest: ${ASK_LABEL[latest.status]}`] : ["No questions yet"]} />
        <ExpandCard title="Add a problem" hint="Get a researched playbook for something you see" testId="hub-add-problem"><AddProblem p={p} /></ExpandCard>
      </div>
      <Segmented
        center
        label="Help"
        value={tab}
        onChange={choose}
        options={SECTIONS.map(([key, , short]) => [key, byKind[key].length ? `${short} · ${byKind[key].length}` : short] as const)}
      />
      {SECTIONS.filter(([key]) => key === tab).map(([key, title, , empty]) => <Group key={key} kind={key} title={title} empty={empty} items={byKind[key]} />)}
    </div>
  );
}
