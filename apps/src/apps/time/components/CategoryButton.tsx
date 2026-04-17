import { useElapsedTicker } from '../hooks/useElapsedTicker'
import { formatDuration, formatDurationHuman } from '../schema'
import type { Budget, Category, RollupEntry } from '../types'

const RING_R = 34
const RING_C = 2 * Math.PI * RING_R

interface CategoryButtonProps {
  category: Category
  isActive: boolean
  activeStartedAt: Date | null
  todaySealedSeconds: number
  todaySealedCount: number
  weekEntry: RollupEntry | undefined
  monthEntry: RollupEntry | undefined
  onClick: () => void
  disabled?: boolean
}

function budgetUsed(
  budget: Budget,
  todaySeconds: number,
  todayCount: number,
  weekEntry: RollupEntry | undefined,
  monthEntry: RollupEntry | undefined,
): number {
  const isTime = budget.kind === 't'
  if (budget.window === 'd') return isTime ? todaySeconds : todayCount
  if (budget.window === 'w') {
    const base = isTime ? (weekEntry?.seconds ?? 0) : (weekEntry?.count ?? 0)
    return base + (isTime ? todaySeconds : todayCount)
  }
  const base = isTime ? (monthEntry?.seconds ?? 0) : (monthEntry?.count ?? 0)
  return base + (isTime ? todaySeconds : todayCount)
}

function formatBudgetLine(budget: Budget, used: number): { text: string; over: boolean } {
  const total = budget.kind === 't' ? budget.value * 3600 : budget.value
  const window = budget.window === 'd' ? 'day' : budget.window === 'w' ? 'week' : 'month'
  const over = used > total
  const text = budget.kind === 't'
    ? `${formatDurationHuman(used)} / ${formatDurationHuman(total)} · ${window}`
    : `${used} / ${total} sessions · ${window}`
  return { text, over }
}

function formatLastRun(date: Date): string {
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString()
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (isToday) return timeStr
  if (isYesterday) return `Yesterday · ${timeStr}`
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${timeStr}`
}

export function CategoryButton({
  category,
  isActive,
  activeStartedAt,
  todaySealedSeconds,
  todaySealedCount,
  weekEntry,
  monthEntry,
  onClick,
  disabled,
}: CategoryButtonProps) {
  const lastRunAt = category.lastRunAt ?? null
  const elapsed = useElapsedTicker(isActive ? activeStartedAt : null)
  const totalTodaySeconds = todaySealedSeconds + elapsed
  const totalTodayCount = todaySealedCount + (isActive ? 1 : 0)

  // Budget lines (one per budget)
  const budgetLines = category.budgets.map(b => {
    const used = budgetUsed(b, totalTodaySeconds, totalTodayCount, weekEntry, monthEntry)
    return formatBudgetLine(b, used)
  })

  // Ring progress — prefer day budget, then week, then month
  const ringBudget =
    category.budgets.find(b => b.window === 'd' && b.kind === 't') ??
    category.budgets.find(b => b.kind === 't') ??
    null
  const ringProgress = ringBudget
    ? Math.min(1, budgetUsed(ringBudget, totalTodaySeconds, totalTodayCount, weekEntry, monthEntry) / (ringBudget.value * 3600))
    : null
  const ringOver = ringBudget
    ? budgetUsed(ringBudget, totalTodaySeconds, totalTodayCount, weekEntry, monthEntry) > ringBudget.value * 3600
    : false

  // Fallback time line for categories without budgets
  const weekSeconds = (weekEntry?.seconds ?? 0) + totalTodaySeconds
  const fallbackLine =
    totalTodaySeconds > 0 ? `${formatDurationHuman(totalTodaySeconds)} today`
    : weekSeconds > 0 ? `${formatDurationHuman(weekSeconds)} this week`
    : null

  const fmtTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex flex-row items-center gap-4 px-4 py-4 text-left
        border transition-all duration-200 select-none w-full
        ${isActive
          ? 'border-accent/60 bg-accent/5 shadow-sm'
          : 'border-border bg-background hover:border-accent/40 hover:bg-accent/5 active:scale-[0.98]'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {isActive && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-accent animate-pulse" />
      )}

      {/* Ring */}
      <div className="relative w-14 h-14 flex-shrink-0 flex items-center justify-center">
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ transform: 'rotate(-90deg)' }}
          viewBox="0 0 76 76"
        >
          <circle cx="38" cy="38" r={RING_R} fill="none" stroke="currentColor"
            strokeWidth="3" className="text-border" />
          {ringProgress !== null ? (
            <circle cx="38" cy="38" r={RING_R} fill="none" stroke="currentColor"
              strokeWidth="3" strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - ringProgress)}
              className={`transition-all duration-1000 ${ringOver ? 'text-destructive' : 'text-accent'}`}
            />
          ) : isActive ? (
            <circle cx="38" cy="38" r={RING_R} fill="none" stroke="currentColor"
              strokeWidth="3" className="text-accent/40" />
          ) : null}
        </svg>
        {isActive ? (
          <span className="text-[10px] font-bold tabular-nums leading-none z-10 relative text-accent">
            {formatDuration(elapsed)}
          </span>
        ) : (
          <span className="text-2xl z-10 relative">{category.icon}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className={`text-base font-semibold leading-tight ${isActive ? 'text-accent' : 'text-foreground'}`}>
          {category.name}
        </span>

        {/* Time context */}
        {isActive ? (
          <span className="text-[11px] text-muted/70 leading-[1.2]">
            since {activeStartedAt ? fmtTime(activeStartedAt) : '—'}
          </span>
        ) : lastRunAt ? (
          <span className="text-[11px] text-muted/60 leading-[1.2]">
            Last run at: {formatLastRun(lastRunAt)}
          </span>
        ) : null}

        {/* Budget lines */}
        {budgetLines.length > 0 ? (
          budgetLines.map((line, i) => (
            <span key={i} className={`text-[11px] leading-[1.2] ${line.over ? 'text-destructive' : 'text-muted'}`}>
              {line.text}
            </span>
          ))
        ) : fallbackLine ? (
          <span className="text-[11px] text-muted leading-[1.2]">{fallbackLine}</span>
        ) : null}
      </div>
    </button>
  )
}
