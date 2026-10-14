'use client';

import { useEffect, useRef, useState } from "react";
import { DISMISS_REASONS } from "@/common/apps/family/lib/shop";

function SheetBody({ title, onReason }: { title: string; onReason: (reason: string | null) => void }) {
  const [other, setOther] = useState("");
  return (
    <div className="p-4 pb-6">
      <h2 className="text-xl font-extrabold">Why not this one?</h2>
      <p className="mt-0.5 line-clamp-1 text-muted">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {DISMISS_REASONS.map((r) => (
          <button key={r} type="button" onClick={() => onReason(r)} className="rounded-full border border-border bg-surface px-4 text-sm font-semibold hover:bg-subtle">
            {r}
          </button>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (other.trim()) onReason(other.trim());
        }}
      >
        <input
          type="text"
          value={other}
          onChange={(e) => setOther(e.target.value)}
          maxLength={120}
          placeholder="Other"
          aria-label="Other reason"
          className="field min-w-0 flex-1"
        />
        <button type="submit" disabled={!other.trim()} className="rounded-full bg-domain px-5 text-sm font-bold text-domain-foreground disabled:opacity-40">
          Save
        </button>
      </form>
      <button type="button" onClick={() => onReason(null)} className="mt-2 w-full font-semibold text-muted underline">
        Skip
      </button>
    </div>
  );
}

/** Bottom sheet asking why. The dismissal is written when it is answered; null means skipped
 * (button, Escape or backdrop tap). */
export default function DismissSheet({ id, title, onReason }: { id: string | null; title: string; onReason: (reason: string | null) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    activeRef.current = id !== null;
    const d = ref.current;
    if (!d) return;
    if (id !== null && !d.open) d.showModal();
    if (id === null && d.open) d.close();
  }, [id]);

  return (
    <dialog
      ref={ref}
      aria-label="Why not this one?"
      onClose={() => {
        if (activeRef.current) onReason(null);
      }}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-surface p-0 text-foreground shadow-float backdrop:bg-black/40 sm:left-1/2 sm:right-auto sm:mb-6 sm:max-w-md sm:-translate-x-1/2 sm:rounded-3xl"
    >
      {id !== null && <SheetBody key={id} title={title} onReason={onReason} />}
    </dialog>
  );
}
