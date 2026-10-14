import type { Job, RequestDoc } from "@/common/apps/family/types";

export type Progress = "waiting" | "queued" | "running" | "done" | "failed";
export const PROGRESS_LABEL: Record<Progress, string> = {
  waiting: "Waiting for Mac",
  queued: "Queued",
  running: "Running",
  done: "Done",
  failed: "Failed",
};

/** A request with no Mac-owned status yet has not been picked up by the bridge. */
export function requestProgress(r: RequestDoc, macLive: boolean | null, jobs: Job[]): Progress {
  const job = r.job_id ? jobs.find((j) => j.id === r.job_id) : undefined;
  const st = job?.state ?? r.status;
  if (st === "running" || st === "done" || st === "failed" || st === "queued") return st;
  return macLive ? "queued" : "waiting";
}
