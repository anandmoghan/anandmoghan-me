import { useState, useEffect, useCallback } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { useAuth } from '../../../hooks/useAuth'
import { decryptApiKey } from '../services/crypto'
import { getPortfolio, getAccountCash, getOrders, getInstruments } from '../services/trading212'
import type { Position, AccountCash, Order } from '../services/trading212'
import type { Group } from '../../../types'
import type { GroupMemberPortfolio, MemberData } from '../types'

export function useTrading212(apiKey: string | null, apiSecret: string | null) {
  const [portfolio, setPortfolio] = useState<Position[]>([])
  const [cash, setCash] = useState<AccountCash | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!apiKey || !apiSecret) return
    setLoading(true)
    setError(null)
    try {
      const [p, c, o] = await Promise.all([
        getPortfolio(apiKey, apiSecret),
        getAccountCash(apiKey, apiSecret),
        getOrders(apiKey, apiSecret),
      ])
      setPortfolio(p)
      setCash(c)
      setOrders(o.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [apiKey])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { portfolio, cash, orders, loading, error, refetch: fetchData }
}

export function useGroupPortfolios(group: Group | null) {
  const { user } = useAuth()
  const [memberData, setMemberData] = useState<GroupMemberPortfolio[]>([])
  const [currencyMap, setCurrencyMap] = useState<Map<string, string>>(new Map())
  const [nameMap, setNameMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!group || !user) {
      setMemberData([])
      return
    }

    const fetchAll = async () => {
      setLoading(true)
      const results: GroupMemberPortfolio[] = []

      for (const uid of group.members) {
        // Get user profile
        const userSnap = await getDoc(doc(db, 'users', uid))
        const userData = userSnap.data()
        const member: MemberData = {
          uid,
          displayName: userData?.displayName || 'Unknown',
          email: userData?.email || '',
          photoURL: userData?.photoURL || '',
        }

        // Get their encrypted API key
        const settingsSnap = await getDoc(doc(db, 'users', uid, 'settings', 'trading212'))
        if (!settingsSnap.exists()) {
          results.push({ member, portfolio: [], cash: null, orders: [], loading: false, error: 'No API key set' })
          continue
        }

        const { encryptedApiKey, iv, encryptedApiSecret, secretIv } = settingsSnap.data()
        if (!encryptedApiSecret || !secretIv) {
          results.push({ member, portfolio: [], cash: null, orders: [], loading: false, error: 'API secret not set' })
          continue
        }
        try {
          const [decryptedKey, decryptedSecret] = await Promise.all([
            decryptApiKey(encryptedApiKey, iv),
            decryptApiKey(encryptedApiSecret, secretIv),
          ])

          const [portfolio, cash, ordersResp, instruments] = await Promise.all([
            getPortfolio(decryptedKey, decryptedSecret),
            getAccountCash(decryptedKey, decryptedSecret),
            getOrders(decryptedKey, decryptedSecret),
            results.length === 0 ? getInstruments(decryptedKey, decryptedSecret) : Promise.resolve(null),
          ])
          if (instruments) {
            setCurrencyMap(new Map(instruments.map(i => [i.ticker, i.currencyCode])))
            setNameMap(new Map(instruments.map(i => [i.ticker, i.name || i.shortname || i.ticker])))
          }
          results.push({ member, portfolio, cash, orders: ordersResp.items, loading: false, error: null })
        } catch (err) {
          results.push({
            member, portfolio: [], cash: null, orders: [],
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to fetch',
          })
        }
      }

      setMemberData(results)
      setLoading(false)
    }

    fetchAll()
  // Use stable primitives — group object reference changes on every Firestore snapshot
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id, group?.members?.join(','), user?.uid])

  return { memberData, currencyMap, nameMap, loading }
}
