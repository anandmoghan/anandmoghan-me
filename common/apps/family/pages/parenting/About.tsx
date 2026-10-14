'use client';

import { useCallback, useEffect, useState } from "react";
import { SectionTitle, Segmented, outlineBtn, primaryBtn, softBtn } from "@/common/apps/family/components/ui";
import { Points } from "@/common/apps/family/components/Points";
import { ListSkeleton } from "@/common/apps/family/components/Skeleton";
import Spinner from "@/common/apps/family/components/Spinner";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { HealthOfflineError } from "@/common/apps/family/lib/health";
import { CONTEXT_SECTIONS, ParentingHttpError, fmtYmd, parentingApi, parseContext, type UseParenting } from "@/common/apps/family/lib/parenting";

const MAX_NOTE = 1000;

function errorText(e: unknown): string {
  if (e instanceof HealthOfflineError) return "Could not reach the Mac, try again";
  if (e instanceof ParentingHttpError && e.status === 400 && e.detail) return `Not saved: ${e.detail}`;
  return "Could not save that, try again";
}

/** context.md by section, "Add a note" (section plus text) and an edit view for the raw text. */
export default function About({ p }: { p: UseParenting }) {
  const toast = useToast();
  const [body, setBody] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [section, setSection] = useState(CONTEXT_SECTIONS[0]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await parentingApi.context(p.ctx);
      setBody(r.body ?? "");
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [p.ctx]);
  useEffect(() => { void load(); }, [load]);

  const parsed = parseContext(body ?? "");
  const extra = parsed.sections.map((s) => s.heading).filter((h) => !CONTEXT_SECTIONS.some((c) => c.toLowerCase() === h.toLowerCase()));
  const options = [...CONTEXT_SECTIONS, ...extra];
  const [tab, setTab] = useState("");
  const shownTab = parsed.sections.some((s) => s.heading === tab) ? tab : (parsed.sections[0]?.heading ?? "");

  async function addNote() {
    setSaving(true);
    try {
      await parentingApi.note(p.ctx, section, note.trim());
      setNote("");
      toast.show({ message: "Note added, the Mac will look at it again" });
      await Promise.all([load(), p.refresh()]);
    } catch (e) {
      toast.show({ message: errorText(e), error: true });
    }
    setSaving(false);
  }

  async function saveEdit() {
    setSaving(true);
    setEditError(null);
    try {
      await parentingApi.saveContext(p.ctx, draft);
      setEditing(false);
      toast.show({ message: "Saved" });
      await Promise.all([load(), p.refresh()]);
    } catch (e) {
      setEditError(errorText(e));
    }
    setSaving(false);
  }

  if (failed) {
    return (
      <div className="space-y-4">
        <div className="card space-y-2 !p-4" role="alert">
          <p className="font-bold">Could not load her notes</p>
          <button type="button" onClick={() => { setFailed(false); void load(); }} className={outlineBtn}>Retry</button>
        </div>
      </div>
    );
  }
  if (body === null) return <ListSkeleton rows={3} />;

  if (editing) {
    return (
      <div className="space-y-4">
        <SectionTitle title="Edit text" />
        <ul className="space-y-1 text-sm text-muted">
          <li>Each section starts with a line like <code className="font-semibold">## Sleep</code>.</li>
          <li>Each note is one line: <code className="font-semibold">- 2026-10-01 (Name): what you noticed</code>.</li>
          <li>Add new lines rather than changing old ones, so the history stays.</li>
        </ul>
        <label className="block">
          <span className="sr-only">Notes about Nila</span>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={18} spellCheck className="field font-mono text-[0.9rem] leading-relaxed" />
        </label>
        {editError && <p className="font-semibold text-destructive" role="alert">{editError}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={saving} onClick={() => void saveEdit()} className={primaryBtn}>{saving ? <><Spinner />Saving...</> : "Save"}</button>
          <button type="button" disabled={saving} onClick={() => { setEditing(false); setEditError(null); }} className={outlineBtn}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex justify-end">
        <button type="button" onClick={() => { setDraft(body); setEditing(true); }} className={softBtn}>Edit text</button>
      </div>

      <section className="card space-y-3 !p-4" aria-label="Add a note">
        <SectionTitle title="Add a note" />
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-muted">Section</span>
          <select value={section} onChange={(e) => setSection(e.target.value)} className="field !min-h-11">
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-muted">Note</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={MAX_NOTE} rows={3} placeholder="What you noticed, in a line or two" className="field" />
        </label>
        <button type="button" disabled={saving || !note.trim()} onClick={() => void addNote()} className={`${primaryBtn} w-full`}>{saving ? <><Spinner />Saving...</> : "Add note"}</button>
        <p className="text-sm text-muted">Saved with today's date and your name. The Mac reads it next time it updates her plans.</p>
      </section>

      {parsed.intro && <Points text={parsed.intro} max={2} muted />}
      {parsed.sections.length === 0 ? (
        <p className="card !px-4 !py-3.5 text-muted">No notes yet. Add the first one above.</p>
      ) : (
        <div className="space-y-4">
          <Segmented
            center
            scroll
            label="Notes about Nila"
            value={shownTab}
            onChange={setTab}
            options={parsed.sections.map((s) => [s.heading, s.lines.length ? `${s.heading} · ${s.lines.length}` : s.heading] as const)}
          />
          {parsed.sections.filter((s) => s.heading === shownTab).map((s) => (
            <div key={s.heading} data-testid="context-section">
              {s.lines.length === 0 ? (
                <p className="card !px-4 !py-3.5 text-sm text-muted">Nothing here yet.</p>
              ) : (
                <ul className="card card--flush divide-y divide-border">
                  {s.lines.map((l, i) => (
                    <li key={i} className="p-3.5">
                      <p className="leading-snug">{l.text}</p>
                      {(l.date || l.who) && <p className="mt-0.5 text-sm text-muted">{[fmtYmd(l.date), l.who].filter(Boolean).join(", ")}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
