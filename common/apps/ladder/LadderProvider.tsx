'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/common/firebase/AuthProvider'
import { ladderAccessFromClaims, visibleTrackers, type LadderAccess } from './access'
import { useLadderShowAll } from './useLadderPrefs'
import { subscribeCompanies, subscribeJobs, subscribeRequests } from './data'
import { compareJobs, type CurrencyPreference } from './lib'
import { TRACKER_CONFIG, isTracker, type TrackerConfig } from './trackers'
import { type CompanyDoc, type JobDoc, type RequestDoc, type Tracker } from './types'

// Ladder state shared by every /apps/ladder page: which trackers the user may open (custom
// claims, mirrored from roles/{email}), the current tracker, live jobs, companies and requests,
// and the display currency.

const TRACKER_KEY = 'ladder:tracker'
const CURRENCY_KEY = 'ladder:displayCurrency'

interface LadderContextValue {
  /** Trackers the user can open; empty means no ladder access. */
  trackers: Tracker[]
  /** False until the ID token's claims have been read. */
  accessReady: boolean
  tracker: Tracker | null
  config: TrackerConfig | null
  setTracker: (tracker: Tracker) => void
  jobs: JobDoc[]
  companies: CompanyDoc[]
  requests: RequestDoc[]
  loading: boolean
  error: string | null
  currency: CurrencyPreference
  setCurrency: (currency: CurrencyPreference) => void
}

const LadderContext = createContext<LadderContextValue | undefined>(undefined)

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Private browsing: the choice lasts for this page load only.
  }
}

export function LadderProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [access, setAccess] = useState<LadderAccess>({ allowed: [], home: null })
  const [claimsReady, setClaimsReady] = useState(false)
  const { showAll, ready: prefsReady } = useLadderShowAll()
  const [chosen, setChosen] = useState<Tracker | null>(null)
  const [jobs, setJobs] = useState<JobDoc[]>([])
  const [companies, setCompanies] = useState<CompanyDoc[]>([])
  const [requests, setRequests] = useState<RequestDoc[]>([])
  const [loadedFor, setLoadedFor] = useState<Tracker | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currency, setCurrencyState] = useState<CurrencyPreference>('GBP')

  useEffect(() => {
    if (!user) return
    let cancelled = false
    user
      .getIdTokenResult()
      .then(({ claims }) => {
        if (cancelled) return
        setAccess(ladderAccessFromClaims(claims))
        setClaimsReady(true)
      })
      .catch((err) => {
        console.error('[ladder] reading claims failed', err)
        if (!cancelled) setClaimsReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    const stored = readStored(CURRENCY_KEY)
    if (stored) setCurrencyState(stored as CurrencyPreference)
    const fromUrl = new URLSearchParams(window.location.search).get('t')
    const pick = isTracker(fromUrl) ? fromUrl : readStored(TRACKER_KEY)
    if (isTracker(pick)) setChosen(pick)
  }, [])

  // A tracker from the URL or storage that is not visible falls back to the user's own.
  const accessReady = claimsReady && prefsReady
  const trackers = useMemo(() => visibleTrackers(access, showAll), [access, showAll])
  const tracker: Tracker | null = chosen && trackers.includes(chosen) ? chosen : (access.home ?? null)
  const config = tracker ? TRACKER_CONFIG[tracker] : null

  useEffect(() => {
    if (!tracker) return
    setError(null)
    const fail = (err: Error) => {
      console.error('[ladder] snapshot failed', err)
      setError(err.message)
    }
    const unsubs = [
      subscribeJobs(
        tracker,
        (docs) => {
          setJobs(docs.sort(compareJobs))
          setLoadedFor(tracker)
        },
        fail,
      ),
      subscribeCompanies(tracker, (docs) => setCompanies(docs.sort((a, b) => a.name.localeCompare(b.name))), fail),
      // A request just queued has no server createdAt yet: it counts as the newest.
      subscribeRequests(
        tracker,
        (docs) =>
          setRequests(
            docs.sort((a, b) => (b.createdAt?.getTime() ?? Infinity) - (a.createdAt?.getTime() ?? Infinity)),
          ),
        fail,
      ),
    ]
    return () => unsubs.forEach((u) => u())
  }, [tracker])

  const setTracker = useCallback((next: Tracker) => {
    writeStored(TRACKER_KEY, next)
    setChosen(next)
  }, [])

  const setCurrency = useCallback((next: CurrencyPreference) => {
    writeStored(CURRENCY_KEY, next)
    setCurrencyState(next)
  }, [])

  // A stored currency the current tracker does not offer falls back to GBP.
  const shownCurrency: CurrencyPreference =
    currency === 'native' || (config?.currencies as string[] | undefined)?.includes(currency) ? currency : 'GBP'

  const value = useMemo<LadderContextValue>(
    () => ({
      trackers,
      accessReady,
      tracker,
      config,
      setTracker,
      jobs: loadedFor === tracker ? jobs : [],
      companies: loadedFor === tracker ? companies : [],
      requests: loadedFor === tracker ? requests : [],
      loading: !accessReady || (tracker !== null && loadedFor !== tracker && !error),
      error,
      currency: shownCurrency,
      setCurrency,
    }),
    [trackers, accessReady, tracker, config, setTracker, jobs, companies, requests, loadedFor, error, shownCurrency, setCurrency],
  )

  return <LadderContext.Provider value={value}>{children}</LadderContext.Provider>
}

export function useLadder(): LadderContextValue {
  const ctx = useContext(LadderContext)
  if (!ctx) throw new Error('useLadder must be used within a LadderProvider')
  return ctx
}

/** The latest request of a type for one job, if any. */
export function latestRequest(requests: RequestDoc[], type: RequestDoc['type'], slug: string): RequestDoc | undefined {
  return requests.find((r) => r.type === type && r.slug === slug)
}
