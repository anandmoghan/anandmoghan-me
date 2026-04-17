import { formatDurationHuman } from '../schema'
import { WINDOW_LABELS, BUDGET_KIND_LABELS } from '../constants'
import type { Budget, Category, RollupMap, Session } from '../types'
import { duration } from '../schema'
import { useElapsedTicker } from '../hooks/useElapsedTicker'

interface BudgetBarProps {
  category: Category
  todaySessions: Session[]
  weekRollup: RollupMap
  monthRollup: RollupMap
}

interface BudgetProgress {
  budget: Budget
  used: number    // seconds if time, count if count
  total: number   // seconds if time, count if count
}

function computeProgress(
  budget: Budget,
  categoryId: string,
  todaySeconds: number,
  todayCount: number,
  weekRollup: RollupMap,
  monthRollup: RollupMap,
): BudgetProgress {
  const total = budget.kind === 't' ? budget.value * 3600 : budget.value

  let rollupSeconds = 0
  let rollupCount = 0

  if (budget.window === 'w') {
    rollupSeconds = weekRollup[categoryId]?.seconds ?? 0
    rollupCount = weekRollup[categoryId]?.count ?? 0
  } else if (budget.window === 'm') {
    rollupSeconds = monthRollup[categoryId]?.seconds ?? 0
    rollupCount = monthRollup[categoryId]?.count ?? 0
  }
  // 'd' window: only today's data (no rollup)

  const used = budget.kind === 't'
    ? todaySeconds + rollupSeconds
    : todayCount + rollupCount

  return { budget, used, total }
}

export function BudgetBar({ category, todaySessions, weekRollup, monthRollup }: BudgetBarProps) {
  // Track active session for live elapsed contribution
  const activeSession = todaySessions.find(s => s.categoryId === category.id && s.endedAt === null) ?? null
  useElapsedTicker(activeSession?.startedAt ?? null) // re-renders every second when active

  if (category.budgets.length === 0) return null

  // Sum today's sessions for this category (including active — duration() handles null endedAt)
  const todaySeconds = todaySessions
    .filter(s => s.categoryId === category.id)
    .reduce((sum, s) => sum + duration(s), 0)
  const todayCount = todaySessions
    .filter(s => s.categoryId === category.id)
    .length

  const progresses = category.budgets.map(b =>
    computeProgress(b, category.id, todaySeconds, todayCount, weekRollup, monthRollup)
  )

  return (
    <div className="px-4 space-y-2">
      {progresses.map(({ budget, used, total }, i) => {
        const pct = Math.min(100, total > 0 ? (used / total) * 100 : 0)
        const over = used > total
        const label = `${BUDGET_KIND_LABELS[budget.kind]} · ${WINDOW_LABELS[budget.window]}`
        const remaining = total - used

        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{label}</span>
              <span className={over ? 'text-destructive font-medium' : ''}>
                {over
                  ? `+${budget.kind === 't' ? formatDurationHuman(Math.abs(remaining)) : Math.abs(remaining)} over`
                  : budget.kind === 't'
                    ? `${formatDurationHuman(remaining)} left`
                    : `${remaining} left`
                }
              </span>
            </div>
            <div className="h-2 rounded-full bg-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${over ? 'bg-destructive' : 'bg-accent'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="text-xs text-muted">
              {budget.kind === 't'
                ? `${formatDurationHuman(used)} / ${formatDurationHuman(total)}`
                : `${used} / ${total}`
              }
            </div>
          </div>
        )
      })}
    </div>
  )
}
