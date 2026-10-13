'use client'

import type { Comment } from '../hooks/useComments'

function IconComment() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

export interface CommentTriggerProps {
  bulletId: string
  comments: Comment[]
  onOpen: (bulletId: string) => void
}

export function CommentTrigger({ bulletId, comments, onOpen }: CommentTriggerProps) {
  const hasComments = comments.length > 0

  return (
    <button
      type="button"
      onClick={() => onOpen(bulletId)}
      aria-label={hasComments ? `${comments.length} comment${comments.length === 1 ? '' : 's'}` : 'Add comment'}
      className="relative flex h-6 w-6 items-center justify-center"
    >
      {hasComments && (
        <span
          className="absolute h-2 w-2 rounded-full opacity-40 transition-opacity duration-150 group-hover:opacity-0"
          style={{ background: 'var(--sd-amber)' }}
        />
      )}
      <span
        className="absolute left-0 top-1/2 flex -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium leading-none opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100"
        style={{ color: 'var(--sd-ink-muted)', background: 'var(--sd-bg)', border: '1px solid var(--sd-line)' }}
      >
        <IconComment />
        {hasComments ? comments.length : 'Comment'}
      </span>
    </button>
  )
}
