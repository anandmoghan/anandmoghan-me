'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/common/firebase/AuthProvider'
import { GearIcon, SignOutIcon, UserIcon } from '../shell/icons'

const itemClass =
  'tap flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-[0.95rem] font-semibold hover:bg-subtle'

export function ProfileMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!user) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-11 w-11 items-center justify-center rounded-full"
        aria-label="Profile menu"
        aria-expanded={open}
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            className="h-9 w-9 rounded-full"
          />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-domain text-sm font-bold text-domain-foreground">
            {(user.displayName || user.email || 'U')[0].toUpperCase()}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-border/70 bg-surface p-1.5 shadow-float">
          <div className="px-3 py-2.5">
            <p className="truncate font-bold">{user.displayName || 'Signed in'}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
          </div>
          <Link href="/account" className={itemClass} onClick={() => setOpen(false)}>
            <UserIcon />
            Account
          </Link>
          <Link href="/apps/settings" className={itemClass} onClick={() => setOpen(false)}>
            <GearIcon size={18} />
            Settings
          </Link>
          <button
            type="button"
            onClick={() => { signOut(); setOpen(false) }}
            className={`${itemClass} text-destructive`}
          >
            <SignOutIcon />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
