'use client';

import { useData } from "@/common/apps/family/hooks/useData";
import { timeAgo } from "@/common/apps/family/lib/format";
import { Badge } from "@/common/apps/family/components/ui";

/** Mac summary: Live or Offline, last seen, worker counts when the Mac reports them. */
export default function MacStatusCard({ testId = "mac-status" }: { testId?: string }) {
  const { mac, macDoc } = useData();
  const ago = timeAgo(mac.lastSeen);
  const checking = mac.live === null && !mac.lastSeen;
  const w = macDoc?.worker;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-subtle p-3.5" data-testid={testId}>
      <div className="min-w-0 flex-1">
        <p className="font-bold">Home Mac</p>
        <p className="text-sm text-muted">
          {checking ? "Checking" : mac.live ? "Responding now" : ago ? `Last seen ${ago}` : "Not seen yet"}
          {w && (w.running !== undefined || w.queued !== undefined) ? `, ${w.running ?? 0} running, ${w.queued ?? 0} queued` : ""}
        </p>
      </div>
      <Badge tone={checking ? "muted" : mac.live ? "success" : "destructive"} pulse={mac.live === true}>
        {checking ? "Checking" : mac.live ? "Live" : "Offline"}
      </Badge>
    </div>
  );
}
