import { useState } from 'react'
import type { Account, AccountInput, AccountType, Currency, Issuer } from '../types'
import { ISSUER_LABEL, ACCOUNT_TYPE_LABEL, ACCOUNT_TYPE_ICON } from '../types'

const ISSUERS: Issuer[] = ['hsbc', 'amex']
const ACCOUNT_TYPES: AccountType[] = ['bank', 'cc']
const CURRENCIES: Currency[] = ['GBP', 'USD', 'INR', 'EUR']

interface Props {
  initial?: Account
  onSave: (data: AccountInput) => Promise<void>
  onCancel: () => void
}

export function AccountForm({ initial, onSave, onCancel }: Props) {
  const [institution, setInstitution] = useState<Issuer>(initial?.institution ?? 'hsbc')
  const [type, setType] = useState<AccountType>(initial?.type ?? 'bank')
  const [last4, setLast4] = useState(initial?.last4 ?? '')
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'GBP')
  const [nickname, setNickname] = useState(initial?.nickname ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!initial

  const handleSave = async () => {
    if (!nickname.trim()) { setError('Nickname is required.'); return }
    if (!/^\d{4}$/.test(last4)) { setError('Last 4 digits required.'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({ institution, type, last4, currency, nickname: nickname.trim() })
    } catch (e) {
      setError(String(e))
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
      <div className="bg-background border border-border w-full sm:max-w-md max-h-[calc(90vh-4rem)] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">{isEdit ? 'Edit Account' : 'New Account'}</h2>
          <button onClick={onCancel} className="text-muted hover:text-foreground p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-muted font-medium mb-1 block">Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. HSBC Current"
              className="field"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-muted font-medium mb-2 block">Institution</label>
            <div className="flex gap-2">
              {ISSUERS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInstitution(i)}
                  className={`flex-1 px-3 py-2 text-xs border transition-colors ${
                    institution === i ? 'border-accent bg-accent/10 font-medium' : 'border-border hover:bg-muted/20'
                  }`}
                >
                  {ISSUER_LABEL[i]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted font-medium mb-2 block">Type</label>
            <div className="flex gap-2">
              {ACCOUNT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs border transition-colors ${
                    type === t ? 'border-accent bg-accent/10 font-medium' : 'border-border hover:bg-muted/20'
                  }`}
                >
                  <span>{ACCOUNT_TYPE_ICON[t]}</span>
                  {ACCOUNT_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted font-medium mb-1 block">Identifier digits</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="1234"
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
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="p-4 border-t border-border flex gap-3">
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
            disabled={saving || !nickname.trim() || !last4}
            className="flex-1 py-2.5 text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 font-medium"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
