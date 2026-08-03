import type { Vendor, Transaction } from '../types'

/**
 * Returns the first vendor whose alias is found as a substring inside the raw
 * description (case-insensitive). Aliases are typically short brand tokens
 * stored in upper case (e.g. ["AMAZON", "AMZNMKTPLACE"]).
 */
export function matchVendor(rawDescription: string, vendors: Vendor[]): Vendor | null {
  const haystack = rawDescription.toUpperCase()
  // Sort vendors by longest alias first so more specific matches win.
  const sorted = vendors
    .flatMap((v) => v.aliases.map((a) => ({ vendor: v, alias: a.toUpperCase() })))
    .sort((a, b) => b.alias.length - a.alias.length)
  for (const { vendor, alias } of sorted) {
    if (alias && haystack.includes(alias)) return vendor
  }
  return null
}

/** Returns true if assignment should overwrite the tx's existing vendorId. */
export function shouldAssign(tx: Transaction): boolean {
  if (tx.userOverrides.vendorId) return false  // user has manually set this
  return tx.vendorId == null
}
