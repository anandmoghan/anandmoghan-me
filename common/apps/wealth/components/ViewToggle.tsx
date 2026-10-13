'use client'

import type { MemberData } from '../types'

interface Props {
  members: MemberData[]
  activeUid: string | 'combined'
  onSelect: (uid: string | 'combined') => void
}

export function ViewToggle({ members, activeUid, onSelect }: Props) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {members.map((m) => (
        <button
          key={m.uid}
          onClick={() => onSelect(m.uid)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeUid === m.uid
              ? 'bg-foreground text-background'
              : 'border border-border hover:bg-muted/20'
          }`}
        >
          {m.photoURL ? (
            <img src={m.photoURL} alt={m.displayName} className="w-4 h-4 rounded-full" />
          ) : (
            <span className="w-4 h-4 rounded-full bg-accent flex items-center justify-center text-xs text-background">
              {m.displayName[0]}
            </span>
          )}
          {m.displayName.split(' ')[0]}
        </button>
      ))}
      {members.length > 1 && (
        <button
          onClick={() => onSelect('combined')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeUid === 'combined'
              ? 'bg-foreground text-background'
              : 'border border-border hover:bg-muted/20'
          }`}
        >
          Combined
        </button>
      )}
    </div>
  )
}
