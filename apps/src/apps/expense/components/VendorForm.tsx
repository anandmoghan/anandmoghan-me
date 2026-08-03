import { useState } from 'react'
import type { Vendor, VendorInput } from '../types'

const COLOR_OPTIONS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6b7280']
const CATEGORY_OPTIONS = ['groceries', 'transport', 'entertainment', 'eating-out', 'utilities', 'shopping', 'health', 'travel', 'subscriptions', 'income', 'other']

function prettifyCategory(c: string): string {
  return c.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join(' ')
}

interface Props {
  initial?: Vendor
  onSave: (data: VendorInput) => Promise<void>
  onDelete?: () => Promise<void>
  onCancel: () => void
}

export function VendorForm({ initial, onSave, onDelete, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [aliasesText, setAliasesText] = useState(initial?.aliases.join(', ') ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'shopping')
  const [color, setColor] = useState(initial?.color ?? COLOR_OPTIONS[0])
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!initial

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required.'); return }
    const aliases = aliasesText.split(',').map((a) => a.trim()).filter(Boolean)
    if (aliases.length === 0) { setError('Add at least one alias.'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({ name: name.trim(), aliases, category, color })
    } catch (e) {
      setError(String(e))
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
      <div className="bg-background border border-border w-full sm:max-w-md max-h-[calc(90vh-4rem)] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">{isEdit ? 'Edit Vendor' : 'New Vendor'}</h2>
          <button onClick={onCancel} className="text-muted hover:text-foreground p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-muted font-medium mb-1 block">Display name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Amazon"
              className="w-full text-sm border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-muted font-medium mb-1 block">
              Aliases <span className="text-muted">(comma-separated; matched against raw description)</span>
            </label>
            <input
              type="text"
              value={aliasesText}
              onChange={(e) => setAliasesText(e.target.value)}
              placeholder="AMAZON, AMZNMKTPLACE, AMZN"
              className="w-full text-sm border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent font-mono tabular-nums"
            />
          </div>

          <div>
            <label className="text-xs text-muted font-medium mb-2 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-sm border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent capitalize"
            >
              {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{prettifyCategory(c)}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted font-medium mb-2 block">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-offset-background ring-accent scale-110' : ''}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

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
              disabled={saving || !name.trim() || !aliasesText.trim()}
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
                await onDelete()
              }}
              className={`w-full py-2.5 text-sm transition-colors ${
                confirmDelete ? 'bg-destructive text-white font-medium' : 'text-destructive border border-destructive/30 hover:bg-destructive/10'
              }`}
            >
              {confirmDelete ? 'Confirm delete?' : 'Delete vendor'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
