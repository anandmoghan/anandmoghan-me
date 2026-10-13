'use client'

import { useState } from 'react'
import { useAuth } from '@/common/firebase/AuthProvider'
import { useAccounts } from '../hooks/useAccounts'
import { AccountForm } from '../components/AccountForm'
import { InlineSpinner } from '@/common/apps/components/Spinner'
import { ISSUER_LABEL, ACCOUNT_TYPE_ICON, ACCOUNT_TYPE_LABEL } from '../types'
import type { Account } from '../types'
import { detectAndApply } from '../services/applyTransfers'

export function ExpenseSettingsPage() {
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const { accounts, loading, addAccount, updateAccount, deleteAccount } = useAccounts(uid || undefined)

  const [showForm, setShowForm] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [rescanning, setRescanning] = useState(false)
  const [rescanResult, setRescanResult] = useState<string | null>(null)

  const handleRescan = async () => {
    if (!uid) return
    setRescanning(true)
    setRescanResult(null)
    try {
      const { pairs } = await detectAndApply(uid)
      setRescanResult(pairs === 0 ? 'No new transfers detected.' : `Linked ${pairs} new transfer pair${pairs === 1 ? '' : 's'}.`)
    } catch (e) {
      setRescanResult(`Error: ${e}`)
    } finally {
      setRescanning(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6">
        <InlineSpinner />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-4 space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Accounts</h2>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border hover:bg-muted/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add account
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border">
            <p className="text-3xl mb-2">🏦</p>
            <p className="text-sm font-medium mb-1">No accounts yet</p>
            <p className="text-xs text-muted">
              Add your bank accounts and credit cards so transactions can be linked to them.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {accounts.map((a) => (
              <div
                key={a.id}
                className="border border-border bg-background p-4 flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{ACCOUNT_TYPE_ICON[a.type]}</span>
                    <p className="text-sm font-semibold truncate">{a.nickname}</p>
                  </div>
                  <p className="text-xs text-muted">
                    {ISSUER_LABEL[a.institution]} · {ACCOUNT_TYPE_LABEL[a.type]} · ····{a.last4} · {a.currency}
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => setEditAccount(a)}
                    className="text-xs text-muted hover:text-foreground px-2 py-1 border border-border hover:bg-muted/20 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirmDelete === a.id) {
                        deleteAccount(a.id)
                        setConfirmDelete(null)
                      } else {
                        setConfirmDelete(a.id)
                      }
                    }}
                    className={`text-xs px-2 py-1 border transition-colors ${
                      confirmDelete === a.id
                        ? 'bg-destructive text-white border-destructive'
                        : 'text-destructive border-destructive/30 hover:bg-destructive/10'
                    }`}
                  >
                    {confirmDelete === a.id ? 'Confirm?' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Transfers</h2>
        <div className="border border-border bg-background p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Auto-link credit-card payments</p>
            <p className="text-xs text-muted">
              Detects pairs of opposite-sign transactions across accounts (e.g. paying your card from your bank).
            </p>
            {rescanResult && <p className="text-xs mt-1 text-success">{rescanResult}</p>}
          </div>
          <button
            onClick={handleRescan}
            disabled={rescanning}
            className="text-sm border border-border hover:bg-muted/20 px-3 py-1.5 transition-colors disabled:opacity-50 shrink-0"
          >
            {rescanning ? 'Scanning…' : 'Rescan'}
          </button>
        </div>
      </div>

      {showForm && (
        <AccountForm
          onSave={async (data) => {
            await addAccount(data)
            setShowForm(false)
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editAccount && (
        <AccountForm
          initial={editAccount}
          onSave={async (data) => {
            await updateAccount(editAccount.id, data)
            setEditAccount(null)
          }}
          onCancel={() => setEditAccount(null)}
        />
      )}
    </div>
  )
}
