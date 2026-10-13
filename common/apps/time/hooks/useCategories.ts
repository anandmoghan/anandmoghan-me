'use client'

import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { getDb } from '@/common/firebase/client'
import { categoryFromWire } from '../schema'
import type { WireCategory } from '../schema'
import type { Category } from '../types'

interface UseCategoriesResult {
  categories: Category[]          // non-archived, sorted by order
  allCategories: Category[]       // including archived
  categoryMap: Record<string, Category>
  loading: boolean
}

export function useCategories(uid: string | undefined): UseCategoriesResult {
  const [categoryMap, setCategoryMap] = useState<Record<string, Category>>({})
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setCategoryMap({})
      setAllCategories([])
      setLoading(false)
      return
    }

    const ref = collection(getDb(), 'time', uid, 'categories')
    const unsub = onSnapshot(ref, (snap) => {
      const map: Record<string, Category> = {}
      const all: Category[] = []
      for (const d of snap.docs) {
        if (d.id === '_meta') continue
        const cat = categoryFromWire(d.id, d.data() as WireCategory)
        map[cat.id] = cat
        all.push(cat)
      }
      all.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      setCategoryMap(map)
      setAllCategories(all)
      setLoading(false)
    })

    return unsub
  }, [uid])

  const categories = allCategories.filter(c => !c.archived)

  return { categories, allCategories, categoryMap, loading }
}
