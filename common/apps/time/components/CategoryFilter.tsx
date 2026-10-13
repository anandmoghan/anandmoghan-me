'use client'

import type { Category } from '../types'

interface CategoryFilterProps {
  categories: Category[]
  selectedId: string | null   // null = all
  onChange: (id: string | null) => void
}

export function CategoryFilter({ categories, selectedId, onChange }: CategoryFilterProps) {
  if (categories.length === 0) return null

  return (
    <div className="flex justify-center flex-wrap gap-1.5 px-4">
      <button
        onClick={() => onChange(null)}
        className={`shrink-0 px-3 py-1 text-xs font-medium transition-colors border ${
          selectedId === null
            ? 'border-foreground text-foreground'
            : 'border-border text-muted hover:border-foreground/40 hover:text-foreground'
        }`}
      >
        All
      </button>
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1 text-xs font-medium transition-colors border ${
            selectedId === cat.id
              ? 'border-foreground text-foreground'
              : 'border-border text-muted hover:border-foreground/40 hover:text-foreground'
          }`}
        >
          <span>{cat.icon}</span>
          <span>{cat.name}</span>
        </button>
      ))}
    </div>
  )
}
