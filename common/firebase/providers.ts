import { FirebaseError } from 'firebase/app';

export type SocialProviderId = 'google.com' | 'apple.com';

export const SOCIAL_PROVIDER_NAMES: Record<SocialProviderId, string> = {
  'google.com': 'Google',
  'apple.com': 'Apple',
};

/** The providers the sign-in screen and Settings offer. Apple is off until it is wanted and enabled
 * in the Firebase console; add 'apple.com' here to turn it on. */
export const OFFERED_PROVIDERS: SocialProviderId[] = ['google.com'];

/** A message for the user when a Google or Apple sign-in or link fails. */
export function providerErrorMessage(err: unknown, id: SocialProviderId, action: 'signin' | 'link'): string {
  const name = SOCIAL_PROVIDER_NAMES[id];
  switch (err instanceof FirebaseError ? err.code : null) {
    case 'auth/credential-already-in-use':
      return `That ${name} account is already linked to another account here. Sign in with it instead, or unlink it there first.`;
    case 'auth/provider-already-linked':
      return `${name} is already linked to this account.`;
    case 'auth/operation-not-allowed':
      return `${name} sign-in is not switched on for this site yet. It has to be enabled in the Firebase console.`;
    case 'auth/popup-blocked':
      return 'The browser blocked the sign-in popup. Allow popups for this site and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'The sign-in window was closed before it finished.';
    case 'auth/account-exists-with-different-credential':
      return `An account with this email already exists with another sign-in method. Sign in with that one, then link ${name} in Settings.`;
    default:
      return action === 'link' ? `Could not link ${name}. Please try again.` : 'Sign-in failed. Please try again.';
  }
}
