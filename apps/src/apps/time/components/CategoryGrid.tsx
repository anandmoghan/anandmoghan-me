import { CategoryButton } from './CategoryButton'
import type { Category, Session, RollupMap } from '../types'
import { duration } from '../schema'

const RING_R = 34

interface CategoryGridProps {
  categories: Category[]
  activeCategoryId: string | null
  activeStartedAt: Date | null
  todaySessions: Session[]
  weekRollup: RollupMap
  monthRollup: RollupMap
  onSelect: (categoryId: string) => void
  onStop: () => void
  disabled?: boolean
}

export function CategoryGrid({
  categories,
  activeCategoryId,
  activeStartedAt,
  todaySessions,
  weekRollup,
  monthRollup,
  onSelect,
  onStop,
  disabled,
}: CategoryGridProps) {
  // Compute per-category sealed totals from today's sessions
  const byCategory: Record<string, { seconds: number; count: number; lastEndedAt: Date | null }> = {}
  for (const s of todaySessions) {
    if (s.endedAt === null) continue
    if (!byCategory[s.categoryId]) byCategory[s.categoryId] = { seconds: 0, count: 0, lastEndedAt: null }
    byCategory[s.categoryId].seconds += duration(s)
    byCategory[s.categoryId].count += 1
    if (!byCategory[s.categoryId].lastEndedAt || s.endedAt > byCategory[s.categoryId].lastEndedAt!) {
      byCategory[s.categoryId].lastEndedAt = s.endedAt
    }
  }

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {categories.map(cat => (
        <CategoryButton
          key={cat.id}
          category={cat}
          isActive={cat.id === activeCategoryId}
          activeStartedAt={cat.id === activeCategoryId ? activeStartedAt : null}
          todaySealedSeconds={byCategory[cat.id]?.seconds ?? 0}
          todaySealedCount={byCategory[cat.id]?.count ?? 0}
          weekEntry={weekRollup[cat.id]}
          monthEntry={monthRollup[cat.id]}
          onClick={() => onSelect(cat.id)}
          disabled={disabled}
        />
      ))}

      {activeCategoryId && (
        <button
          onClick={onStop}
          disabled={disabled}
          className={`
            flex flex-row items-center gap-4 px-4 py-4 text-left
            border border-dashed border-border bg-background
            hover:border-destructive/40 hover:bg-destructive/5
            transition-all duration-200 select-none w-full active:scale-[0.98]
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="relative w-14 h-14 flex-shrink-0 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 76 76">
              <circle cx="38" cy="38" r={RING_R} fill="none" stroke="currentColor"
                strokeWidth="2" strokeDasharray="5 5" className="text-border" />
            </svg>
            <svg className="w-6 h-6 text-muted z-10 relative" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1.5" />
              <rect x="14" y="4" width="4" height="16" rx="1.5" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-muted">Take a break</span>
        </button>
      )}
    </div>
  )
}
