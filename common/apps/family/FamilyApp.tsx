'use client'

import type { ReactNode } from 'react'
import { useAuth } from '@/common/firebase/AuthProvider'
import { DomainScope } from '@/common/apps/shell/DomainScope'
import { DataProvider, useData } from '@/common/apps/family/hooks/useData'
import { ToastProvider } from '@/common/apps/family/hooks/useToast'
import { SubLabelProvider } from '@/common/apps/family/hooks/useViewTab'
import { HeaderSlot } from '@/common/components/HeaderSlot'
import MacPill from '@/common/apps/family/components/MacPill'
import TabBar from '@/common/apps/family/components/TabBar'
import { ListSkeleton } from '@/common/apps/family/components/Skeleton'
import { RequireAuth } from '@/common/apps/components/RequireAuth'
import { RestrictedNotice } from '@/common/apps/components/RequireApp'
import { domainOf } from '@/common/apps/family/lib/domain'
import { useLocation } from '@/common/apps/family/router'

function Members({ children }: { children: ReactNode }) {
  const { access } = useData()
  const { pathname } = useLocation()
  // Home links to every area through its cards, so the bottom tabs (and their padding) are for sub pages only.
  const onHome = pathname === '/'
  if (access === 'loading') return <ListSkeleton rows={3} />
  if (access === 'denied') return <RestrictedNotice />
  return (
    <>
      <HeaderSlot>
        <MacPill />
      </HeaderSlot>
      <div className={onHome ? undefined : 'with-tab-bar'}>
        {children}
      </div>
      {!onHome && <TabBar />}
    </>
  )
}

// The family app (ported from personal-manager/web) under the site header: the area on screen
// sets the accent (.domain-<name>), anonymous visitors go to /login like every app, signed-in
// non-members get the shared Restricted notice, members (and admins with the family app) get the pages.
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
        <SubLabelProvider>
        {loading ? (
          <ListSkeleton rows={3} />
        ) : (
          <RequireAuth>
            <DataProvider>
              <Members>{children}</Members>
            </DataProvider>
          </RequireAuth>
        )}
        </SubLabelProvider>
      </ToastProvider>
    </DomainScope>
  )
}
