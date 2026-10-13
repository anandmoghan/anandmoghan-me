'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/common/firebase/AuthProvider'
import { useAccounts } from '../hooks/useAccounts'
import { useStatements, findStatementByHash } from '../hooks/useStatements'
import { extractFromFile, hashFile } from '../parsers/pdfBrowser'
import { parseStatement, type StatementKind } from '../parsers/detect'
import { isParserError } from '../parsers/types'
import { findMatchingAccount, commitImport, replaceStatement, deleteStatement, defaultNickname, type ImportPlan } from '../services/commitImport'
import { fmt, fmtDateShort } from '../services/format'
import type { Account } from '../types'
import { ISSUER_LABEL } from '../types'

type Status =
  | { phase: 'idle' }
  | { phase: 'parsing'; fileName: string }
  | { phase: 'error'; message: string }
  | { phase: 'preview'; plan: ImportPlan; kind: StatementKind; existingStatementId?: string }
  | { phase: 'committing' }
  | { phase: 'done'; txCount: number }

const KIND_LABEL: Record<StatementKind, string> = {
  'hsbc-bank': 'HSBC Bank',
  'hsbc-cc': 'HSBC Credit Card',
  'amex': 'American Express',
  'unknown': 'Unknown',
}

export function AddPage() {
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const router = useRouter()
  const { accounts } = useAccounts(uid || undefined)
  const { statements } = useStatements(uid || undefined)

  const [status, setStatus] = useState<Status>({ phase: 'idle' })
  const [dragOver, setDragOver] = useState(false)
  // When set, the next picked file is treated as a replacement for this statement,
  // bypassing the hash-based dedup lookup.
  const [replacingStatementId, setReplacingStatementId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [busyStatementId, setBusyStatementId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!uid) return
    const overrideStatementId = replacingStatementId
    setStatus({ phase: 'parsing', fileName: file.name })
    try {
      const [pages, fileHash] = await Promise.all([extractFromFile(file), hashFile(file)])
      const { kind, result } = parseStatement(pages)
      if (isParserError(result)) {
        setStatus({ phase: 'error', message: `Could not parse statement: ${result.reason}` })
        return
      }
      // If user explicitly chose Replace, use that statement id; otherwise fall
      // back to hash-based dedup (catches re-uploads of the exact same file).
      const existingId = overrideStatementId
        ?? (await findStatementByHash(uid, fileHash))?.id
      const matched = await findMatchingAccount(uid, result)
      const plan: ImportPlan = {
        parsed: result,
        fileHash,
        fileName: file.name,
        matchedAccount: matched,
        newAccountInput: matched ? null : {
          institution: result.issuer,
          type: result.accountType,
          last4: result.accountIdentifier,
          currency: result.currency,
          nickname: defaultNickname(result),
        },
      }
      setStatus({ phase: 'preview', plan, kind, existingStatementId: existingId })
    } catch (e) {
      console.error('[expense/add] file handling failed', e)
      const message = e instanceof Error
        ? `${e.name}: ${e.message}\n\n${e.stack ?? '(no stack)'}`
        : `Non-Error thrown: ${String(e)}`
      setStatus({ phase: 'error', message })
    }
  }, [uid, replacingStatementId])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const startReplace = (statementId: string) => {
    setReplacingStatementId(statementId)
    fileInputRef.current?.click()
  }

  const handleDelete = async (statementId: string) => {
    if (!uid) return
    setBusyStatementId(statementId)
    try {
      await deleteStatement(uid, statementId)
    } catch (e) {
      console.error('[expense/add] deleteStatement failed', e)
    } finally {
      setBusyStatementId(null)
      setConfirmDelete(null)
    }
  }

  const reset = () => {
    setStatus({ phase: 'idle' })
    setReplacingStatementId(null)
  }

  if (status.phase === 'preview') {
    return <PreviewView
      status={status}
      uid={uid}
      accounts={accounts}
      onCancel={reset}
      onCommitted={(txCount) => setStatus({ phase: 'done', txCount })}
    />
  }

  if (status.phase === 'done') {
    return (
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-4 space-y-4">
        <div className="text-center py-16">
          <p className="text-4xl mb-3">✅</p>
          <h2 className="text-lg font-semibold mb-2">Imported {status.txCount} transactions</h2>
          <p className="text-muted text-sm mb-6">They are now visible in the Transactions tab.</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={reset}
              className="px-4 py-2 text-sm border border-border hover:bg-muted/20 transition-colors"
            >
              Back to statements
            </button>
            <button
              onClick={() => router.push('/apps/expense/transactions')}
              className="px-4 py-2 text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors font-medium"
            >
              View transactions
            </button>
          </div>
        </div>
      </div>
    )
  }

  const accountById = new Map(accounts.map(a => [a.id, a]))
  const sortedStatements = [...statements].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Statements</h2>
      </div>

      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => { setReplacingStatementId(null); fileInputRef.current?.click() }}
        className={`border-2 border-dashed cursor-pointer p-10 text-center transition-colors ${
          dragOver ? 'border-accent bg-accent/5' : 'border-border bg-background hover:bg-muted/5'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={onPickFile}
        />
        <p className="text-3xl mb-2">📄</p>
        <p className="text-sm font-medium">Drop a PDF statement here, or click to choose</p>
        <p className="text-xs text-muted mt-1">HSBC bank, HSBC credit card, or American Express</p>
      </div>

      {status.phase === 'parsing' && (
        <div className="border border-border bg-background p-4 flex items-center gap-3">
          <svg className="w-4 h-4 animate-spin text-muted" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm text-muted">Parsing {status.fileName}…</span>
        </div>
      )}

      {status.phase === 'error' && (
        <div className="border border-destructive/30 bg-destructive/10 text-destructive p-4 text-xs">
          <pre className="whitespace-pre-wrap break-words font-mono max-h-[60vh] overflow-auto">{status.message}</pre>
        </div>
      )}

      {sortedStatements.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted uppercase tracking-wide font-medium">
            Imported ({sortedStatements.length})
          </p>
          <div className="border border-border bg-background overflow-hidden">
            {sortedStatements.map((s, i) => {
              const acc = accountById.get(s.accountId)
              const isConfirming = confirmDelete === s.id
              const isBusy = busyStatementId === s.id
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {acc ? acc.nickname : `${ISSUER_LABEL[s.issuer]} (account deleted)`}
                    </p>
                    <p className="text-xs text-muted">
                      {fmtDateShort(s.periodStart)} – {fmtDateShort(s.periodEnd)} · {s.txCount} tx
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => startReplace(s.id)}
                      disabled={isBusy}
                      className="text-xs text-muted hover:text-foreground px-2 py-1 border border-border hover:bg-muted/20 transition-colors disabled:opacity-50"
                    >
                      Replace
                    </button>
                    <button
                      onClick={() => {
                        if (isConfirming) handleDelete(s.id)
                        else setConfirmDelete(s.id)
                      }}
                      disabled={isBusy}
                      className={`text-xs px-2 py-1 border transition-colors disabled:opacity-50 ${
                        isConfirming
                          ? 'bg-destructive text-white border-destructive'
                          : 'text-destructive border-destructive/30 hover:bg-destructive/10'
                      }`}
                    >
                      {isBusy ? '…' : isConfirming ? 'Confirm?' : 'Delete'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

interface PreviewProps {
  status: Extract<Status, { phase: 'preview' }>
  uid: string
  accounts: Account[]
  onCancel: () => void
  onCommitted: (txCount: number) => void
}

function PreviewView({ status, uid, accounts, onCancel, onCommitted }: PreviewProps) {
  const { plan, kind, existingStatementId } = status
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState('')
  const [overrideAccountId, setOverrideAccountId] = useState<string | ''>(plan.matchedAccount?.id ?? '')
  const [nickname, setNickname] = useState(plan.newAccountInput?.nickname ?? '')

  const sumOut = plan.parsed.transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const sumIn = plan.parsed.transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const isReplace = !!existingStatementId

  const overrideAccount = overrideAccountId ? accounts.find(a => a.id === overrideAccountId) ?? null : null
  const willCreateAccount = !overrideAccount && !plan.matchedAccount

  const finalPlan: ImportPlan = {
    ...plan,
    matchedAccount: overrideAccount ?? plan.matchedAccount,
    newAccountInput: willCreateAccount && plan.newAccountInput
      ? { ...plan.newAccountInput, nickname: nickname || plan.newAccountInput.nickname }
      : null,
  }

  const handleCommit = async () => {
    setCommitting(true)
    setError('')
    try {
      const fn = isReplace ? () => replaceStatement(uid, existingStatementId!, finalPlan) : () => commitImport(uid, finalPlan)
      const res = await fn()
      onCommitted(res.txCount)
    } catch (e) {
      setError(String(e))
      setCommitting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Preview Import</h2>
        <button onClick={onCancel} className="text-xs text-muted hover:text-foreground border border-border px-2 py-1 hover:bg-muted/20 transition-colors">
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border">
        <Stat label="Source" value={KIND_LABEL[kind]} />
        <Stat label="Period" value={`${fmtDateShort(plan.parsed.periodStart)} – ${fmtDateShort(plan.parsed.periodEnd)}`} />
        <Stat label="Money out" value={fmt(sumOut, plan.parsed.currency)} valueClass="text-foreground" />
        <Stat label="Money in" value={fmt(sumIn, plan.parsed.currency)} valueClass="text-success" />
      </div>

      <div className="border border-border bg-background p-4 space-y-3">
        <p className="text-xs text-muted uppercase tracking-wide font-medium">Account</p>
        {plan.matchedAccount ? (
          <p className="text-sm">
            Linked to existing account <span className="font-semibold">{plan.matchedAccount.nickname}</span>{' '}
            <span className="text-xs text-muted">(····{plan.matchedAccount.last4})</span>
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted">
              No matching account found. A new account will be created (you can override below).
            </p>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full text-sm border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        )}
        {accounts.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted">Or use existing:</label>
            <select
              value={overrideAccountId}
              onChange={(e) => setOverrideAccountId(e.target.value)}
              className="text-xs border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">{plan.matchedAccount ? 'Use matched' : 'Create new'}</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.nickname} (····{a.last4})</option>)}
            </select>
          </div>
        )}
      </div>

      {isReplace && (
        <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Continuing will <strong>replace</strong> the existing statement and its transactions with the {plan.parsed.transactions.length} transactions from this file.
        </div>
      )}

      <div className="border border-border bg-background overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-muted/5 flex items-center justify-between">
          <p className="text-xs text-muted uppercase tracking-wide font-medium">{plan.parsed.transactions.length} transactions</p>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {plan.parsed.transactions.map((tx, i) => (
            <div
              key={i}
              className={`flex items-center justify-between gap-3 px-4 py-2 ${
                i > 0 ? 'border-t border-border' : ''
              }`}
            >
              <div className="text-xs text-muted tabular-nums w-14 shrink-0">{fmtDateShort(tx.date)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{tx.rawDescription}</p>
              </div>
              <div className={`text-sm font-semibold tabular-nums shrink-0 ${tx.amount < 0 ? 'text-foreground' : 'text-success'}`}>
                {tx.amount < 0 ? '−' : '+'}{fmt(Math.abs(tx.amount), tx.currency)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 text-sm border border-border hover:bg-muted/20 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleCommit}
          disabled={committing}
          className="flex-1 py-2.5 text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 font-medium"
        >
          {committing ? 'Importing…' : isReplace ? 'Replace' : 'Import'}
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-background px-4 py-3">
      <p className="text-[10px] text-muted uppercase tracking-wide font-medium">{label}</p>
      <p className={`text-base font-semibold mt-0.5 ${valueClass ?? ''}`}>{value}</p>
    </div>
  )
}
