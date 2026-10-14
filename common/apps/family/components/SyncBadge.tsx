'use client';

import { useData } from "@/common/apps/family/hooks/useData";

type SyncDoc = { pending_sync?: boolean; client_updated_at?: unknown };

/** Small note for family changes the Mac has not applied yet (hidden once synced_through catches up). */
export default function SyncBadge({ doc, docs }: { doc?: SyncDoc; docs?: SyncDoc[] }) {
  const { isUnsynced, mac } = useData();
  const list = docs ?? (doc ? [doc] : []);
  if (!list.some((d) => isUnsynced(d))) return null;
  return (
    <p role="status" data-testid="sync-badge" className="text-sm text-muted">
      {mac.live ? "Syncing to Mac" : "Saved. Syncs when the Mac is back online"}
    </p>
  );
}
