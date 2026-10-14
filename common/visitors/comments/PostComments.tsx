'use client';

import { useState } from 'react';
import Link from 'next/link';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '@/common/firebase/AuthProvider';
import { COMMENT_MAX, NAME_MAX, type PostComment, usePostComments } from './usePostComments';

function formatDate(comment: PostComment): string {
  if (!comment.createdAt) return 'Just now';
  return comment.createdAt.toDate().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function wasEdited(comment: PostComment): boolean {
  return !!comment.createdAt && !!comment.updatedAt && comment.updatedAt.toMillis() > comment.createdAt.toMillis();
}

interface CommentItemProps {
  comment: PostComment;
  mine: boolean;
  isAdmin: boolean;
  onEdit: (body: string) => Promise<void>;
  onToggleHidden: () => Promise<void>;
  onDelete: () => Promise<void>;
}

function CommentItem({ comment, mine, isAdmin, onEdit, onToggleHidden, onDelete }: CommentItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (err) {
      console.error('Comment action failed', err);
      setError('That did not work. Please try again.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const body = draft.trim();
    if (!body) return;
    if (await run(() => onEdit(body))) setEditing(false);
  };

  const hidden = comment.status === 'hidden';

  return (
    <li className="card card--compact space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-bold">{comment.displayName}</span>
        <span className="text-xs text-muted">
          {formatDate(comment)}
          {wasEdited(comment) ? ', edited' : ''}
        </span>
        {hidden && <span className="badge badge--warn">Hidden</span>}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            className="field"
            value={draft}
            maxLength={COMMENT_MAX}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Edit comment"
          />
          <div className="flex gap-2">
            <button type="button" className="btn btn--sm btn--primary" disabled={busy} onClick={save}>
              {busy ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              className="btn btn--sm"
              disabled={busy}
              onClick={() => {
                setDraft(comment.body);
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap break-words text-[0.95rem]">{comment.body}</p>
      )}

      {(mine || isAdmin) && !editing && (
        <div className="flex flex-wrap gap-2">
          {mine && (
            <button type="button" className="btn btn--sm btn--ghost" disabled={busy} onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
          {isAdmin && (
            <button type="button" className="btn btn--sm btn--ghost" disabled={busy} onClick={() => run(onToggleHidden)}>
              {hidden ? 'Unhide' : 'Hide'}
            </button>
          )}
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            disabled={busy}
            onClick={() => {
              if (window.confirm('Delete this comment?')) run(onDelete);
            }}
          >
            Delete
          </button>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </li>
  );
}

// Comments under a published post. Any session, anonymous included, can comment; guests pick a
// nickname, which is the same one the shared decks use.
export function PostComments({ slug }: { slug: string }) {
  const { user, loading: authLoading, isAnonymous, isAdmin, displayName, signInAsGuest } = useAuth();
  const { comments, loading, error, add, edit, setStatus, remove } = usePostComments(slug);
  const [body, setBody] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Guests use their share nickname; real accounts their profile name. Never the email.
  const knownName = isAnonymous ? displayName : user?.displayName || null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    const name = (knownName ?? nickname).trim();
    if (!text || !name || !user) return;
    setSubmitting(true);
    setFormError(null);
    try {
      if (!knownName) {
        if (isAnonymous) await signInAsGuest(name);
        else await updateProfile(user, { displayName: name });
      }
      await add(name, text);
      setBody('');
    } catch (err) {
      console.error('Posting the comment failed', err);
      setFormError('Your comment could not be posted. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="comments" aria-labelledby="comments-heading" className="mt-12 space-y-4 print:hidden">
      <h2 id="comments-heading" className="text-xl font-extrabold">
        Comments{comments.length > 0 ? ` (${comments.length})` : ''}
      </h2>

      {loading ? (
        <p className="text-sm text-muted">Loading comments...</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              mine={!!user && comment.uid === user.uid}
              isAdmin={isAdmin}
              onEdit={(text) => edit(comment.id, text)}
              onToggleHidden={() => setStatus(comment.id, comment.status === 'hidden' ? 'visible' : 'hidden')}
              onDelete={() => remove(comment.id)}
            />
          ))}
        </ul>
      )}

      {!authLoading && user && (
        <form onSubmit={submit} className="card space-y-3">
          {knownName ? (
            <p className="text-sm text-muted">
              Commenting as <span className="font-bold">{knownName}</span>
            </p>
          ) : (
            <div>
              <label htmlFor="comment-name" className="field-label">
                Nickname
              </label>
              <input
                id="comment-name"
                className="field"
                value={nickname}
                maxLength={NAME_MAX}
                onChange={(e) => setNickname(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <label htmlFor="comment-body" className="field-label">
              Comment
            </label>
            <textarea
              id="comment-body"
              className="field"
              value={body}
              maxLength={COMMENT_MAX}
              onChange={(e) => setBody(e.target.value)}
              required
            />
            <p className="field-hint">
              Plain text, {body.length} of {COMMENT_MAX} characters.
              {isAnonymous && (
                <>
                  {' '}
                  You are a guest; <Link href="/account" className="underline">create an account</Link> to keep
                  your comments on any device.
                </>
              )}
            </p>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <button type="submit" className="btn btn--primary" disabled={submitting || !body.trim()}>
            {submitting ? 'Posting...' : 'Post comment'}
          </button>
        </form>
      )}
    </section>
  );
}
