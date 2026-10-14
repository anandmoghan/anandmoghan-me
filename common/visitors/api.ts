import type { User } from 'firebase/auth';

// Visitor routes of the same-origin `api` Cloud Function (functions/src/visits.ts).
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

async function post(user: User, path: string, body: unknown): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    keepalive: true,
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${await res.text()}`);
  return res;
}

export interface VisitBody {
  path: string;
  referrer: string | null;
  sessionId: string;
}

/** Logs one page view. The function ignores it unless users/{uid}.consent is 'granted'. */
export async function logVisit(user: User, visit: VisitBody): Promise<void> {
  await post(user, '/visit', visit);
}

/** Deletes the caller's visits, blog comments, users doc and auth account. */
export async function deleteMyData(user: User): Promise<{ visits: number; comments: number }> {
  const res = await post(user, '/account/delete', {});
  return (await res.json()) as { visits: number; comments: number };
}
