'use client';

import { useState, type ReactNode } from 'react';
import { useAuth } from '@/common/firebase/AuthProvider';
import { NICKNAME_MAX, NICKNAME_RULE, isValidNickname } from '@/common/firebase/nickname';
import { Field } from '@/common/apps/shell/Field';

interface NicknameEditorProps {
  /** Text before the name, e.g. "Commenting as". */
  label: string;
  /** Extra links after Edit, e.g. " · Sign in". */
  children?: ReactNode;
}

// The profile nickname (users/{uid}.displayName) with an inline Edit. Not a form, so it can sit
// inside the comment form.
export function NicknameEditor({ label, children }: NicknameEditorProps) {
  const { displayName, setDisplayName } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!displayName) return null;

  const start = () => {
    setDraft(displayName);
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    const name = draft.trim();
    if (!isValidNickname(name)) {
      setError(NICKNAME_RULE);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (name !== displayName) await setDisplayName(name);
      setEditing(false);
    } catch (err) {
      console.error('Saving the nickname failed', err);
      setError('The nickname could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <p className="text-sm text-muted">
        {label} <span className="font-bold text-foreground">{displayName}</span>
        {' · '}
        <button type="button" className="underline underline-offset-2" onClick={start}>
          Edit
        </button>
        {children}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Field
        label="Nickname"
        value={draft}
        maxLength={NICKNAME_MAX}
        autoComplete="nickname"
        autoFocus
        hint={NICKNAME_RULE}
        error={error}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            save();
          } else if (e.key === 'Escape') {
            setEditing(false);
          }
        }}
      />
      <div className="flex gap-2">
        <button type="button" className="btn btn--sm btn--primary" disabled={busy} onClick={save}>
          {busy ? 'Saving...' : 'Save'}
        </button>
        <button type="button" className="btn btn--sm" disabled={busy} onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
