import { useState } from 'react'
import type { Account, Transaction, TransactionInput, Currency, Vendor } from '../types'

const CURRENCIES: Currency[] = ['GBP', 'USD', 'INR', 'EUR']

interface Props {
  initial?: Transaction
  accounts: Account[]
  vendors?: Vendor[]
  defaultAccountId?: string
  onSave: (data: TransactionInput & { vendorId?: string | null }) => Promise<void>
  onDelete?: () => Promise<void>
  onUnlinkTransfer?: () => Promise<void>
  onCancel: () => void
}

export function TransactionForm({ initial, accounts, vendors = [], defaultAccountId, onSave, onDelete, onUnlinkTransfer, onCancel }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [accountId, setAccountId] = useState(initial?.accountId ?? defaultAccountId ?? accounts[0]?.id ?? '')
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10))
  const [direction, setDirection] = useState<'out' | 'in'>(initial ? (initial.amount < 0 ? 'out' : 'in') : 'out')
  const [amount, setAmount] = useState(initial ? Math.abs(initial.amount).toString() : '')
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? accounts.find(a => a.id === accountId)?.currency ?? 'GBP')
  const [description, setDescription] = useState(initial?.rawDescription ?? '')
  const [vendorName, setVendorName] = useState(initial?.vendorName ?? '')
  const [vendorId, setVendorId] = useState<string | ''>(initial?.vendorId ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!initial

  const handleAccountChange = (id: string) => {
    setAccountId(id)
    if (!isEdit) {
      const acc = accounts.find(a => a.id === id)
      if (acc) setCurrency(acc.currency)
    }
  }

  const handleSave = async () => {
    if (!accountId) { setError('Choose an account.'); return }
    if (!description.trim()) { setError('Description is required.'); return }
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) { setError('Amount must be positive.'); return }
    setSaving(true)
    setError('')
    try {
      const signed = direction === 'out' ? -num : num
      await onSave({
        accountId,
        date,
        amount: signed,
        currency,
        rawDescription: description.trim(),
        vendorName: vendorName.trim() || undefined,
        vendorId: vendorId || null,
      })
    } catch (e) {
      setError(String(e))
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
      <div className="bg-background border border-border w-full sm:max-w-md max-h-[calc(90vh-4rem)] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">{isEdit ? 'Edit Transaction' : 'New Transaction'}</h2>
          <button onClick={onCancel} className="text-muted hover:text-foreground p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-muted font-medium mb-1 block">Account</label>
            <select
              value={accountId}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="field"
            >
              {accounts.length === 0 && <option value="">— No accounts —</option>}
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.nickname} (····{a.last4})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted font-medium mb-2 block">Direction</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDirection('out')}
                className={`flex-1 px-3 py-2 text-xs border transition-colors ${
                  direction === 'out' ? 'border-destructive bg-destructive/10 text-destructive font-medium' : 'border-border hover:bg-muted/20'
                }`}
              >
                Money out
              </button>
              <button
                type="button"
                onClick={() => setDirection('in')}
                className={`flex-1 px-3 py-2 text-xs border transition-colors ${
                  direction === 'in' ? 'border-success bg-success/10 text-success font-medium' : 'border-border hover:bg-muted/20'
                }`}
              >
                Money in
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-muted font-medium mb-1 block">Amount</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="field tabular-nums"
              />
            </div>
            <div>
              <label className="text-xs text-muted font-medium mb-1 block">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="field"
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted font-medium mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label className="text-xs text-muted font-medium mb-1 block">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. AMZN MKTPLACE"
              className="field"
            />
          </div>

          <div>
            <label className="text-xs text-muted font-medium mb-1 block">Vendor (display name, optional)</label>
            <input
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="e.g. Amazon"
              className="field"
            />
          </div>

          {vendors.length > 0 && (
            <div>
              <label className="text-xs text-muted font-medium mb-1 block">Link to vendor</label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="field"
              >
                <option value="">— None —</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          )}

          {initial?.transferGroupId && onUnlinkTransfer && (
            <div className="border border-border bg-muted/5 px-3 py-2 flex items-center justify-between gap-3 text-xs">
              <span className="text-muted">
                ↔ Linked to a transfer pair (excluded from spend totals).
              </span>
              <button
                type="button"
                onClick={async () => {
                  setUnlinking(true)
                  try { await onUnlinkTransfer() } finally { setUnlinking(false) }
                }}
                disabled={unlinking}
                className="text-xs text-destructive border border-destructive/30 hover:bg-destructive/10 px-2 py-1 transition-colors disabled:opacity-50 shrink-0"
              >
                {unlinking ? 'Unlinking…' : 'Unlink'}
              </button>
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="p-4 border-t border-border space-y-2">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 text-sm border border-border hover:bg-muted/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !accountId || !description.trim() || !amount}
              className="flex-1 py-2.5 text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 font-medium"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={async () => {
                if (!confirmDelete) { setConfirmDelete(true); return }
                setDeleting(true)
                try { await onDelete() } catch (e) { setError(String(e)); setDeleting(false); setConfirmDelete(false) }
              }}
              disabled={deleting}
              className={`w-full py-2.5 text-sm transition-colors disabled:opacity-50 ${
                confirmDelete
                  ? 'bg-destructive text-white font-medium'
                  : 'text-destructive border border-destructive/30 hover:bg-destructive/10'
              }`}
            >
              {deleting ? 'Deleting…' : confirmDelete ? 'Confirm delete?' : 'Delete transaction'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
