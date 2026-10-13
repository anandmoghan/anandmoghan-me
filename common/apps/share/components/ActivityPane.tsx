'use client'

import { formatDistanceToNow } from 'date-fns'
import type { Comment } from '../hooks/useComments'

interface BulletMeta {
  slideIndex: number
  label?: string
}

interface ActivityPaneProps {
  commentsByBullet: Record<string, Comment[]>
  bulletMeta: Record<string, BulletMeta>
  onSelect: (slideIndex: number, bulletId?: string) => void
  onClose: () => void
  showClose?: boolean
}

export function ActivityPane({ commentsByBullet, bulletMeta, onSelect, onClose, showClose = true }: ActivityPaneProps) {
  const allComments = Object.values(commentsByBullet)
    .flat()
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))

  return (
    <div className="sd-activity-pane">
      <div className="sd-activity-header">
        <span className="sd-activity-title">Activity</span>
        {showClose && (
          <button onClick={onClose} className="sd-activity-close" aria-label="Close activity">
            ×
          </button>
        )}
      </div>
      <div className="sd-activity-list">
        {allComments.length === 0 ? (
          <div className="sd-activity-empty-state">
            <p className="sd-activity-empty">No comments yet.</p>
            <p className="sd-activity-hint">
              Hover over a bullet point, click the comment icon, and add your note. Anand will address it live in the
              session or follow up afterward.
            </p>
          </div>
        ) : (
          allComments.map((c) => {
            const meta = bulletMeta[c.bulletId]
            return (
              <button
                key={c.id}
                onClick={() => onSelect(meta?.slideIndex ?? 0, c.bulletId)}
                className="sd-activity-item"
              >
                <div className="sd-activity-item-top">
                  <span className="sd-activity-nickname">{c.nickname}</span>
                  <span className="sd-activity-time">
                    {formatDistanceToNow(c.createdAt?.toDate() ?? new Date(), { addSuffix: true })}
                  </span>
                </div>
                {meta?.label && <div className="sd-activity-label">{meta.label}</div>}
                <p className="sd-activity-text">{c.text}</p>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
