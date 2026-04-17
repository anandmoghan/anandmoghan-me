import { useState } from 'react'
import { useGroups } from './hooks/useGroups'
import { useInvites } from './hooks/useInvites'
import { useGroupPortfolios } from './hooks/useTrading212'
import { useExchangeRates } from './hooks/useExchangeRates'
import { GroupSelector } from './components/GroupSelector'
import { ViewToggle } from './components/ViewToggle'
import { PortfolioTable } from './components/PortfolioTable'
import { CashSummary } from './components/CashSummary'
import { TransactionList } from './components/TransactionList'
import { InviteManager } from './components/InviteManager'
import { CurrencySelector } from './components/CurrencySelector'
import type { MemberData } from './types'
import type { Position, AccountCash, Order } from './services/trading212'

export default function DashboardApp() {
  const { groups, loading: groupsLoading, selectedGroupId, setSelectedGroupId, selectedGroup, createGroup } = useGroups()
  const { sentInvites, receivedInvites, userProfiles, sendInvite, respondToInvite } = useInvites()
  const { memberData, currencyMap, nameMap, loading: dataLoading } = useGroupPortfolios(selectedGroup)
  const { rates, displayCurrency, setDisplayCurrency } = useExchangeRates()

  const [activeView, setActiveView] = useState<string | 'combined'>('combined')
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [showInvites, setShowInvites] = useState(false)

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim()) return
    setCreatingGroup(true)
    try {
      await createGroup(newGroupName.trim())
      setNewGroupName('')
      setShowCreateGroup(false)
    } finally {
      setCreatingGroup(false)
    }
  }

  // Determine what to display
  const members: MemberData[] = memberData.map((m) => m.member)

  // Get data for current view
  const getViewData = (): { portfolio: Position[]; cash: AccountCash | null; orders: Order[]; loading: boolean; error: string | null } => {
    if (dataLoading) return { portfolio: [], cash: null, orders: [], loading: true, error: null }
    if (memberData.length === 0) return { portfolio: [], cash: null, orders: [], loading: false, error: null }

    if (activeView === 'combined') {
      // Aggregate positions
      const posMap = new Map<string, Position>()
      memberData.forEach((m) => {
        m.portfolio.forEach((pos) => {
          if (posMap.has(pos.ticker)) {
            const existing = posMap.get(pos.ticker)!
            posMap.set(pos.ticker, {
              ...existing,
              quantity: existing.quantity + pos.quantity,
              ppl: existing.ppl + pos.ppl,
              fxPpl: existing.fxPpl + pos.fxPpl,
            })
          } else {
            posMap.set(pos.ticker, { ...pos })
          }
        })
      })

      // Aggregate cash
      const validCash = memberData.filter((m) => m.cash !== null)
      const combinedCash: AccountCash | null = validCash.length > 0 ? {
        blocked: validCash.reduce((s, m) => s + (m.cash?.blocked || 0), 0),
        free: validCash.reduce((s, m) => s + (m.cash?.free || 0), 0),
        invested: validCash.reduce((s, m) => s + (m.cash?.invested || 0), 0),
        pieCash: validCash.reduce((s, m) => s + (m.cash?.pieCash || 0), 0),
        ppl: validCash.reduce((s, m) => s + (m.cash?.ppl || 0), 0),
        result: validCash.reduce((s, m) => s + (m.cash?.result || 0), 0),
        total: validCash.reduce((s, m) => s + (m.cash?.total || 0), 0),
      } : null

      const allOrders = memberData.flatMap((m) => m.orders)
        .sort((a, b) => new Date(b.dateModified).getTime() - new Date(a.dateModified).getTime())

      return { portfolio: Array.from(posMap.values()), cash: combinedCash, orders: allOrders, loading: false, error: null }
    }

    const memberView = memberData.find((m) => m.member.uid === activeView)
    if (!memberView) return { portfolio: [], cash: null, orders: [], loading: false, error: 'Member not found' }

    return {
      portfolio: memberView.portfolio,
      cash: memberView.cash,
      orders: memberView.orders,
      loading: memberView.loading,
      error: memberView.error,
    }
  }

  const viewData = getViewData()

  if (groupsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="w-8 h-8 animate-spin text-muted" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Pending invites banner */}
      {receivedInvites.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-between text-sm">
          <span>You have {receivedInvites.length} pending group invite{receivedInvites.length > 1 ? 's' : ''}</span>
          <button onClick={() => setShowInvites(true)} className="font-medium hover:underline">View</button>
        </div>
      )}

      {/* Sub-header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <GroupSelector
            groups={groups}
            selectedId={selectedGroupId}
            onSelect={setSelectedGroupId}
            onCreateGroup={() => setShowCreateGroup(true)}
          />
          {selectedGroup && (
            <button
              onClick={() => setShowInvites(!showInvites)}
              className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-muted/20 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Invites
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} />
          {members.length > 0 && (
            <ViewToggle
              members={members}
              activeUid={activeView}
              onSelect={setActiveView}
            />
          )}
        </div>
      </div>

      {/* Create group modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-border rounded-lg p-6 w-full max-w-sm mx-4">
            <h2 className="font-semibold mb-4">Create Group</h2>
            <form onSubmit={handleCreateGroup}>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name"
                className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-accent"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup || !newGroupName.trim()}
                  className="px-4 py-2 text-sm rounded-md bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  {creatingGroup ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invites panel */}
      {showInvites && (
        <div className="mb-6 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Group Invites</h2>
            <button onClick={() => setShowInvites(false)} className="text-muted hover:text-foreground">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <InviteManager
            group={selectedGroup}
            sentInvites={sentInvites}
            receivedInvites={receivedInvites}
            userProfiles={userProfiles}
            onSendInvite={sendInvite}
            onRespond={respondToInvite}
          />
        </div>
      )}

      {/* No group yet */}
      {groups.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">📊</p>
          <h2 className="text-xl font-semibold mb-2">Welcome to Wealth Dashboard</h2>
          <p className="text-muted text-sm mb-6">Create a group to start tracking your investments.</p>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="px-6 py-2.5 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            Create your first group
          </button>
          <p className="text-xs text-muted mt-4">
            Don't forget to add your Trading212 API key in{' '}
            <a href="/settings" className="underline hover:text-foreground">Settings</a>
          </p>
        </div>
      )}

      {/* Content */}
      {groups.length > 0 && selectedGroup && (
        <div className="space-y-6">
          {viewData.error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {viewData.error}
            </div>
          )}

          {!viewData.error && memberData.every((m) => m.error === 'No API key set') && (
            <div className="p-4 rounded-lg bg-muted/10 border border-border text-sm">
              No Trading212 API keys configured for group members.{' '}
              <a href="/settings" className="underline">Add yours in Settings.</a>
            </div>
          )}

          <section>
            <h2 className="text-sm font-semibold text-muted mb-3 uppercase tracking-wide">Cash Summary</h2>
            <CashSummary cash={viewData.cash} loading={viewData.loading} rates={rates} displayCurrency={displayCurrency} />
          </section>

          <section>
            <h2 className="text-sm font-semibold text-muted mb-3 uppercase tracking-wide">Portfolio</h2>
            <div className="rounded-lg border border-border bg-background overflow-hidden">
              <PortfolioTable positions={viewData.portfolio} loading={viewData.loading} currencyMap={currencyMap} nameMap={nameMap} rates={rates} displayCurrency={displayCurrency} />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-muted mb-3 uppercase tracking-wide">Recent Transactions</h2>
            <div className="rounded-lg border border-border bg-background p-2">
              <TransactionList orders={viewData.orders} loading={viewData.loading} nameMap={nameMap} />
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
