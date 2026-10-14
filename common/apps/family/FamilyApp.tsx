'use client'

import type { ReactNode } from 'react'
import { useAuth } from '@/common/firebase/AuthProvider'
import { DomainScope } from '@/common/apps/shell/DomainScope'
import { DataProvider, useData } from '@/common/apps/family/hooks/useData'
import { ToastProvider } from '@/common/apps/family/hooks/useToast'
import Header from '@/common/apps/family/components/Header'
import TabBar from '@/common/apps/family/components/TabBar'
import { ListSkeleton } from '@/common/apps/family/components/Skeleton'
import { NotAllowed, SignIn } from '@/common/apps/family/pages/Gate'
import { domainOf } from '@/common/apps/family/lib/domain'
import { useLocation } from '@/common/apps/family/router'

function Members({ children }: { children: ReactNode }) {
  const { access } = useData()
  return (
    <>
      <Header signedIn showMac={access === 'allowed'} />
      {access === 'loading' ? (
        <ListSkeleton rows={3} />
      ) : access === 'denied' ? (
        <NotAllowed />
      ) : (
        <>
          <div className="with-tab-bar mx-auto w-full max-w-5xl">{children}</div>
          <TabBar />
        </>
      )}
    </>
  )
}

// The family app (ported from personal-manager/web): the area on screen sets the accent
// (.domain-<name>), anonymous visitors get the sign-in gate, signed-in non-members get
// "not allowed", members (and admins with the family app) get the pages.
export function FamilyApp({ children }: { children: ReactNode }) {
  const { user, isAnonymous, loading } = useAuth()
  const { pathname } = useLocation()
  const signedIn = !!user && !isAnonymous

  return (
    <DomainScope domain={signedIn ? domainOf(pathname) : 'home'} className="family-app flex flex-1 flex-col">
      <ToastProvider>
        {loading ? (
          <>
            <Header signedIn={false} showMac={false} />
            <ListSkeleton rows={3} />
          </>
        ) : !signedIn ? (
          <>
            <Header signedIn={false} showMac={false} />
            <SignIn />
          </>
        ) : (
          <DataProvider>
            <Members>{children}</Members>
          </DataProvider>
        )}
      </ToastProvider>
    </DomainScope>
  )
}
