import { useState, useEffect, useCallback } from 'react'
import { supabase, getAuthToken, forceAuthHeader } from '@/config/supabase'
import { useAppStore } from '@/store/appStore'

export interface TokenTransaction {
  id: string
  amount: number
  balance_after: number
  type: 'purchase' | 'usage' | 'refund' | 'bonus' | 'gift'
  feature: string | null
  description: string | null
  created_at: string
}

export interface TokenPackage {
  id: string
  name: string
  tokens: number
  price_mxn: number
  price_usd: number | null
}

export function useTokens() {
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<TokenTransaction[]>([])
  const [packages, setPackages] = useState<TokenPackage[]>([])
  const { currentUser } = useAppStore()

  const fetchBalance = useCallback(async () => {
    if (!currentUser) return
    
    try {
      const token = await getAuthToken()
      if (token) forceAuthHeader(token)
      
      const { data, error } = await supabase.functions.invoke('token-manager', {
        body: { action: 'check_balance' },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      if (!error && data?.balance !== undefined) {
        setBalance(data.balance)
      }
    } catch (err) {
      console.error('Error fetching balance:', err)
    }
  }, [currentUser])

  const fetchTransactions = useCallback(async () => {
    if (!currentUser) return []
    
    try {
      const token = await getAuthToken()
      if (token) forceAuthHeader(token)
      
      const { data, error } = await supabase.functions.invoke('token-manager', {
        body: { action: 'get_transactions' },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      if (!error && data?.transactions) {
        setTransactions(data.transactions)
        return data.transactions
      }
    } catch (err) {
      console.error('Error fetching transactions:', err)
    }
    return []
  }, [currentUser])

  const fetchPackages = useCallback(async () => {
    try {
      const token = await getAuthToken()
      if (token) forceAuthHeader(token)
      
      const { data, error } = await supabase.functions.invoke('token-manager', {
        body: { action: 'get_packages' },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      if (!error && data?.packages) {
        setPackages(data.packages)
        return data.packages
      }
    } catch (err) {
      console.error('Error fetching packages:', err)
    }
    return []
  }, [])

  useEffect(() => {
    if (currentUser) {
      setLoading(true)
      Promise.all([fetchBalance(), fetchPackages()])
        .finally(() => setLoading(false))
    }
  }, [currentUser, fetchBalance, fetchPackages])

  const deductTokens = useCallback(async (feature: string, customAmount?: number): Promise<boolean> => {
    if (!currentUser) return false
    
    try {
      const token = await getAuthToken()
      if (token) forceAuthHeader(token)
      
      const { data, error } = await supabase.functions.invoke('token-manager', {
        body: { action: 'deduct', feature, amount: customAmount },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      if (error || !data?.success) {
        if (data?.error) {
          console.warn('Token deduction failed:', data.error)
        }
        return false
      }
      
      if (data?.newBalance !== undefined) {
        setBalance(data.newBalance)
      }
      return true
    } catch (err) {
      console.error('Error deducting tokens:', err)
      return false
    }
  }, [currentUser])

  const checkCost = useCallback(async (feature: string): Promise<number | null> => {
    try {
      const token = await getAuthToken()
      if (token) forceAuthHeader(token)
      
      const { data, error } = await supabase.functions.invoke('token-manager', {
        body: { action: 'get_cost', feature },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      if (!error && data?.cost !== undefined) {
        return data.cost
      }
    } catch (err) {
      console.error('Error checking cost:', err)
    }
    return null
  }, [])

  const hasEnoughTokens = useCallback((cost: number): boolean => {
    return balance >= cost
  }, [balance])

  return {
    balance,
    loading,
    transactions,
    packages,
    fetchBalance,
    fetchTransactions,
    deductTokens,
    checkCost,
    hasEnoughTokens,
  }
}

export const TOKEN_COSTS: Record<string, number> = {
  ai_chat: 1,
  post_generation: 5,
  ai_insights: 3,
  report_pdf: 10,
  data_export: 2,
  multi_sync: 1,
  push_notification: 0.5,
  api_access: 20,
}

export function getTokenCost(feature: string): number {
  return TOKEN_COSTS[feature] ?? 1
}
