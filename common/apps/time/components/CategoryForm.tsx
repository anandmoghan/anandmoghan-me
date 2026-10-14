'use client'

import { useState } from 'react'
import type { Category, Budget, BudgetKind, BudgetWindow } from '../types'
import { WINDOW_LABELS, BUDGET_KIND_LABELS } from '../constants'

interface CategoryFormProps {
  initial?: Partial<Category>
  onSave: (data: Omit<Category, 'id'>) => Promise<void>
  onCancel: () => void
  isEdit?: boolean
}

const defaultBudget = (): Budget => ({ kind: 't', value: 1, window: 'w' })

export function CategoryForm({ initial, onSave, onCancel, isEdit }: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? '')
  const [budgets, setBudgets] = useState<Budget[]>(initial?.budgets ?? [])
  const [minMins, setMinMins] = useState(
    initial?.minDuration ? String(Math.round(initial.minDuration / 60)) : ''
  )
  const [archived, setArchived] = useState(initial?.archived ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({
        name: name.trim(),
        icon: icon.trim() || '📌',
        budgets,
        minDuration: minMins ? parseInt(minMins, 10) * 60 : undefined,
        archived,
        order: initial?.order ?? 0,
      })
    } catch (e) {
      setError(String(e))
      setSaving(false)
    }
  }

  const updateBudget = (i: number, patch: Partial<Budget>) => {
    setBudgets(prev => prev.map((b, idx) => idx === i ? { ...b, ...patch } : b))
  }

  const removeBudget = (i: number) => {
    setBudgets(prev => prev.filter((_, idx) => idx !== i))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
      <div className="bg-background border border-border w-full sm:max-w-md max-h-[calc(90vh-4rem)] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">{isEdit ? 'Edit Category' : 'New Category'}</h2>
          <button onClick={onCancel} className="text-muted hover:text-foreground p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Icon — centered circle at top */}
          <div className="flex flex-col items-center gap-1 pt-1">
            <div className="relative">
              <input
                type="text"
                value={icon}
                onChange={e => setIcon(e.target.value)}
                placeholder="📌"
                className="w-20 h-20 rounded-full border-2 border-border bg-background focus:outline-none focus:border-accent text-center text-3xl cursor-text"
                maxLength={4}
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs text-muted font-medium mb-1 block">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Work"
              className="field"
              autoFocus
            />
          </div>

          {/* Min duration */}
          <div>
            <label className="text-xs text-muted font-medium mb-1 block">
              Min session duration (minutes, optional)
            </label>
            <input
              type="number"
              value={minMins}
              onChange={e => setMinMins(e.target.value)}
              placeholder="e.g. 5"
              min="1"
              className="field"
            />
            <p className="text-xs text-muted mt-1">Sessions shorter than this are discarded at close time.</p>
          </div>

          {/* Budgets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted font-medium">Budgets</label>
              <button
                type="button"
                onClick={() => setBudgets(prev => [...prev, defaultBudget()])}
                className="text-xs text-accent hover:underline"
              >
                + Add budget
              </button>
            </div>
            <div className="space-y-2">
              {budgets.map((budget, i) => (
                <div key={i} className="flex items-center gap-2 border border-border p-2">
                  <select
                    value={budget.kind}
                    onChange={e => updateBudget(i, { kind: e.target.value as BudgetKind })}
                    className="text-xs border border-border bg-background px-2 py-1 focus:outline-none"
                  >
                    {Object.entries(BUDGET_KIND_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={budget.value}
                    onChange={e => updateBudget(i, { value: parseFloat(e.target.value) || 0 })}
                    min="0.1"
                    step="0.5"
                    className="w-16 text-xs border border-border bg-background px-2 py-1 focus:outline-none text-center"
                  />
                  <span className="text-xs text-muted">{budget.kind === 't' ? 'h' : '×'}</span>
                  <select
                    value={budget.window}
                    onChange={e => updateBudget(i, { window: e.target.value as BudgetWindow })}
                    className="text-xs border border-border bg-background px-2 py-1 focus:outline-none"
                  >
                    {Object.entries(WINDOW_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeBudget(i)}
                    className="ml-auto text-muted hover:text-destructive transition-colors p-0.5"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Archived toggle (edit mode only) */}
          {isEdit && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={archived}
                onChange={e => setArchived(e.target.checked)}
                className="w-4 h-4 rounded border-border"
              />
              <span className="text-sm text-foreground">Archived (hidden from home grid)</span>
            </label>
          )}

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
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
            disabled={saving || !name.trim()}
            className="flex-1 py-2.5 text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 font-medium"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
