import {
  doc,
  collection,
  runTransaction,
  updateDoc,
  deleteField,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '../../../firebase'
import { categoryFromWire, categoryToWire } from '../schema'
import type { WireCategory } from '../schema'
import type { Category } from '../types'

/** Creates a new category using a transaction to increment _meta.next. */
export async function createCategory(
  uid: string,
  data: Omit<Category, 'id'>,
): Promise<string> {
  const metaRef = doc(db, 'users', uid, 'categories', '_meta')
  let cid = ''
  await runTransaction(db, async (tx) => {
    const metaSnap = await tx.get(metaRef)
    const next: number = metaSnap.exists() ? (metaSnap.data().next ?? 1) : 1
    cid = `c${next}`
    const catRef = doc(db, 'users', uid, 'categories', cid)
    tx.set(catRef, categoryToWire(data))
    tx.set(metaRef, { next: next + 1 }, { merge: true })
  })
  return cid
}

/** Updates an existing category. */
export async function updateCategory(
  uid: string,
  cid: string,
  data: Partial<Omit<Category, 'id'>>,
): Promise<void> {
  const ref = doc(db, 'users', uid, 'categories', cid)
  const wire: Partial<WireCategory> = {}
  if (data.name !== undefined) wire.n = data.name
  if (data.icon !== undefined) wire.i = data.icon
  if (data.budgets !== undefined) wire.b = data.budgets.map(b => ({ k: b.kind, v: b.value, w: b.window }))
  if (data.minDuration !== undefined) {
    wire.m = data.minDuration
  } else if ('minDuration' in data) {
    // minDuration explicitly cleared — remove from Firestore
    (wire as Record<string, unknown>).m = deleteField()
  }
  if (data.archived !== undefined) wire.a = data.archived
  if (data.order !== undefined) wire.o = data.order
  await updateDoc(ref, wire as Record<string, unknown>)
}

/** Soft-deletes a category by setting a: true. */
export async function archiveCategory(uid: string, cid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'categories', cid), { a: true })
}

/** Restores an archived category. */
export async function unarchiveCategory(uid: string, cid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'categories', cid), { a: false })
}

/** Returns { categories: Category[], categoryMap: Record<cid, Category> } from a snapshot. */
export function parseCategorySnapshot(
  docs: Array<{ id: string; data: () => unknown }>,
): { categories: Category[]; categoryMap: Record<string, Category> } {
  const categoryMap: Record<string, Category> = {}
  const categories: Category[] = []
  for (const d of docs) {
    if (d.id === '_meta') continue
    const cat = categoryFromWire(d.id, d.data() as WireCategory)
    categoryMap[cat.id] = cat
    categories.push(cat)
  }
  categories.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
  return { categories, categoryMap }
}

// Re-export for convenience
export { onSnapshot, collection, doc }
