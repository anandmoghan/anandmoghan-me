'use client'

import type { ReactNode } from 'react'
import { useAuth } from '@/common/firebase/AuthProvider'
import { DomainScope } from '@/common/apps/shell/DomainScope'
import { DataProvider, useData } from '@/common/apps/family/hooks/useData'
import { ToastProvider } from '@/common/apps/family/hooks/useToast'
import AreaBar from '@/common/apps/family/components/AreaBar'
import TabBar from '@/common/apps/family/components/TabBar'
import { ListSkeleton } from '@/common/apps/family/components/Skeleton'
import { NotAllowed, SignIn } from '@/common/apps/family/pages/Gate'
import { domainOf } from '@/common/apps/family/lib/domain'
import { useLocation } from '@/common/apps/family/router'

function Members({ children }: { children: ReactNode }) {
  const { access } = useData()
  if (access === 'loading') return <ListSkeleton rows={3} />
  if (access === 'denied') return <NotAllowed />
  return (
    <>
      <div className="with-tab-bar">
        <AreaBar showMac />
        {children}
      </div>
      <TabBar />
    </>
  )
}

// The family app (ported from personal-manager/web) under the site header: the area on screen
// sets the accent (.domain-<name>), anonymous visitors get the sign-in gate, signed-in
// non-members get "not allowed", members (and admins with the family app) get the pages.
// The pages keep their own 1rem gutters; .family-content tops them up to the site-container
// gutters (family.css) so wide pages line up with the header.
export function FamilyApp({ children }: { children: ReactNode }) {
  const { user, isAnonymous, loading } = useAuth()
  const { pathname } = useLocation()
  const signedIn = !!user && !isAnonymous

  return (
    <DomainScope
      domain={signedIn ? domainOf(pathname) : 'home'}
      className="family-app site-container family-content flex flex-1 flex-col"
    >
      <ToastProvider>
        {loading ? (
          <ListSkeleton rows={3} />
        ) : !signedIn ? (
          <SignIn />
        ) : (
          <DataProvider>
            <Members>{children}</Members>
          </DataProvider>
        )}
      </ToastProvider>
    </DomainScope>
  )
}
