import { HOME_API } from '@/common/api/config'
import type { Energy } from './energy'
import type { Automation, Device, HomeAction, HomeEvent, HomeState } from './lib'

// The Home API client. Every call carries `Authorization: Bearer <Firebase ID token>`; a 401 gets
// one retry with a freshly minted token (the cached one may have expired or lack a new claim).

/** Returns the user's ID token; `force` mints a new one. */
export type TokenSource = (force: boolean) => Promise<string>

export class HomeApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

async function errorFrom(res: Response): Promise<HomeApiError> {
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null
  if (res.status === 429) return new HomeApiError(429, 'Too many changes at once. Wait a moment and try again.')
  if (res.status === 403) return new HomeApiError(403, 'Your account does not have the Home app.')
  const detail = typeof body?.error === 'string' ? body.error : `Home Assistant answered ${res.status}.`
  return new HomeApiError(res.status, detail)
}

async function authedFetch(token: TokenSource, path: string, init: RequestInit = {}): Promise<Response> {
  const send = async (force: boolean) =>
    fetch(`${HOME_API}${path}`, {
      ...init,
      cache: 'no-store',
      headers: { ...init.headers, Authorization: `Bearer ${await token(force)}` },
    })
  const res = await send(false)
  return res.status === 401 ? send(true) : res
}

export async function fetchState(token: TokenSource): Promise<HomeState> {
  const res = await authedFetch(token, '/state')
  if (!res.ok) throw await errorFrom(res)
  return (await res.json()) as HomeState
}

/** Today's energy, rates and per-device estimates (GET /home/energy). */
export async function fetchEnergy(token: TokenSource): Promise<Energy> {
  const res = await authedFetch(token, '/energy')
  if (!res.ok) throw await errorFrom(res)
  return (await res.json()) as Energy
}

/** Sends one action; resolves to the device, tile or automation as Home Assistant now reports it. */
export async function sendAction(token: TokenSource, entityId: string, action: HomeAction): Promise<Device | Automation> {
  const res = await authedFetch(token, '/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity_id: entityId, ...action }),
  })
  if (!res.ok) throw await errorFrom(res)
  return (await res.json()) as Device | Automation
}

export type StreamStatus = 'connecting' | 'live' | 'reconnecting'

interface StreamOptions {
  token: TokenSource
  signal: AbortSignal
  onStatus: (status: StreamStatus) => void
  /** Called on every connect; `first` is false after a drop, when the caller must fetch what it missed. */
  onOpen: (first: boolean) => void
  onEvent: (event: HomeEvent) => void
}

// The server sends a heartbeat every 25 s; a connection silent for longer than this is dead even
// if the socket has not noticed (a phone waking from sleep, a dropped Wi-Fi hop).
const STALL_MS = 60_000
const MAX_BACKOFF_MS = 30_000

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve()
    }, { once: true })
  })
}

/** Parses one SSE block ("data: ..." lines; comments, heartbeats and other fields ignored). */
function parseBlock(block: string): HomeEvent | null {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).replace(/^ /, ''))
    .join('\n')
  if (!data) return null
  try {
    const event = JSON.parse(data) as { type?: unknown; entity_id?: unknown }
    if (event.type === 'energy') return event as HomeEvent
    const known = event.type === 'state' || event.type === 'automation'
    return known && typeof event.entity_id === 'string' ? (event as HomeEvent) : null
  } catch {
    return null
  }
}

async function readStream(body: ReadableStream<Uint8Array>, onEvent: (event: HomeEvent) => void, abort: () => void) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let stall = setTimeout(abort, STALL_MS)
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) return
      clearTimeout(stall)
      stall = setTimeout(abort, STALL_MS)
      buffer += decoder.decode(value, { stream: true })
      const blocks = buffer.split(/\r?\n\r?\n/)
      buffer = blocks.pop() ?? ''
      for (const block of blocks) {
        const event = parseBlock(block)
        if (event) onEvent(event)
      }
    }
  } finally {
    clearTimeout(stall)
  }
}

// EventSource cannot send an Authorization header, so the stream is read with fetch. It reconnects
// with exponential backoff until `signal` aborts, and re-mints the token after a 401.
export async function streamEvents({ token, signal, onStatus, onOpen, onEvent }: StreamOptions): Promise<void> {
  let failures = 0
  let opened = false
  let fresh = false
  while (!signal.aborted) {
    onStatus(opened ? 'reconnecting' : 'connecting')
    const connection = new AbortController()
    const stop = () => connection.abort()
    signal.addEventListener('abort', stop, { once: true })
    try {
      const res = await fetch(`${HOME_API}/events`, {
        headers: { Accept: 'text/event-stream', Authorization: `Bearer ${await token(fresh)}` },
        cache: 'no-store',
        signal: connection.signal,
      })
      if (res.status === 401 && !fresh) {
        fresh = true
        continue
      }
      if (!res.ok || !res.body) throw await errorFrom(res)
      fresh = false
      failures = 0
      onStatus('live')
      onOpen(!opened)
      opened = true
      await readStream(res.body, onEvent, stop)
    } catch (err) {
      if (!signal.aborted && !(err instanceof DOMException && err.name === 'AbortError')) {
        console.warn('[home] event stream dropped', err instanceof Error ? err.message : err)
      }
    } finally {
      signal.removeEventListener('abort', stop)
    }
    if (signal.aborted) return
    failures += 1
    await wait(Math.min(MAX_BACKOFF_MS, 1000 * 2 ** Math.min(failures - 1, 5)), signal)
  }
}
