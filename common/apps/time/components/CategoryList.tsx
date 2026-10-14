'use client'

import { useState } from 'react'
import { SettingsCard, SettingsRow } from '@/common/apps/components/SettingsRows'
import { CategoryForm } from './CategoryForm'
import { createCategory, updateCategory } from '../services/categories'
import type { Category } from '../types'

interface CategoryListProps {
  uid: string
  categories: Category[]  // all categories including archived
}

export function CategoryList({ uid, categories }: CategoryListProps) {
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Category | null>(null)

  const handleCreate = async (data: Omit<Category, 'id'>) => {
    await createCategory(uid, { ...data, order: categories.filter(c => !c.archived).length })
    setShowForm(false)
  }

  const handleEdit = async (data: Omit<Category, 'id'>) => {
    if (!editTarget) return
    await updateCategory(uid, editTarget.id, data)
    setEditTarget(null)
  }

  const active = categories.filter(c => !c.archived)
  const archived = categories.filter(c => c.archived)

  return (
    <>
      <SettingsCard title="Categories">
        {active.length === 0 && (
          <SettingsRow label="No categories yet" description="Add one to start tracking time." />
        )}
        {active.map(cat => (
          <CategoryRow key={cat.id} category={cat} onEdit={() => setEditTarget(cat)} />
        ))}
        <SettingsRow label="Add a category" description="Name, icon and optional budgets.">
          <button type="button" onClick={() => setShowForm(true)} className="btn btn--sm btn--primary">
            Add category
          </button>
        </SettingsRow>
      </SettingsCard>

      {archived.length > 0 && (
        <SettingsCard title="Archived categories">
          {archived.map(cat => (
            <CategoryRow key={cat.id} category={cat} onEdit={() => setEditTarget(cat)} />
          ))}
        </SettingsCard>
      )}

      {showForm && (
        <CategoryForm
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editTarget && (
        <CategoryForm
          initial={editTarget}
          onSave={handleEdit}
          onCancel={() => setEditTarget(null)}
          isEdit
        />
      )}
    </>
  )
}

function CategoryRow({ category, onEdit }: { category: Category; onEdit: () => void }) {
  const budgets = category.budgets
    .map(b => `${b.kind === 't' ? b.value + 'h' : b.value + '×'} / ${b.window === 'd' ? 'day' : b.window === 'w' ? 'week' : 'month'}`)
    .join(', ')
  return (
    <SettingsRow label={category.name} leading={category.icon} description={budgets || undefined}>
      <button type="button" onClick={onEdit} className="btn btn--sm">
        Edit
      </button>
    </SettingsRow>
  )
}
