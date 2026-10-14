'use client'

import type { ComponentType } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/common/firebase/AuthProvider'
import { DataProvider } from '@/common/apps/family/hooks/useData'
import Shortcuts from '@/common/apps/family/components/Shortcuts'
import MacStatusCard from '@/common/apps/family/components/MacStatusCard'
import { ExpenseSettingsPage } from '@/common/apps/expense/pages/SettingsPage'
import { SettingsPage as TimeSettingsPage } from '@/common/apps/time/pages/SettingsPage'
import { DashboardSettingsPage } from '@/common/apps/wealth/pages/DashboardSettingsPage'
import { apps } from '../registry'
import type { AppDefinition } from '../types'
import { DomainScope, type Domain } from '../shell/DomainScope'
import { GeneralSettings } from './GeneralSettings'

const GENERAL_ID = 'general'
const GENERAL_DOMAIN: Domain = 'home'

const sectionTitle = 'text-sm font-semibold text-muted uppercase tracking-wide mb-4'

function FamilyPanel() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className={sectionTitle}>Shortcuts</h2>
        <Shortcuts />
      </section>
      <section>
        <h2 className={sectionTitle}>Mac bridge</h2>
        <DataProvider>
          <MacStatusCard testId="settings-mac-status" />
        </DataProvider>
      </section>
    </div>
  )
}

// The wealth, time and expense pages bring their own page gutters; inside the tab they drop
// them so the content lines up with the tab row.
const embedded = '[&>div]:max-w-none [&>div]:px-0 [&>div]:pt-0'

// Apps that have settings, keyed by registry id.
const APP_PANELS: Record<string, ComponentType> = {
  family: FamilyPanel,
  dashboard: DashboardSettingsPage,
  time: TimeSettingsPage,
  expense: ExpenseSettingsPage,
}

interface SettingsTab {
  id: string
  label: string
  domain: Domain
  Panel: ComponentType
  embedded: boolean
}

const GENERAL_TAB: SettingsTab = {
  id: GENERAL_ID,
  label: 'General',
  domain: GENERAL_DOMAIN,
  Panel: GeneralSettings,
  embedded: false,
}

function tabFor(app: AppDefinition): SettingsTab | null {
  const Panel = APP_PANELS[app.id]
  if (!Panel) return null
  return { id: app.id, label: app.name, domain: app.domain, Panel, embedded: app.id !== 'family' }
}

export function SettingsPage() {
  const { isAdmin, apps: grantedApps } = useAuth()
  const router = useRouter()
  const requested = useSearchParams().get('app')

  const appTabs = apps
    .filter((app) => !app.restricted || isAdmin || grantedApps.includes(app.id))
    .map(tabFor)
    .filter((tab): tab is SettingsTab => tab !== null)
  const tabs = [GENERAL_TAB, ...appTabs]
  const selected = tabs.find((tab) => tab.id === requested) ?? GENERAL_TAB

  const select = (tab: SettingsTab) => {
    router.replace(tab.id === GENERAL_ID ? '/settings' : `/settings?app=${tab.id}`, { scroll: false })
  }

  return (
    <DomainScope domain={selected.domain} app className="flex flex-1 flex-col">
      <div className="site-container min-w-0 py-10">
        <h1 className="mb-6 text-2xl font-bold">Settings</h1>

        <div role="tablist" aria-label="Settings" className="settings-tabs mb-8">
          {tabs.map((tab) => {
            const active = tab.id === selected.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`settings-tab-${tab.id}`}
                aria-selected={active}
                aria-controls="settings-panel"
                onClick={() => select(tab)}
                className={`chip domain-${tab.domain}${active ? ' is-active' : ''}`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div
          role="tabpanel"
          id="settings-panel"
          aria-labelledby={`settings-tab-${selected.id}`}
          className={`min-w-0 ${selected.embedded ? embedded : ''}`}
        >
          <selected.Panel />
        </div>
      </div>
    </DomainScope>
  )
}
