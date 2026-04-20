import type { Group } from '../../../types'

interface Props {
  groups: Group[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreateGroup: () => void
}

export function GroupSelector({ groups, selectedId, onSelect, onCreateGroup }: Props) {
  return (
    <div className="flex items-center gap-3">
      <select
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent"
      >
        {groups.length === 0 && (
          <option value="" disabled>No groups yet</option>
        )}
        {groups.map((g) => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </select>
      <button
        onClick={onCreateGroup}
        className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-muted/20 transition-colors flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New Group
      </button>
    </div>
  )
}
