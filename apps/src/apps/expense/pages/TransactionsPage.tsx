import { useState, useMemo } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { useAccounts } from '../hooks/useAccounts'
import { useVendors } from '../hooks/useVendors'
import { useTransactions, useFilteredTransactions, type TxFilter } from '../hooks/useTransactions'
import { TransactionForm } from '../components/TransactionForm'
import { InlineSpinner } from '../../../components/Spinner'
import { fmt, fmtDateShort } from '../services/format'
import { ACCOUNT_TYPE_ICON } from '../types'
import { unlinkTransfer } from '../services/applyTransfers'
import type { Transaction } from '../types'

export function TransactionsPage() {
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const { accounts, loading: accountsLoading } = useAccounts(uid || undefined)
  const { vendors } = useVendors(uid || undefined)
  const { transactions, loading: txLoading, addTransaction, updateTransaction, deleteTransaction } = useTransactions(uid || undefined)

  const [showForm, setShowForm] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [accountFilter, setAccountFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [groupingFilter, setGroupingFilter] = useState<'all' | 'needs' | 'transfers'>('all')

  const filter: TxFilter = useMemo(() => ({
    accountId: accountFilter || undefined,
    query: searchQuery || undefined,
    vendorId: groupingFilter === 'needs' ? null : undefined,
    transfersOnly: groupingFilter === 'transfers',
  }), [accountFilter, searchQuery, groupingFilter])

  const filtered = useFilteredTransactions(transactions, filter)
  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts])

  const loading = accountsLoading || txLoading

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6">
        <InlineSpinner />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Transactions</h2>
          <p className="text-xs text-muted mt-0.5">{filtered.length} of {transactions.length}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={accounts.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border hover:bg-muted/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={accounts.length === 0 ? 'Add an account first' : ''}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search description or vendor"
          className="text-xs border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent flex-1 min-w-[180px]"
        />
        <select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          className="text-xs border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">All accounts</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.nickname}</option>
          ))}
        </select>
        <div className="flex border border-border overflow-hidden text-[10px]">
          {(['all', 'needs', 'transfers'] as const).map((g, i) => (
            <button
              key={g}
              onClick={() => setGroupingFilter(g)}
              className={`px-2.5 py-1.5 capitalize transition-colors ${
                groupingFilter === g ? 'bg-foreground text-background font-medium' : 'hover:bg-muted/20'
              } ${i > 0 ? 'border-l border-border' : ''}`}
            >
              {g === 'needs' ? 'Needs grouping' : g === 'transfers' ? 'Transfers' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {accounts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🏦</p>
          <h2 className="text-lg font-semibold mb-2">Add an account first</h2>
          <p className="text-muted text-sm mb-6">
            Bank accounts and credit cards live in Settings. Once added, you can record transactions here.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🧾</p>
          <h2 className="text-lg font-semibold mb-2">
            {transactions.length === 0 ? 'No transactions' : 'No matches'}
          </h2>
          <p className="text-muted text-sm">
            {transactions.length === 0
              ? 'Add transactions manually or upload a statement.'
              : 'Adjust the filters to see more.'}
          </p>
        </div>
      ) : (
        <div className="border border-border bg-background overflow-hidden">
          {filtered.map((t, i) => {
            const acc = accountMap.get(t.accountId)
            const isOut = t.amount < 0
            return (
              <button
                key={t.id}
                onClick={() => setEditTx(t)}
                className={`w-full text-left flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/10 transition-colors ${
                  i > 0 ? 'border-t border-border' : ''
                }`}
              >
                <div className="min-w-0 flex-1 flex items-center gap-3">
                  <div className="text-xs text-muted tabular-nums w-14 shrink-0">
                    {fmtDateShort(t.date)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{t.vendorName || t.rawDescription}</p>
                    <p className="text-xs text-muted truncate">
                      {acc ? `${ACCOUNT_TYPE_ICON[acc.type]} ${acc.nickname}` : 'Unknown account'}
                      {t.transferGroupId && ' · ↔ Transfer'}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold tabular-nums ${isOut ? 'text-foreground' : 'text-success'}`}>
                    {isOut ? '−' : '+'}{fmt(Math.abs(t.amount), t.currency)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {showForm && (
        <TransactionForm
          accounts={accounts}
          vendors={vendors}
          defaultAccountId={accountFilter || undefined}
          onSave={async (data) => {
            await addTransaction(data)
            setShowForm(false)
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editTx && (
        <TransactionForm
          initial={editTx}
          accounts={accounts}
          vendors={vendors}
          onSave={async (data) => {
            const vendorChanged = data.vendorId !== (editTx.vendorId ?? null)
            const matchedVendor = data.vendorId ? vendors.find(v => v.id === data.vendorId) : null
            await updateTransaction(editTx.id, {
              ...data,
              vendorName: matchedVendor ? matchedVendor.name : data.vendorName,
              userOverrides: vendorChanged ? { vendorId: true, vendorName: !!data.vendorName } : undefined,
            })
            setEditTx(null)
          }}
          onDelete={async () => {
            await deleteTransaction(editTx.id)
            setEditTx(null)
          }}
          onUnlinkTransfer={editTx.transferGroupId ? async () => {
            await unlinkTransfer(uid, editTx.id, editTx.transferGroupId!)
            setEditTx(null)
          } : undefined}
          onCancel={() => setEditTx(null)}
        />
      )}
    </div>
  )
}
