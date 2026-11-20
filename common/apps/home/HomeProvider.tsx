'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/common/firebase/AuthProvider'
import { mergeEnergy, type Energy } from './energy'
import { fetchEnergy, fetchState, HomeApiError, sendAction, streamEvents, type StreamStatus, type TokenSource } from './api'
import {
  applyEvent,
  findDevice,
  findRoomByAllLights,
  isAutomationId,
  optimisticChanges,
  withAutomation,
  withDevices,
  type Automation,
  type Device,
  type HomeAction,
  type HomeState,
} from './lib'

// Home state for every /apps/home page: one GET /home/state, then the SSE stream keeps it live.
// Actions apply optimistically (a light group's bulbs and a room's lights with it); the action's
// response and the stream reconcile them, and a failed action rolls back each value unless something
// newer already replaced it.

/** Energy has its own load: the Home tabs work while the meter has not reported. */
export type EnergyStatus = 'loading' | 'ready' | 'unavailable'

interface HomeContextValue {
  state: HomeState | null
  energy: Energy | null
  energyStatus: EnergyStatus
  loadError: string | null
  stream: StreamStatus
  /** The last failed action, shown until the next one. */
  notice: string | null
  dismissNotice: () => void
  act: (entityId: string, action: HomeAction) => Promise<void>
  reload: () => void
}

const HomeContext = createContext<HomeContextValue | undefined>(undefined)

function applyResult(state: HomeState, result: Device | Automation): HomeState {
  return 'enabled' in result ? withAutomation(state, result) : withDevices(state, [result])
}

export function HomeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [state, setState] = useState<HomeState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [stream, setStream] = useState<StreamStatus>('connecting')
  const [notice, setNotice] = useState<string | null>(null)
  const [generation, setGeneration] = useState(0)
  const [energy, setEnergy] = useState<Energy | null>(null)
  const [energyStatus, setEnergyStatus] = useState<EnergyStatus>('loading')
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

  const loadEnergy = useCallback(async (source: TokenSource) => {
    try {
      setEnergy(await fetchEnergy(source))
      setEnergyStatus('ready')
    } catch {
      setEnergyStatus((status) => (status === 'ready' ? status : 'unavailable'))
    }
  }, [])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    loadEnergy(token)
    load(token).then((loaded) => {
      if (controller.signal.aborted) return
      streamEvents({
        token,
        signal: controller.signal,
        onStatus: setStream,
        // Events missed while disconnected (or a first load that failed) need a fresh snapshot.
        onOpen: (first) => {
          if (!first || !loaded) load(token).then((ok) => { loaded = loaded || ok })
          if (!first) loadEnergy(token)
        },
        onEvent: (event) => {
          if (event.type === 'energy') {
            setEnergy((current) => mergeEnergy(current, event))
            setEnergyStatus('ready')
            return
          }
          latest.current.delete(event.entity_id)
          setState((s) => (s ? applyEvent(s, event) : s))
        },
      })
    })
    return () => controller.abort()
  }, [token, load, loadEnergy, generation])

  const act = useCallback(async (entityId: string, action: HomeAction) => {
    if (!token || !state) return
    setNotice(null)
    const automation = state.automations.find((a) => a.entity_id === entityId)
    const room = findRoomByAllLights(state, entityId)
    const label = automation?.name
      ?? state.scenes.find((scene) => scene.entity_id === entityId)?.name
      ?? (room ? `${room.name} lights` : findDevice(state, entityId)?.name)
    if (!label) return
    const before: (Device | Automation)[] = []
    const optimistic: (Device | Automation)[] = []
    if (automation && (action.action === 'enable' || action.action === 'disable')) {
      before.push(automation)
      optimistic.push({ ...automation, enabled: action.action === 'enable' })
    } else if (!isAutomationId(entityId)) {
      for (const next of optimisticChanges(state, entityId, action)) {
        const current = findDevice(state, next.entity_id)
        if (current) {
          before.push(current)
          optimistic.push(next)
        }
      }
    }
    optimistic.forEach((value) => latest.current.set(value.entity_id, value))
    if (optimistic.length) setState((s) => (s ? optimistic.reduce(applyResult, s) : s))
    try {
      const result = await sendAction(token, entityId, action)
      optimistic.forEach((value) => {
        if (latest.current.get(value.entity_id) === value) latest.current.delete(value.entity_id)
      })
      setState((s) => (s ? applyResult(s, result) : s))
    } catch (err) {
      const stale = before.filter((_, i) => latest.current.get(optimistic[i].entity_id) === optimistic[i])
      stale.forEach((value) => latest.current.delete(value.entity_id))
      if (stale.length) setState((s) => (s ? stale.reduce(applyResult, s) : s))
      const reason = err instanceof HomeApiError ? err.message : 'Could not reach the home server.'
      setNotice(`${label}: ${reason}`)
    }
  }, [token, state])

  const value = useMemo<HomeContextValue>(() => ({
    state,
    energy,
    energyStatus,
    loadError,
    stream,
    notice,
    dismissNotice: () => setNotice(null),
    act,
    reload: () => setGeneration((g) => g + 1),
  }), [state, energy, energyStatus, loadError, stream, notice, act])

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>
}

export function useHome(): HomeContextValue {
  const ctx = useContext(HomeContext)
  if (!ctx) throw new Error('useHome must be used within a HomeProvider')
  return ctx
}
