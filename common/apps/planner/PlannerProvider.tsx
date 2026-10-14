'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { useAuth } from '@/common/firebase/AuthProvider'
import { getDb } from '@/common/firebase/client'
import { COLOURS, isColour, type Person, type PlannerColour } from './lib'

// Planner state for every /apps/planner page: the household's profiles (planner/{uid}, live)
// and the signed-in user's own. On first open the user's profile is created with their
// nickname and the next colour nobody has.

interface PlannerContextValue {
  /** Everyone with a profile, the signed-in user first. Empty until loaded. */
  people: Person[]
  me: Person | null
  ready: boolean
  error: string | null
  setColour: (colour: PlannerColour) => Promise<void>
}

const PlannerContext = createContext<PlannerContextValue | undefined>(undefined)

function toPerson(uid: string, data: Record<string, unknown>): Person {
  return {
    uid,
    displayName: typeof data.displayName === 'string' ? data.displayName : 'Someone',
    colour: isColour(data.colour) ? data.colour : 'a',
  }
}

export function PlannerProvider({ children }: { children: ReactNode }) {
  const { user, displayName } = useAuth()
  const uid = user?.uid
  const [loaded, setLoaded] = useState<{ uid: string; all: Person[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const creating = useRef(false)

  useEffect(() => {
    if (!uid) return
    return onSnapshot(
      collection(getDb(), 'planner'),
      (snap) => setLoaded({ uid, all: snap.docs.map((d) => toPerson(d.id, d.data())) }),
      (err) => {
        console.error('[planner] reading profiles failed', err)
        setError(err.message)
      },
    )
  }, [uid])

  const all = loaded && loaded.uid === uid ? loaded.all : null
  const mine = all?.find((p) => p.uid === uid) ?? null

  useEffect(() => {
    if (!uid || !all || mine || !displayName || creating.current) return
    creating.current = true
    const taken = new Set(all.map((p) => p.colour))
    const colour = COLOURS.find((c) => !taken.has(c)) ?? COLOURS[all.length % COLOURS.length]
    setDoc(doc(getDb(), 'planner', uid), { displayName, colour, updatedAt: serverTimestamp() }).catch((err) => {
      console.error('[planner] creating profile failed', err)
      setError(err.message)
      creating.current = false
    })
  }, [uid, all, mine, displayName])

  const value = useMemo<PlannerContextValue>(() => {
    const people = all ? [...(mine ? [mine] : []), ...all.filter((p) => p.uid !== uid).sort((a, b) => a.displayName.localeCompare(b.displayName))] : []
    return {
      people,
      me: mine,
      ready: mine !== null,
      error,
      setColour: async (colour) => {
        if (!uid || !mine) return
        await setDoc(
          doc(getDb(), 'planner', uid),
          { displayName: mine.displayName, colour, updatedAt: serverTimestamp() },
          { merge: true },
        )
      },
    }
  }, [all, mine, uid, error])

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>
}

export function usePlanner(): PlannerContextValue {
  const ctx = useContext(PlannerContext)
  if (!ctx) throw new Error('usePlanner must be used within a PlannerProvider')
  return ctx
}
