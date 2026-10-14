// Profile names on users/{uid}.displayName, shown on blog and share deck comments.
// The pattern matches the users rule in firebase/rules/core.rules: 2 to 30 characters of
// letters, numbers, spaces, - and _, with no space at either end.

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 30;
export const NICKNAME_PATTERN = /^[A-Za-z0-9_-][A-Za-z0-9 _-]{0,28}[A-Za-z0-9_-]$/;
export const NICKNAME_RULE = 'Use 2 to 30 letters, numbers, spaces, - or _.';

// Names the site generated itself; an account's own name replaces these.
const GUEST_PATTERN = /^guest-[0-9a-f]{4,6}$/;

export function isValidNickname(name: string): boolean {
  return NICKNAME_PATTERN.test(name);
}

export function isGuestNickname(name: string): boolean {
  return GUEST_PATTERN.test(name);
}

/** `guest-7f3a`: four hex characters from an FNV-1a hash of the uid, stable per session. */
export function guestNickname(uid: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < uid.length; i++) {
    hash ^= uid.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `guest-${(hash >>> 0).toString(16).padStart(8, '0').slice(0, 4)}`;
}

/** An account or legacy name made valid: accents dropped, other characters removed, trimmed. */
export function toNickname(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 _-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NICKNAME_MAX)
    .trim();
  return isValidNickname(cleaned) ? cleaned : null;
}
