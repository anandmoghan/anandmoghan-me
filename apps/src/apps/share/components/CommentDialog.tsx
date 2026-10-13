import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import type { Comment } from '../hooks/useComments'

export interface CommentDialogProps {
  bulletId: string
  bulletLabel?: string
  bulletText?: string
  comments: Comment[]
  currentUid: string | null
  onAdd: (bulletId: string, text: string) => Promise<void>
  onDelete: (commentId: string) => Promise<void>
  onClose: () => void
}

export function CommentDialog({
  bulletId,
  bulletLabel,
  bulletText,
  comments,
  currentUid,
  onAdd,
  onDelete,
  onClose,
}: CommentDialogProps) {
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim() || submitting) return
    setSubmitting(true)
    try {
      await onAdd(bulletId, draft)
      setDraft('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--sd-scrim)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-lg border shadow-xl"
        style={{ background: 'var(--sd-bg)', borderColor: 'var(--sd-line)' }}
      >
        <div className="border-b px-4 py-3" style={{ borderColor: 'var(--sd-line)' }}>
          <div className="flex items-start justify-between gap-2">
            <div
              className="text-xs uppercase tracking-wide"
              style={{ fontFamily: 'var(--sd-mono)', color: 'var(--sd-amber)' }}
            >
              Comments
            </div>
            <button onClick={onClose} className="text-lg leading-none" style={{ color: 'var(--sd-ink-muted)' }} aria-label="Close">
              ×
            </button>
          </div>
          {bulletLabel && (
            <div className="mt-1 text-sm font-bold" style={{ color: 'var(--sd-paper)' }}>
              {bulletLabel}
            </div>
          )}
          {bulletText && (
            <p className="mt-0.5 text-sm" style={{ color: 'var(--sd-ink-muted)' }}>
              {bulletText}
            </p>
          )}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {comments.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--sd-ink-muted)' }}>
              No comments yet, be the first.
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold" style={{ color: 'var(--sd-paper)' }}>
                    {comment.nickname}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--sd-ink-muted)' }}>
                      {formatDistanceToNow(comment.createdAt?.toDate() ?? new Date(), { addSuffix: true })}
                    </span>
                    {comment.authorUid === currentUid && (
                      <button
                        onClick={() => onDelete(comment.id)}
                        className="text-xs transition-opacity hover:opacity-70"
                        style={{ color: 'var(--sd-ink-muted)' }}
                        aria-label="Delete comment"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-0.5 text-sm" style={{ color: 'var(--sd-paper)' }}>
                  {comment.text}
                </p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t px-4 py-3" style={{ borderColor: 'var(--sd-line)' }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            autoFocus
            className="w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--sd-line)', background: 'var(--sd-bg)', color: 'var(--sd-paper)' }}
          />
          <button
            type="submit"
            disabled={!draft.trim() || submitting}
            className="mt-2 w-full rounded-lg py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: 'var(--sd-amber)' }}
          >
            {submitting ? 'Posting...' : 'Comment'}
          </button>
        </form>
      </div>
    </div>
  )
}
