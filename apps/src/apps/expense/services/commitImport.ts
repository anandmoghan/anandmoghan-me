import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore'
import { db } from '../../../firebase'
import type { ParsedStatement, ParsedTransaction } from '../parsers/types'
import type { Account, AccountInput, WireAccount, WireStatement, WireTransaction } from '../types'
import { accountFromWire, accountInputToWire } from '../types'
import { detectAndApply } from './applyTransfers'
import { detectAndApplyVendors, autoCreateVendors } from './applyVendors'

const FIRESTORE_BATCH_LIMIT = 500

export interface ImportPlan {
  parsed: ParsedStatement
  fileHash: string
  fileName: string
  /** Existing account that matches the statement, or null if a new one will be created. */
  matchedAccount: Account | null
  /** When matchedAccount is null, this is the input used to create the new account. */
  newAccountInput: AccountInput | null
}

/** Looks for an account that matches the statement by issuer, type, and last4. */
export async function findMatchingAccount(uid: string, parsed: ParsedStatement): Promise<Account | null> {
  const q = query(
    collection(db, 'expense', uid, 'accounts'),
    where('i', '==', parsed.issuer),
    where('t', '==', parsed.accountType),
    where('l4', '==', parsed.accountIdentifier)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return accountFromWire(d.id, d.data() as WireAccount)
}

/** Suggests a default nickname for a brand-new account derived from the statement. */
export function defaultNickname(parsed: ParsedStatement): string {
  const issuerName = parsed.issuer === 'amex' ? 'American Express' : 'HSBC'
  const typeName = parsed.accountType === 'cc' ? 'Credit Card' : 'Account'
  return `${issuerName} ${typeName} ····${parsed.accountIdentifier}`
}

export async function commitImport(uid: string, plan: ImportPlan): Promise<{ statementId: string; accountId: string; txCount: number; transfersLinked: number }> {
  if (!uid) throw new Error('Not authenticated')

  // 1. Resolve account (create if necessary).
  let accountId: string
  if (plan.matchedAccount) {
    accountId = plan.matchedAccount.id
  } else {
    if (!plan.newAccountInput) throw new Error('No account match and no new account input provided')
    const newAccountRef = doc(collection(db, 'expense', uid, 'accounts'))
    const setupBatch = writeBatch(db)
    setupBatch.set(newAccountRef, {
      ...accountInputToWire(plan.newAccountInput),
      ca: serverTimestamp(),
      ua: serverTimestamp(),
    } satisfies WireAccount)
    await setupBatch.commit()
    accountId = newAccountRef.id
  }

  // 2. Create statement doc.
  const statementRef = doc(collection(db, 'expense', uid, 'statements'))
  const statementBatch = writeBatch(db)
  statementBatch.set(statementRef, {
    aId: accountId,
    h: plan.fileHash,
    ps: plan.parsed.periodStart,
    pe: plan.parsed.periodEnd,
    iss: plan.parsed.issuer,
    tc: plan.parsed.transactions.length,
    ia: serverTimestamp(),
  } satisfies WireStatement)
  await statementBatch.commit()

  // 3. Insert transactions in chunked batches.
  const txns = plan.parsed.transactions
  for (let i = 0; i < txns.length; i += FIRESTORE_BATCH_LIMIT) {
    const slice = txns.slice(i, i + FIRESTORE_BATCH_LIMIT)
    const batch = writeBatch(db)
    for (const tx of slice) {
      const ref = doc(collection(db, 'expense', uid, 'transactions'))
      batch.set(ref, txToWire(statementRef.id, accountId, tx, plan.parsed))
    }
    await batch.commit()
  }

  // Auto-link transfers first (so transfer txs are excluded from vendor creation),
  // then tag against existing vendors, then auto-create vendors for the remainder.
  const { pairs } = await detectAndApply(uid)
  await detectAndApplyVendors(uid)
  await autoCreateVendors(uid)

  return { statementId: statementRef.id, accountId, txCount: txns.length, transfersLinked: pairs }
}

/** Deletes a statement and all transactions tagged with its sId. */
export async function deleteStatement(uid: string, statementId: string): Promise<{ txDeleted: number }> {
  const txSnap = await getDocs(query(
    collection(db, 'expense', uid, 'transactions'),
    where('sId', '==', statementId)
  ))
  for (let i = 0; i < txSnap.docs.length; i += FIRESTORE_BATCH_LIMIT) {
    const slice = txSnap.docs.slice(i, i + FIRESTORE_BATCH_LIMIT)
    const batch = writeBatch(db)
    for (const d of slice) batch.delete(d.ref)
    await batch.commit()
  }
  const delBatch = writeBatch(db)
  delBatch.delete(doc(db, 'expense', uid, 'statements', statementId))
  await delBatch.commit()
  return { txDeleted: txSnap.docs.length }
}

/** Replaces an existing statement: deletes its transactions and statement doc, then commits a new one. */
export async function replaceStatement(uid: string, existingStatementId: string, plan: ImportPlan): Promise<{ statementId: string; accountId: string; txCount: number; transfersLinked: number }> {
  await deleteStatement(uid, existingStatementId)
  return commitImport(uid, plan)
}

function txToWire(statementId: string, accountId: string, tx: ParsedTransaction, parsed: ParsedStatement): WireTransaction {
  const mt: WireTransaction['mt'] = {}
  if (tx.metadata?.reference) mt.ref = tx.metadata.reference
  if (tx.metadata?.location) mt.loc = tx.metadata.location
  if (tx.metadata?.foreignAmount) mt.fxa = parseFloat(tx.metadata.foreignAmount)
  return {
    sId: statementId,
    aId: accountId,
    d: tx.date,
    m: tx.amount,
    c: tx.currency,
    r: tx.rawDescription,
    vn: tx.rawDescription,
    vId: null,
    tg: null,
    sg: tx.amount < 0 ? 'd' : 'c',
    mt,
    uo: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ca: serverTimestamp() as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ua: serverTimestamp() as any,
  }
}
