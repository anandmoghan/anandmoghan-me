'use client'

import { Card } from '../shell/Card'
import { TRACKER_CONFIG } from './trackers'
import { useLadderAccess, useLadderShowAll } from './useLadderPrefs'

// Settings tab for the ladder app: by default each person sees only their own tracker.
export function LadderSettings() {
  const access = useLadderAccess()
  const { showAll, ready, setShowAll } = useLadderShowAll()
  if (!access || !access.home) return null

  const others = access.allowed.filter((t) => t !== access.home)
  if (others.length === 0) return null
  const names = others.map((t) => `${TRACKER_CONFIG[t].label}'s tracker`).join(' and ')

  return (
    <div className="space-y-8">
      <section>
        <h2 className="settings-card-title">Trackers</h2>
        <Card className="settings-rows">
          <div className="settings-row">
            <div className="min-w-0">
              <p className="font-semibold">Show other trackers</p>
              <p className="text-sm text-muted break-words">
                Your own tracker is always shown. Also show {names}.
              </p>
            </div>
            <div className="settings-row__control">
              {ready && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={showAll}
                  aria-label="Show other trackers"
                  onClick={() => void setShowAll(!showAll).catch((err) => console.error('[ladder] saving pref failed', err))}
                  className="switch"
                />
              )}
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}
