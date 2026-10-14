'use client';

import { useState } from "react";
import { Badge, SectionTitle, outlineBtn, primaryBtn } from "@/common/apps/family/components/ui";
import { SourceList } from "@/common/apps/family/components/health/parts";
import { Points } from "@/common/apps/family/components/Points";
import Spinner from "@/common/apps/family/components/Spinner";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { fmtDate, healthApi, type Ask, type HealthData, type Question, type UseHealth } from "@/common/apps/family/lib/health";
import { toMillis } from "@/common/apps/family/lib/format";
import type { Person } from "@/common/apps/family/types";

const field = "field !min-h-11";

interface Draft { picks: string[]; value: string; details: string }
const EMPTY: Draft = { picks: [], value: "", details: "" };
const MAX_ANSWER = 2000;

/** Collapses a draft into the single string the bridge stores. */
function composeAnswer(q: Question, d: Draft): string {
  const main = q.kind === "choice" || q.kind === "yes-no" ? d.picks.join(", ") : d.value.trim();
  const details = q.kind === "text" ? "" : d.details.trim();
  const out = details ? (main ? `${main}. Details: ${details}` : `Details: ${details}`) : main;
  return out.slice(0, MAX_ANSWER);
}

function QuestionInput({ q, draft, onChange }: { q: Question; draft: Draft; onChange: (d: Draft) => void }) {
  const [showDetails, setShowDetails] = useState(false);
  const multiple = q.kind === "choice" && q.multiple !== false;
  const chips = q.kind === "choice" ? q.options ?? [] : q.kind === "yes-no" ? ["Yes", "No"] : null;
  const detailsOpen = showDetails || draft.picks.some((o) => /other/i.test(o)) || draft.details !== "";
  function toggle(o: string) {
    const on = draft.picks.includes(o);
    const picks = on ? draft.picks.filter((x) => x !== o) : multiple ? [...draft.picks, o] : [o];
    onChange({ ...draft, picks });
  }
  return (
    <div className="space-y-2">
      {chips && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={q.question}>
          {chips.map((o) => {
            const on = draft.picks.includes(o);
            return (
              <button key={o} type="button" aria-pressed={on} onClick={() => toggle(o)}
                className={["min-h-11 min-w-11 rounded-full px-4 text-sm font-semibold transition-colors", on ? "bg-domain text-domain-foreground shadow-card" : "border border-border bg-surface text-foreground/80 hover:bg-subtle"].join(" ")}>{o}</button>
            );
          })}
        </div>
      )}
      {q.kind === "number" && <input type="number" inputMode="decimal" value={draft.value} onChange={(e) => onChange({ ...draft, value: e.target.value })} aria-label={q.question} className={field} />}
      {q.kind === "text" && <textarea value={draft.value} onChange={(e) => onChange({ ...draft, value: e.target.value })} maxLength={MAX_ANSWER} rows={3} aria-label={q.question} className="field" />}
      {q.kind !== "text" && (detailsOpen ? (
        <textarea value={draft.details} onChange={(e) => onChange({ ...draft, details: e.target.value })} maxLength={1000} rows={2} aria-label={`Details for ${q.question}`} placeholder="Add details" className="field" />
      ) : (
        <button type="button" onClick={() => setShowDetails(true)} className="min-h-11 text-sm font-semibold text-domain underline">Add details</button>
      ))}
    </div>
  );
}

function AskCard({ a }: { a: Ask }) {
  const tone = a.status === "answered" ? "success" : a.status === "failed" ? "destructive" : "muted";
  const label = a.status === "answered" ? "Answered" : a.status === "failed" ? "Failed" : "Researching";
  return (
    <li className="card space-y-2 !p-4" data-testid="ask">
      <p className="text-[1.05rem] font-extrabold leading-snug">{a.question}</p>
      <div><Badge tone={tone} pulse={a.status === "pending"}>{label}</Badge></div>
      <Points text={a.body} max={3} />
      <SourceList sources={a.sources} />
    </li>
  );
}

export default function Questions({ person, h, data }: { person: Person; h: UseHealth; data: HealthData }) {
  const toast = useToast();
  const answered = data.context?.answers ?? {};
  const open = (data.questions?.questions ?? []).filter((q) => !(q.id in answered));
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState("");
  const [asking, setAsking] = useState(false);

  const filled = Object.fromEntries(open.map((q) => [q.id, composeAnswer(q, drafts[q.id] ?? EMPTY)]).filter(([, v]) => v));
  async function save() {
    setSaving(true);
    try {
      await healthApi.answers(h.ctx, person, filled);
      setDrafts({});
      toast.show({ message: "Answers saved, the Mac will update your overview" });
      await h.refresh();
    } catch {
      toast.show({ message: "Could not save your answers, try again", error: true });
    } finally {
      setSaving(false);
    }
  }
  async function ask() {
    setAsking(true);
    try {
      await healthApi.ask(h.ctx, person, text.trim());
      setText("");
      toast.show({ message: "Question sent, the answer will appear below" });
      await h.refresh();
    } catch {
      toast.show({ message: "Could not send your question, try again", error: true });
    } finally {
      setAsking(false);
    }
  }

  const asks = [...(data.asks ?? [])].sort((a, b) => (toMillis(b.asked_at) ?? 0) - (toMillis(a.asked_at) ?? 0));
  const answeredList = Object.entries(answered).sort(([, a], [, b]) => (toMillis(b.answered_at) ?? 0) - (toMillis(a.answered_at) ?? 0));

  return (
    <div className="space-y-8">
      <section className="space-y-3" aria-label="Open questions">
        <SectionTitle title="Questions for you" />
        {open.length === 0 ? (
          <p className="card !px-4 !py-3.5 text-muted">Nothing to answer right now.</p>
        ) : (
          <>
            {open.map((q) => (
              <div key={q.id} className="card space-y-2.5 !p-4" data-testid="question">
                <p className="text-[1.05rem] font-extrabold leading-snug">{q.question}</p>
                {q.why && <p className="text-[0.94rem] text-muted">{q.why}</p>}
                <QuestionInput q={q} draft={drafts[q.id] ?? EMPTY} onChange={(v) => setDrafts((d) => ({ ...d, [q.id]: v }))} />
              </div>
            ))}
            <button type="button" disabled={saving || Object.keys(filled).length === 0} aria-busy={saving} onClick={() => void save()} className={`${primaryBtn} w-full`}>
              {saving ? <><Spinner />Saving...</> : "Save answers"}
            </button>
          </>
        )}
      </section>

      {answeredList.length > 0 && (
        <section className="space-y-2.5" aria-label="Your answers">
          <SectionTitle title="Your answers" />
          <ul className="card card--flush divide-y divide-border">
            {answeredList.map(([id, a]) => (
              <li key={id} className="p-3.5">
                <p className="text-sm text-muted">{a.question ?? id}</p>
                <p className="font-bold">{a.answer}</p>
                {a.answered_at && <p className="text-sm text-muted">{fmtDate(a.answered_at)}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3" aria-label="Ask a question">
        <SectionTitle title="Ask a question" />
        <label className="block">
          <span className="sr-only">Your question</span>
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={3} placeholder="For example: does caffeine affect sleep?" className="field" />
        </label>
        <button type="button" disabled={asking || !text.trim()} aria-busy={asking} onClick={() => void ask()} className={`${outlineBtn} min-h-12 w-full text-base`}>
          {asking ? <><Spinner />Sending...</> : "Ask"}
        </button>
        {asks.length > 0 && <ul className="space-y-3 pt-2">{asks.map((a) => <AskCard key={a.id} a={a} />)}</ul>}
      </section>
    </div>
  );
}
