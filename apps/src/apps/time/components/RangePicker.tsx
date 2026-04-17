import { localDayKey, isoWeekKey, monthKey } from '../services/time'

export type RangeType = 'today' | 'week' | 'month' | 'lifetime' | 'custom'

export interface DateRange {
  type: RangeType
  startDk: number
  endDk: number
}

function dayKeyFromDate(date: Date): number {
  return localDayKey(date, 'UTC')
}

function dayKeyToInputValue(dk: number): string {
  const year = Math.floor(dk / 10000)
  const month = String(Math.floor((dk % 10000) / 100)).padStart(2, '0')
  const day = String(dk % 100).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function inputValueToDayKey(value: string): number {
  return parseInt(value.replace(/-/g, ''), 10)
}

interface RangePickerProps {
  range: DateRange
  tz: string
  onChange: (range: DateRange) => void
}

export function makeRange(type: RangeType, tz: string, customStart?: number, customEnd?: number): DateRange {
  const now = new Date()
  const todayKey = localDayKey(now, tz)

  switch (type) {
    case 'today':
      return { type, startDk: todayKey, endDk: todayKey }
    case 'week': {
      // Find the start of the current ISO week (Monday)
      const wKey = isoWeekKey(now, tz)
      // Find Monday of this week
      const d = new Date(now)
      const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1 // 0=Mon...6=Sun
      d.setDate(d.getDate() - dayOfWeek)
      const startDk = localDayKey(d, tz)
      return { type, startDk, endDk: todayKey }
    }
    case 'month': {
      // Start of current month
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      }).formatToParts(now)
      const year = parseInt(parts.find(p => p.type === 'year')!.value)
      const month = parseInt(parts.find(p => p.type === 'month')!.value)
      const startDk = year * 10000 + month * 100 + 1
      return { type, startDk, endDk: todayKey }
    }
    case 'lifetime':
      return { type, startDk: 0, endDk: 99999999 }
    case 'custom':
      return { type, startDk: customStart ?? todayKey, endDk: customEnd ?? todayKey }
  }
}

const RANGE_TABS: { type: RangeType; label: string }[] = [
  { type: 'today', label: 'Today' },
  { type: 'week', label: 'Week' },
  { type: 'month', label: 'Month' },
  { type: 'lifetime', label: 'All' },
  { type: 'custom', label: 'Custom' },
]

export function RangePicker({ range, tz, onChange }: RangePickerProps) {
  const todayKey = localDayKey(new Date(), tz)
  const dayCount = range.type === 'custom'
    ? Math.max(0, range.endDk - range.startDk) // approximate
    : 0

  return (
    <div className="space-y-2">
      <div className="flex">
        {RANGE_TABS.map((tab, i) => (
          <button
            key={tab.type}
            onClick={() => onChange(makeRange(tab.type, tz, range.startDk, range.endDk))}
            className={`flex-1 py-1.5 text-xs font-medium transition-colors border relative ${i > 0 ? '-ml-px' : ''} ${
              range.type === tab.type
                ? 'border-foreground text-foreground z-10'
                : 'border-border text-muted hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {range.type === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dayKeyToInputValue(range.startDk === 0 ? todayKey : range.startDk)}
            max={dayKeyToInputValue(range.endDk === 99999999 ? todayKey : range.endDk)}
            onChange={e => {
              const dk = inputValueToDayKey(e.target.value)
              onChange({ ...range, startDk: dk })
            }}
            className="flex-1 text-xs border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <span className="text-xs text-muted">to</span>
          <input
            type="date"
            value={dayKeyToInputValue(range.endDk === 99999999 ? todayKey : range.endDk)}
            max={dayKeyToInputValue(todayKey)}
            min={dayKeyToInputValue(range.startDk)}
            onChange={e => {
              const dk = inputValueToDayKey(e.target.value)
              onChange({ ...range, endDk: dk })
            }}
            className="flex-1 text-xs border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      )}

      {range.type === 'custom' && dayCount > 90 && (
        <p className="text-xs text-muted bg-border/20 px-2 py-1">
          Large date ranges may load slowly.
        </p>
      )}
    </div>
  )
}
