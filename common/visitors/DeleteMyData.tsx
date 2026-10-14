'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/common/firebase/AuthProvider';
import { deleteMyData } from './api';
import { useConsent } from './ConsentProvider';

// Account page: deletes the visitor's visits, blog comments, profile and account, then starts a
// fresh anonymous session (the sign-out listener signs in anonymously again).
export function DeleteMyData() {
  const { user, isAnonymous, signOut } = useAuth();
  const { reset } = useConsent();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!user) return;
    const what = isAnonymous ? 'this guest session' : 'your account';
    if (!window.confirm(`Delete your page visits, blog comments, reading history and ${what}? This cannot be undone.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const { visits, comments, reads } = await deleteMyData(user);
      reset();
      await signOut();
      setMessage(`Deleted ${visits} visits, ${comments} comments and ${reads} reading history entries.`);
    } catch (err) {
      console.error('Deleting data failed', err);
      setMessage('Your data could not be deleted. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">Your data</h2>
      <div className="card space-y-3">
        <p className="text-sm text-muted">
          Deletes the pages you visited, your blog comments, your reading history, your profile and this account.
          {' '}
          <Link href="/privacy" className="underline">
            What is stored
          </Link>
        </p>
        <button type="button" className="btn btn--sm btn--danger" disabled={busy || !user} onClick={handleDelete}>
          {busy ? 'Deleting...' : 'Delete my data'}
        </button>
        {message && <p className="text-sm">{message}</p>}
      </div>
    </section>
  );
}
