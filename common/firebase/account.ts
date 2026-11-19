import type { User } from 'firebase/auth';

import { FUNCTIONS_BASE } from './client';

async function post(user: User, path: string, body: unknown): Promise<Response> {
  const res = await fetch(`${FUNCTIONS_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${await res.text()}`);
  return res;
}

/** Asks the api function to mirror roles/{email} into claims. True when the claims changed. */
export async function refreshClaims(user: User): Promise<boolean> {
  const res = await post(user, '/account/refresh-claims', {});
  return ((await res.json()) as { changed: boolean }).changed;
}

/** Moves an anonymous session's prefs and comments to `user` and deletes the anonymous user. */
export async function mergeAnonymous(user: User, anonIdToken: string): Promise<void> {
  await post(user, '/account/merge', { anonIdToken });
}
