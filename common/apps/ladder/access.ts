import { TRACKERS, type Tracker } from './types'

// Which ladder trackers a user may open, and which one is theirs, from the ID token claims
// (mirrored from roles/{email} by syncRoleClaims).

export interface LadderAccess {
  /** Trackers the role allows; empty means no ladder access. */
  allowed: Tracker[]
  /** The user's own tracker: claim `ladderHome`, else the first allowed one. */
  home: Tracker | null
}

export function ladderAccessFromClaims(claims: Record<string, unknown>): LadderAccess {
  const none: LadderAccess = { allowed: [], home: null }
  if (claims.email_verified !== true) return none
  const listed = Array.isArray(claims.ladderTrackers) ? claims.ladderTrackers : []
  const fromRole = TRACKERS.filter((t) => listed.includes(t))
  let allowed: Tracker[]
  if (claims.admin === true) {
    allowed = fromRole.length > 0 ? fromRole : [...TRACKERS]
  } else {
    const apps = Array.isArray(claims.apps) ? claims.apps : []
    if (!apps.includes('ladder')) return none
    allowed = fromRole
  }
  const home = TRACKERS.find((t) => t === claims.ladderHome && allowed.includes(t)) ?? allowed[0] ?? null
  return { allowed, home }
}

/** The trackers shown: just the home tracker unless the user opted in to the others. */
export function visibleTrackers({ allowed, home }: LadderAccess, showAll: boolean): Tracker[] {
  return showAll || !home ? allowed : [home]
}
