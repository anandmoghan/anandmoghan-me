'use client'

import { useState } from 'react'
import { switchTimezone } from '../services/activity'

interface TzChangeBannerProps {
  uid: string
  storedTz: string
  runtimeTz: string
  onDismiss: () => void
}

export function TzChangeBanner({ uid, storedTz, runtimeTz, onDismiss }: TzChangeBannerProps) {
  const [loading, setLoading] = useState(false)

  const handleSwitch = async () => {
    setLoading(true)
    try {
      await switchTimezone(uid, runtimeTz)
      onDismiss()
    } catch (err) {
      console.error('[TzChangeBanner] switch failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-4 mb-4 p-3 border border-accent/30 bg-accent/5 text-sm">
      <p className="font-medium text-foreground mb-1">Timezone changed</p>
      <p className="text-muted text-xs mb-3">
        Stored: <span className="font-mono">{storedTz}</span>
        {' → '}
        Detected: <span className="font-mono">{runtimeTz}</span>
      </p>
      <p className="text-muted text-xs mb-3">
        Switching will delete any sessions recorded today in either timezone.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleSwitch}
          disabled={loading}
          className="flex-1 py-1.5 text-xs bg-accent text-background font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Switching…' : `Switch to ${runtimeTz}`}
        </button>
        <button
          onClick={onDismiss}
          disabled={loading}
          className="flex-1 py-1.5 text-xs border border-border hover:bg-muted/20 transition-colors disabled:opacity-50"
        >
          Keep {storedTz}
        </button>
      </div>
    </div>
  )
}
