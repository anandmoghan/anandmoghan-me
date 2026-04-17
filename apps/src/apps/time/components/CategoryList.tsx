import { useState } from 'react'
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
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Categories</h2>
        <button
          onClick={() => setShowForm(true)}
          className="text-sm text-accent hover:underline font-medium"
        >
          + New
        </button>
      </div>

      {active.length === 0 && archived.length === 0 && (
        <div className="text-center py-8 text-muted text-sm">
          <p className="text-2xl mb-2">📂</p>
          <p>No categories yet.</p>
          <p>Add one to start tracking time.</p>
        </div>
      )}

      <div className="space-y-2">
        {active.map(cat => (
          <CategoryRow
            key={cat.id}
            category={cat}
            onEdit={() => setEditTarget(cat)}
          />
        ))}
      </div>

      {archived.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-muted font-medium mb-2">Archived</p>
          <div className="space-y-2 opacity-60">
            {archived.map(cat => (
              <CategoryRow
                key={cat.id}
                category={cat}
                onEdit={() => setEditTarget(cat)}
              />
            ))}
          </div>
        </div>
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
    </div>
  )
}

function CategoryRow({ category, onEdit }: { category: Category; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between border border-border p-3">
      <div className="flex items-center gap-3">
        <span className="text-xl">{category.icon}</span>
        <div>
          <p className="text-sm font-medium">{category.name}</p>
          {category.budgets.length > 0 && (
            <p className="text-xs text-muted">
              {category.budgets.map(b =>
                `${b.kind === 't' ? b.value + 'h' : b.value + '×'} / ${b.window === 'd' ? 'day' : b.window === 'w' ? 'week' : 'month'}`
              ).join(', ')}
            </p>
          )}
        </div>
      </div>
      <button
        onClick={onEdit}
        className="text-xs text-muted hover:text-foreground px-2 py-1 border border-border hover:border-foreground/30 transition-colors"
      >
        Edit
      </button>
    </div>
  )
}
