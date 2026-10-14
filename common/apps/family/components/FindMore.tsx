'use client';

import { useState } from "react";
import { useData } from "@/common/apps/family/hooks/useData";
import { useToast } from "@/common/apps/family/hooks/useToast";
import Spinner from "@/common/apps/family/components/Spinner";
import RequestBadge from "@/common/apps/family/components/RequestBadge";
import { requestProgress } from "@/common/apps/family/lib/requestStatus";
import { toMillis } from "@/common/apps/family/lib/format";
import { softBtn } from "@/common/apps/family/components/ui";
import type { Brief } from "@/common/apps/family/types";

export default function FindMore({ brief }: { brief: Brief }) {
  const { submitRequest, requests, jobs, liveJobs, mac } = useData();
  const when = (r: (typeof requests)[number]) => toMillis(r.created_at ?? r.client_updated_at) ?? Date.now();
  const last = requests.filter((r) => r.type === "find-more" && r.brief_id === brief.id).sort((a, b) => when(b) - when(a))[0];
  const live = liveJobs.find((l) => l.type === "find-more");
  const progress = last ? requestProgress(last, mac.live, jobs) : live ? live.state : null;
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const r = await submitRequest({ type: "find-more", brief_id: brief.id, person: brief.person });
      toast.show({ message: r.mode === "live" ? "Looking for more picks now" : "Waiting for Mac, request saved" });
    } catch {
      toast.show({ message: "Could not send the request", error: true });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        aria-busy={busy}
        onClick={() => void go()}
        className={`${softBtn} tap`}
      >
        {busy ? <><Spinner />Sending...</> : "Find more"}
      </button>
      {progress && <RequestBadge progress={progress} testId="find-more-status" />}
    </div>
  );
}
