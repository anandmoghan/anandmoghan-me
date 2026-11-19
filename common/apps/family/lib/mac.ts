// Mac reachability and live requests. The Mac exposes the family API; the app polls GET /family/status
// while visible. A request goes to POST /family/request when the Mac is live, otherwise (or on any
// failure or timeout) it becomes a requests doc that the bridge applies later. Both carry the
// same client-generated request_id so a timed-out call that did succeed is not run twice.
import { FAMILY_API } from "@/common/api/config";

export const STATUS_TIMEOUT_MS = 4000;

export function newRequestId(): string {
  return crypto.randomUUID();
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Live means HTTP 200 with { ok: true } within the timeout. */
export async function pingMac(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${FAMILY_API}/status`, { method: "GET", cache: "no-store" }, STATUS_TIMEOUT_MS);
    if (res.status !== 200) return false;
    const body = (await res.json()) as { ok?: boolean };
    return body.ok === true;
  } catch {
    return false;
  }
}

export interface LiveJob {
  id: string;
  type: string;
  state: "running" | "queued";
  title?: string;
}

/** POST /family/request with the Firebase ID token. Returns the job, or null on any failure. */
export async function postRequest(
  idToken: string,
  body: { request_id: string; type: string; person?: string; brief_id?: string; input?: Record<string, unknown>; suggestion_ids?: string[] },
): Promise<LiveJob | null> {
  try {
    const res = await fetchWithTimeout(
      `${FAMILY_API}/request`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(body),
      },
      STATUS_TIMEOUT_MS,
    );
    if (!res.ok) return null;
    // The bridge answers {ok, job_id, status}; older builds sent {job: {id}}.
    const json = (await res.json()) as { job_id?: string; status?: string; job?: { id?: string } };
    const id = json.job_id ?? json.job?.id;
    if (!id) return null;
    return { id, type: body.type, state: "running" };
  } catch {
    return null;
  }
}
