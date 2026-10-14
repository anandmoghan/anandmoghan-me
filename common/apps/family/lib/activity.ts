import type { Job, RequestDoc } from "@/common/apps/family/types";
import type { LiveJob } from "@/common/apps/family/lib/mac";
import { requestProgress, type Progress } from "@/common/apps/family/lib/requestStatus";
import { timeAgo, toMillis } from "@/common/apps/family/lib/format";

export interface ActivityRow { key: string; title: string; person?: string; when: number; progress: Progress; whenLabel: string }

export function requestTitle(r: RequestDoc): string {
  if (r.type === "find-more") return "Find more picks";
  if (r.type === "photo-upload") return `Photo upload${r.input?.kind ? `, ${String(r.input.kind)}` : ""}`;
  return r.type;
}

/** Requests, jobs and live jobs as one newest-first list. */
export function buildActivity(requests: RequestDoc[], jobs: Job[], liveJobs: LiveJob[], macLive: boolean | null): ActivityRow[] {
  const rows: ActivityRow[] = [];
  const seen = new Set<string>();
  for (const r of requests) {
    if (r.job_id) seen.add(r.job_id);
    const created = r.created_at ?? r.client_updated_at;
    rows.push({ key: `r-${r.id}`, title: requestTitle(r), person: r.person, when: toMillis(created) ?? Date.now(), progress: requestProgress(r, macLive, jobs), whenLabel: timeAgo(created) });
  }
  for (const j of jobs) {
    if (seen.has(j.id)) continue;
    rows.push({ key: `j-${j.id}`, title: j.title ?? j.type, person: j.person, when: toMillis(j.created_at) ?? 0, progress: j.state, whenLabel: timeAgo(j.created_at) });
    seen.add(j.id);
  }
  for (const l of liveJobs) {
    if (seen.has(l.id)) continue;
    rows.push({ key: `l-${l.id}`, title: l.type === "find-more" ? "Find more picks" : l.type, when: Date.now(), progress: l.state, whenLabel: "just now" });
  }
  return rows.sort((a, b) => b.when - a.when);
}

export const isActive = (p: Progress) => p === "waiting" || p === "queued" || p === "running";
