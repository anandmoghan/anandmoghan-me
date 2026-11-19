import type { User } from 'firebase/auth';

import { FUNCTIONS_BASE } from '../firebase/client';

// Visitor routes of the `api` Cloud Function (functions/src/visits.ts).

async function post(user: User, path: string, body: unknown): Promise<Response> {
  const res = await fetch(`${FUNCTIONS_BASE}${path}`, {
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

/** Deletes the caller's visits, blog comments, reading history, users doc and auth account. */
export async function deleteMyData(user: User): Promise<{ visits: number; comments: number; reads: number }> {
  const res = await post(user, '/account/delete', {});
  return (await res.json()) as { visits: number; comments: number; reads: number };
}
