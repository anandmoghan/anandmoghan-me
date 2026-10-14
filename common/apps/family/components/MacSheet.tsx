'use client';

import { useEffect, useRef } from "react";
import { useData } from "@/common/apps/family/hooks/useData";
import MacStatusCard from "@/common/apps/family/components/MacStatusCard";
import RequestBadge from "@/common/apps/family/components/RequestBadge";
import { Meta, SectionTitle, outlineBtn } from "@/common/apps/family/components/ui";
import { buildActivity, isActive } from "@/common/apps/family/lib/activity";
import { personLabel } from "@/common/apps/family/lib/format";

/** Bottom sheet opened from the header Mac pill: Mac status, active agent runs, last few finished. */
export default function MacSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { requests, jobs, liveJobs, mac } = useData();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const rows = buildActivity(requests, jobs, liveJobs, mac.live);
  const active = rows.filter((r) => isActive(r.progress));
  const finished = rows.filter((r) => !isActive(r.progress)).slice(0, 5);
  const list = (title: string, items: typeof rows, empty: string) => (
    <section className="mt-5">
      <SectionTitle title={title} />
      {items.length === 0 ? (
        <p className="mt-1 text-muted">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((r) => (
            <li key={r.key} className="flex items-center gap-3 rounded-2xl bg-subtle p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r.title}</p>
                <Meta parts={[r.person && personLabel(r.person), r.whenLabel]} />
              </div>
              <RequestBadge progress={r.progress} testId="request-progress" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <dialog
      ref={ref}
      aria-label="Mac status"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-surface p-0 text-foreground shadow-float backdrop:bg-black/40 sm:left-1/2 sm:right-auto sm:mb-6 sm:max-w-md sm:-translate-x-1/2 sm:rounded-3xl"
    >
      {open && (
        <div className="p-4 pb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold">Mac status</h2>
            <button type="button" onClick={() => ref.current?.close()} className={outlineBtn}>Close</button>
          </div>
          <div className="mt-3"><MacStatusCard /></div>
          {list("Active", active, "Nothing running or waiting.")}
          {list("Recently finished", finished, "No finished runs yet. Results post to the feed.")}
        </div>
      )}
    </dialog>
  );
}
