'use client'

import { useState } from 'react'
import { useAuth } from '@/common/firebase/AuthProvider'
import { useAccounts } from '../hooks/useAccounts'
import { AccountForm } from '../components/AccountForm'
import { InlineSpinner } from '@/common/apps/components/Spinner'
import { ISSUER_LABEL, ACCOUNT_TYPE_ICON, ACCOUNT_TYPE_LABEL } from '../types'
import type { Account } from '../types'
import { SettingsCard, SettingsRow } from '@/common/apps/components/SettingsRows'
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
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-4 space-y-8">
      <SettingsCard title="Accounts">
        {accounts.length === 0 && (
          <SettingsRow
            label="No accounts yet"
            description="Add your bank accounts and credit cards so transactions can be linked to them."
          />
        )}
        {accounts.map((a) => (
          <SettingsRow
            key={a.id}
            leading={ACCOUNT_TYPE_ICON[a.type]}
            label={a.nickname}
            description={`${ISSUER_LABEL[a.institution]} · ${ACCOUNT_TYPE_LABEL[a.type]} · ····${a.last4} · ${a.currency}`}
          >
            <button type="button" onClick={() => setEditAccount(a)} className="btn btn--sm">
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirmDelete === a.id) {
                  deleteAccount(a.id)
                  setConfirmDelete(null)
                } else {
                  setConfirmDelete(a.id)
                }
              }}
              className={`btn btn--sm${confirmDelete === a.id ? ' btn--danger' : ''}`}
            >
              {confirmDelete === a.id ? 'Confirm?' : 'Delete'}
            </button>
          </SettingsRow>
        ))}
        <SettingsRow label="Add an account" description="Bank account, credit card or wallet.">
          <button type="button" onClick={() => setShowForm(true)} className="btn btn--sm btn--primary">
            Add account
          </button>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Transfers">
        <SettingsRow
          label="Auto-link credit-card payments"
          description="Detects pairs of opposite-sign transactions across accounts (e.g. paying your card from your bank)."
        >
          <button type="button" onClick={handleRescan} disabled={rescanning} className="btn btn--sm">
            {rescanning ? 'Scanning…' : 'Rescan'}
          </button>
        </SettingsRow>
        {rescanResult && (
          <p className="settings-row text-sm text-success" role="status">
            {rescanResult}
          </p>
        )}
      </SettingsCard>

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
