import { writeBatch, doc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../../firebase'
import { transactionFromWire, accountFromWire, type WireAccount, type WireTransaction } from '../types'
import { detectTransfers, type TransferCandidate } from './transferDetect'

const FIRESTORE_BATCH_LIMIT = 500

/**
 * Writes transferGroupId on each transaction in each candidate pair.
 * Uses crypto.randomUUID() to generate a fresh group id per pair.
 */
export async function applyTransfers(uid: string, candidates: TransferCandidate[]): Promise<number> {
  if (!uid) throw new Error('Not authenticated')
  let written = 0
  for (let i = 0; i < candidates.length; i += FIRESTORE_BATCH_LIMIT / 2) {
    const slice = candidates.slice(i, i + FIRESTORE_BATCH_LIMIT / 2)
    const batch = writeBatch(db)
    for (const c of slice) {
      const groupId = crypto.randomUUID()
      batch.update(doc(db, 'expense', uid, 'transactions', c.a.id), {
        tg: groupId,
        ua: serverTimestamp(),
      })
      batch.update(doc(db, 'expense', uid, 'transactions', c.b.id), {
        tg: groupId,
        ua: serverTimestamp(),
      })
      written += 2
    }
    await batch.commit()
  }
  return written
}

/** Reads the latest accounts and transactions, runs detection, and applies any new groups. */
export async function detectAndApply(uid: string): Promise<{ pairs: number }> {
  const [accSnap, txSnap] = await Promise.all([
    getDocs(collection(db, 'expense', uid, 'accounts')),
    getDocs(collection(db, 'expense', uid, 'transactions')),
  ])
  const accounts = accSnap.docs.map((d) => accountFromWire(d.id, d.data() as WireAccount))
  const transactions = txSnap.docs.map((d) => transactionFromWire(d.id, d.data() as WireTransaction))
  const candidates = detectTransfers(transactions, accounts)
  if (candidates.length === 0) return { pairs: 0 }
  await applyTransfers(uid, candidates)
  return { pairs: candidates.length }
}

/** Removes the transferGroupId from a single transaction (and its peer if found). */
export async function unlinkTransfer(uid: string, transactionId: string, transferGroupId: string): Promise<void> {
  if (!uid) throw new Error('Not authenticated')
  const peers = await getDocs(query(
    collection(db, 'expense', uid, 'transactions'),
    where('tg', '==', transferGroupId)
  ))
  const batch = writeBatch(db)
  for (const d of peers.docs) {
    batch.update(d.ref, { tg: null, ua: serverTimestamp() })
  }
  // Defensive: also clear the requested tx in case the index is stale.
  batch.update(doc(db, 'expense', uid, 'transactions', transactionId), { tg: null, ua: serverTimestamp() })
  await batch.commit()
}
