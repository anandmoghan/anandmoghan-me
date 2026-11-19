'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/common/firebase/AuthProvider'
import { fetchState, HomeApiError, sendAction, streamEvents, type StateEvent, type StreamStatus, type TokenSource } from './api'
import {
  findDevice,
  isAutomationId,
  optimisticDevice,
  withAutomation,
  withDevice,
  type Automation,
  type Device,
  type HomeAction,
  type HomeState,
} from './lib'

// Home state for every /apps/home page: one GET /home/state, then the SSE stream keeps it live.
// Actions apply optimistically; the action's response and the stream reconcile them, and a failed
// action rolls back unless something newer already replaced the optimistic value.

interface HomeContextValue {
  state: HomeState | null
  loadError: string | null
  stream: StreamStatus
  /** The last failed action, shown until the next one. */
  notice: string | null
  dismissNotice: () => void
  act: (entityId: string, action: HomeAction) => Promise<void>
  reload: () => void
}

const HomeContext = createContext<HomeContextValue | undefined>(undefined)

function applyEvent(state: HomeState, event: StateEvent): HomeState {
  if (isAutomationId(event.entity_id)) {
    const current = state.automations.find((a) => a.entity_id === event.entity_id)
    if (!current) return state
    return withAutomation(state, {
      ...current,
      name: event.name ?? current.name,
      enabled: event.enabled ?? (event.state !== undefined ? event.state === 'on' : current.enabled),
      last_triggered: event.last_triggered !== undefined ? event.last_triggered : current.last_triggered,
    })
  }
  const current = findDevice(state, event.entity_id)
  if (!current) return state
  return withDevice(state, {
    ...current,
    ...(event.name !== undefined ? { name: event.name } : {}),
    ...(event.state !== undefined ? { state: event.state } : {}),
    ...(event.controllable !== undefined ? { controllable: event.controllable } : {}),
    attributes: event.attributes ?? current.attributes,
  })
}

function applyResult(state: HomeState, result: Device | Automation): HomeState {
  return 'enabled' in result ? withAutomation(state, result) : withDevice(state, result)
}

export function HomeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [state, setState] = useState<HomeState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [stream, setStream] = useState<StreamStatus>('connecting')
  const [notice, setNotice] = useState<string | null>(null)
  const [generation, setGeneration] = useState(0)
  // The newest value written for each entity by this page, so a late rollback never clobbers it.
  const latest = useRef(new Map<string, Device | Automation>())

  const token = useMemo<TokenSource | null>(() => (user ? (force) => user.getIdToken(force) : null), [user])

  /** Resolves to whether the snapshot loaded. */
  const load = useCallback(async (source: TokenSource): Promise<boolean> => {
    try {
      setState(await fetchState(source))
      setLoadError(null)
      return true
    } catch (err) {
      setLoadError(err instanceof HomeApiError ? err.message : 'Could not reach the home server.')
      return false
    }
  }, [])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    load(token).then((loaded) => {
      if (controller.signal.aborted) return
      streamEvents({
        token,
        signal: controller.signal,
        onStatus: setStream,
        // Events missed while disconnected (or a first load that failed) need a fresh snapshot.
        onOpen: (first) => {
          if (!first || !loaded) load(token).then((ok) => { loaded = loaded || ok })
        },
        onEvent: (event) => {
          latest.current.delete(event.entity_id)
          setState((s) => (s ? applyEvent(s, event) : s))
        },
      })
    })
    return () => controller.abort()
  }, [token, load, generation])

  const act = useCallback(async (entityId: string, action: HomeAction) => {
    if (!token || !state) return
    setNotice(null)
    const before = isAutomationId(entityId)
      ? state.automations.find((a) => a.entity_id === entityId)
      : findDevice(state, entityId)
    if (!before) return
    let optimistic: Device | Automation = before
    if ('domain' in before) optimistic = optimisticDevice(before, action)
    else if (action.action === 'enable' || action.action === 'disable') optimistic = { ...before, enabled: action.action === 'enable' }
    if (optimistic !== before) {
      latest.current.set(entityId, optimistic)
      setState((s) => (s ? applyResult(s, optimistic) : s))
    }
    try {
      const result = await sendAction(token, entityId, action)
      if (latest.current.get(entityId) === optimistic) latest.current.delete(entityId)
      setState((s) => (s ? applyResult(s, result) : s))
    } catch (err) {
      if (optimistic !== before && latest.current.get(entityId) === optimistic) {
        latest.current.delete(entityId)
        setState((s) => (s ? applyResult(s, before) : s))
      }
      const reason = err instanceof HomeApiError ? err.message : 'Could not reach the home server.'
      setNotice(`${before.name}: ${reason}`)
    }
  }, [token, state])

  const value = useMemo<HomeContextValue>(() => ({
    state,
    loadError,
    stream,
    notice,
    dismissNotice: () => setNotice(null),
    act,
    reload: () => setGeneration((g) => g + 1),
  }), [state, loadError, stream, notice, act])

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>
}

export function useHome(): HomeContextValue {
  const ctx = useContext(HomeContext)
  if (!ctx) throw new Error('useHome must be used within a HomeProvider')
  return ctx
}
