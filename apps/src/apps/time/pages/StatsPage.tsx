import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { db } from '../../../firebase'
import { useAuth } from '../../../hooks/useAuth'
import { useCategories } from '../hooks/useCategories'
import { useTzCheck } from '../hooks/useTzCheck'
import { sessionFromWire } from '../schema'
import { duration, formatDurationHuman } from '../schema'
import type { WireSession } from '../schema'
import type { Session } from '../types'
import { RangePicker, makeRange } from '../components/RangePicker'
import type { DateRange } from '../components/RangePicker'
import { CategoryFilter } from '../components/CategoryFilter'
import { SessionList } from '../components/SessionList'
import { TimeLineChart } from '../components/charts/TimeLineChart'
import { CategoryTotals } from '../components/charts/CategoryTotals'
import { InlineSpinner } from '../../../components/Spinner'

export function StatsPage() {
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const { effectiveTz, initialized } = useTzCheck(uid || undefined)
  const { categories, categoryMap, loading: catsLoading } = useCategories(uid || undefined)

  const [range, setRange] = useState<DateRange>(() => makeRange('week', Intl.DateTimeFormat().resolvedOptions().timeZone))
  const [filteredCategoryId, setFilteredCategoryId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)

  useEffect(() => {
    if (initialized) {
      setRange(makeRange('week', effectiveTz))
    }
  }, [initialized, effectiveTz])

  useEffect(() => {
    if (!uid) return
    setLoadingSessions(true)

    const q = range.startDk === 0 && range.endDk === 99999999
      ? query(collection(db, 'users', uid, 'sessions'), orderBy('s', 'desc'))
      : query(
          collection(db, 'users', uid, 'sessions'),
          where('dk', '>=', range.startDk),
          where('dk', '<=', range.endDk),
        )

    const unsub = onSnapshot(q, snap => {
      setSessions(snap.docs.map(d => sessionFromWire(d.id, d.data() as WireSession)))
      setLoadingSessions(false)
    })
    return unsub
  }, [uid, range.startDk, range.endDk])

  if (!initialized || catsLoading) {
    return (
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
        <InlineSpinner />
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-4xl mb-3">📊</p>
        <p className="text-muted text-sm">No data yet. Start tracking on the Today tab.</p>
      </div>
    )
  }

  // Summary stats (all sessions, active uses elapsed-to-now via duration())
  const filtered = filteredCategoryId
    ? sessions.filter(s => s.categoryId === filteredCategoryId)
    : sessions
  const totalSeconds = filtered.reduce((acc, s) => acc + duration(s), 0)
  const totalCount = filtered.length
  const activeDays = new Set(filtered.map(s => s.dayKey)).size
  const sealedCount = filtered.filter(s => s.endedAt !== null).length
  const avgSeconds = sealedCount > 0 ? Math.round(filtered.filter(s => s.endedAt !== null).reduce((acc, s) => acc + duration(s), 0) / sealedCount) : 0

  const hasSessions = sessions.length > 0

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-5 pb-6 pt-4">
      {/* Range + filter */}
      <RangePicker range={range} tz={effectiveTz} onChange={setRange} />
      <CategoryFilter
        categories={categories}
        selectedId={filteredCategoryId}
        onChange={setFilteredCategoryId}
      />

      {loadingSessions ? (
        <InlineSpinner />
      ) : !hasSessions ? (
        <div className="text-center py-12">
          <p className="text-muted text-sm">No sessions in this range.</p>
        </div>
      ) : (
        <>
          {/* Summary stat row */}
          {filtered.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px border border-border bg-border">
              <StatCard label="Total time" value={formatDurationHuman(totalSeconds)} />
              <StatCard label="Sessions" value={String(totalCount)} />
              <StatCard label="Active days" value={String(activeDays)} />
              <StatCard label="Avg session" value={avgSeconds > 0 ? formatDurationHuman(avgSeconds) : '—'} />
            </div>
          )}

          {/* Charts */}
          {filtered.length > 0 && (
            <div className="space-y-6">
              <TimeLineChart
                sessions={sessions}
                categories={categories}
                categoryMap={categoryMap}
                filteredCategoryId={filteredCategoryId}
                tz={effectiveTz}
                rangeType={range.type}
              />
              <CategoryTotals
                sessions={sessions}
                categories={categories}
                filteredCategoryId={filteredCategoryId}
              />
            </div>
          )}

          {/* Session list */}
          <div className="border-t border-border pt-4">
            <SessionList
              sessions={sessions}
              categories={categories}
              categoryMap={categoryMap}
              uid={uid}
              tz={effectiveTz}
              filteredCategoryId={filteredCategoryId}
            />
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background px-4 py-3 flex flex-col gap-0.5">
      <span className="text-[10px] text-muted uppercase tracking-wide font-medium">{label}</span>
      <span className="text-xl font-semibold tabular-nums leading-tight">{value}</span>
    </div>
  )
}
