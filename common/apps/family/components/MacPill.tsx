'use client';

import { useState } from "react";
import MacSheet from "@/common/apps/family/components/MacSheet";
import { useData } from "@/common/apps/family/hooks/useData";
import { timeAgo } from "@/common/apps/family/lib/format";

export default function MacPill() {
  const { mac } = useData();
  const [open, setOpen] = useState(false);
  let label: string;
  let detail = "";
  let dot: string;
  if (mac.live === null && !mac.lastSeen) {
    label = "Checking Mac";
    dot = "bg-muted";
  } else if (mac.live) {
    label = "Mac live";
    dot = "bg-success";
  } else {
    const ago = timeAgo(mac.lastSeen);
    label = "Mac offline";
    detail = ago ? `, last seen ${ago}` : "";
    dot = "bg-destructive";
  }
  return (
    <>
      <button
        type="button"
        data-testid="mac-pill"
        title={label + detail}
        aria-label={`${label}${detail}. Open Mac status`}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 min-w-0 items-center"
      >
        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[0.8rem] font-semibold shadow-card hover:bg-subtle">
          <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
          <span className="truncate">{label}<span className="hidden md:inline">{detail}</span></span>
        </span>
      </button>
      <MacSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
