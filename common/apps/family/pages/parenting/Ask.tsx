'use client';

import { useState } from "react";
import { Badge, SectionTitle, outlineBtn } from "@/common/apps/family/components/ui";
import { Markdown, Points } from "@/common/apps/family/components/Points";
import { SourceList } from "@/common/apps/family/components/health/parts";
import Spinner from "@/common/apps/family/components/Spinner";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { fmtDate, type Ask } from "@/common/apps/family/lib/health";
import { toMillis } from "@/common/apps/family/lib/format";
import { hasTable, splitSections } from "@/common/apps/family/lib/text";
import { parentingApi, type ParentingData, type UseParenting } from "@/common/apps/family/lib/parenting";

/** Tables stay whole; prose is cut to its first points with a Read more. */
const Body = ({ text }: { text: string }) => (hasTable(text) ? <Markdown text={text} /> : <Points text={text} max={4} />);

/** A long answer with its headings and bullets: anything before the first heading and the first `##` section are
 * open, each later section is collapsed behind its heading. */
function AnswerBody({ text }: { text: string }) {
  let shown = 0;
  return (
    <div className="space-y-2" data-testid="answer">
      {splitSections(text).map((s, i) => {
        if (!s.heading) return s.body ? <Body key={i} text={s.body} /> : null;
        shown++;
        if (shown === 1) {
          return (
            <section key={i} className="space-y-1">
              <h3 className="font-extrabold">{s.heading}</h3>
              {s.body && <Body text={s.body} />}
            </section>
          );
        }
        return (
          <details key={i} className="border-t border-border pt-1">
            <summary className="flex min-h-11 cursor-pointer items-center font-extrabold">{s.heading}</summary>
            {s.body && <Body text={s.body} />}
          </details>
        );
      })}
    </div>
  );
}

function AnswerCard({ a, open: initial }: { a: Ask; open: boolean }) {
  const [open, setOpen] = useState(initial);
  const [full, setFull] = useState(false);
  const tone = a.status === "answered" ? "success" : a.status === "failed" ? "destructive" : "muted";
  const label = a.status === "answered" ? "Answered" : a.status === "failed" ? "Failed" : "Researching…";
  return (
    <li className="card space-y-2 !p-4" data-testid="ask">
      <p className={`text-[1.05rem] font-extrabold leading-snug ${full ? "" : "line-clamp-3"}`}>{a.question}</p>
      {a.question.length > 150 && <button type="button" aria-expanded={full} onClick={() => setFull(!full)} className="tap -ml-2 inline-flex min-h-11 items-center px-2 text-sm font-semibold text-domain">{full ? "Show less of the question" : "Read the whole question"}</button>}
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tone} pulse={a.status === "pending"}>{label}</Badge>
        {a.asked_at && <span className="text-sm text-muted">Asked {fmtDate(a.asked_at)}</span>}
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="tap ml-auto inline-flex min-h-11 items-center px-2 text-sm font-semibold text-domain">{open ? "Show less" : "Show answer"}</button>
      </div>
      {open && a.status === "answered" && a.body?.trim() && <AnswerBody text={a.body} />}
      {open && a.status === "failed" && <p className="text-[0.95rem] text-muted">The Mac could not answer this one. Try asking it again in different words.</p>}
      {open && <SourceList sources={a.sources} />}
    </li>
  );
}

/** The ask form: a question goes to the Mac, which answers with sources. */
export function AskBox({ p }: { p: UseParenting }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  async function ask() {
    setBusy(true);
    try {
      await parentingApi.ask(p.ctx, text.trim());
      setText("");
      toast.show({ message: "Question sent, the answer will appear under Questions" });
      await p.refresh();
    } catch {
      toast.show({ message: "Could not send your question, try again", error: true });
    }
    setBusy(false);
  }
  return (
    <section id="ask" className="card space-y-3 !p-4" aria-label="Ask a question">
      <SectionTitle title="Ask a question" />
      <p className="text-muted">The Mac looks up guidelines and studies and answers with sources, checked against her notes and your aims.</p>
      <label className="block">
        <span className="sr-only">Your question</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={2} placeholder="For example: how much daytime sleep is typical at her age?" className="field" />
      </label>
      <button type="button" disabled={busy || !text.trim()} aria-busy={busy} onClick={() => void ask()} className={`${outlineBtn} min-h-12 w-full text-base`}>{busy ? <><Spinner />Sending...</> : "Ask"}</button>
    </section>
  );
}

/** Past questions with their answers, newest first; the newest starts open. */
export function PastAsks({ data }: { data: ParentingData }) {
  const asks = [...data.asks].sort((a, b) => (toMillis(b.asked_at) ?? 0) - (toMillis(a.asked_at) ?? 0));
  if (asks.length === 0) return <p className="card !px-4 !py-3.5 text-muted">No questions yet.</p>;
  return <ul className="space-y-3">{asks.map((a, i) => <AnswerCard key={a.id} a={a} open={i === 0} />)}</ul>;
}
