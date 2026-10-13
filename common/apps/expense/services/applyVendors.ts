import { collection, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore'
import { getDb } from '@/common/firebase/client'
import { transactionFromWire, vendorFromWire, type WireTransaction, type WireVendor } from '../types'
import { matchVendor, shouldAssign } from './vendorMatch'
import { normalizeDescription, brandFromNormalized } from './normalizeDescription'

const VENDOR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6b7280']

const BATCH_LIMIT = 500

/**
 * Reads all vendors and transactions, finds vendor matches for every
 * transaction with no manual override, and writes vendorId to each match.
 * Returns the number of transactions that were tagged.
 */
export async function detectAndApplyVendors(uid: string): Promise<{ tagged: number }> {
  if (!uid) throw new Error('Not authenticated')
  const [vendorSnap, txSnap] = await Promise.all([
    getDocs(collection(getDb(), 'expense', uid, 'vendors')),
    getDocs(collection(getDb(), 'expense', uid, 'transactions')),
  ])
  const vendors = vendorSnap.docs.map((d) => vendorFromWire(d.id, d.data() as WireVendor))
  if (vendors.length === 0) return { tagged: 0 }
  const transactions = txSnap.docs.map((d) => transactionFromWire(d.id, d.data() as WireTransaction))

  const updates: { id: string; vendorId: string; vendorName: string }[] = []
  for (const tx of transactions) {
    if (!shouldAssign(tx)) continue
    const match = matchVendor(tx.rawDescription, vendors)
    if (!match) continue
    if (tx.vendorId === match.id) continue
    updates.push({ id: tx.id, vendorId: match.id, vendorName: match.name })
  }

  if (updates.length === 0) return { tagged: 0 }

  for (let i = 0; i < updates.length; i += BATCH_LIMIT) {
    const slice = updates.slice(i, i + BATCH_LIMIT)
    const batch = writeBatch(getDb())
    for (const u of slice) {
      batch.update(doc(getDb(), 'expense', uid, 'transactions', u.id), {
        vId: u.vendorId,
        vn: u.vendorName,
        ua: serverTimestamp(),
      })
    }
    await batch.commit()
  }
  return { tagged: updates.length }
}

/**
 * Auto-creates vendors for any unmatched, non-transfer transactions, then
 * assigns them. The brand is the first few alphabetic tokens of the
 * normalised description; we use that uppercased as the alias and title-cased
 * as the display name. Subsequent transactions matching the same brand are
 * pulled into the same vendor.
 */
export async function autoCreateVendors(uid: string): Promise<{ created: number; tagged: number }> {
  if (!uid) throw new Error('Not authenticated')
  const [vendorSnap, txSnap] = await Promise.all([
    getDocs(collection(getDb(), 'expense', uid, 'vendors')),
    getDocs(collection(getDb(), 'expense', uid, 'transactions')),
  ])
  const vendors = vendorSnap.docs.map((d) => vendorFromWire(d.id, d.data() as WireVendor))
  const transactions = txSnap.docs.map((d) => transactionFromWire(d.id, d.data() as WireTransaction))

  // Map of existing aliases (upper case) → vendor doc id.
  const aliasIndex = new Map<string, string>()
  for (const v of vendors) {
    for (const a of v.aliases) aliasIndex.set(a.toUpperCase(), v.id)
  }

  const buckets = new Map<string, { displayName: string; alias: string; txIds: string[] }>()
  for (const tx of transactions) {
    if (tx.transferGroupId) continue
    if (tx.vendorId) continue
    if (tx.userOverrides.vendorId) continue
    const normalized = normalizeDescription(tx.rawDescription)
    const brand = brandFromNormalized(normalized)
    if (!brand || brand.length < 2) continue
    const alias = brand.toUpperCase()
    if (aliasIndex.has(alias)) continue
    const bucket = buckets.get(alias) ?? { displayName: brand, alias, txIds: [] }
    bucket.txIds.push(tx.id)
    buckets.set(alias, bucket)
  }

  if (buckets.size === 0) return { created: 0, tagged: 0 }

  let created = 0
  let tagged = 0
  let colorIdx = vendors.length
  for (const bucket of buckets.values()) {
    const vendorRef = doc(collection(getDb(), 'expense', uid, 'vendors'))
    const batch = writeBatch(getDb())
    batch.set(vendorRef, {
      n: bucket.displayName,
      a: [bucket.alias],
      cat: 'other',
      col: VENDOR_COLORS[colorIdx % VENDOR_COLORS.length],
      ca: serverTimestamp(),
      ua: serverTimestamp(),
    })
    colorIdx++
    for (const txId of bucket.txIds) {
      batch.update(doc(getDb(), 'expense', uid, 'transactions', txId), {
        vId: vendorRef.id,
        vn: bucket.displayName,
        ua: serverTimestamp(),
      })
    }
    await batch.commit()
    created++
    tagged += bucket.txIds.length
  }
  return { created, tagged }
}
