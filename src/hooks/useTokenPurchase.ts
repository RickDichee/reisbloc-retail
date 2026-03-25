import { useState, useCallback } from 'react'
import { supabase, getAuthToken, forceAuthHeader } from '@/config/supabase'

export interface TokenPackage {
  id: string
  name: string
  tokens: number
  price_mxn: number
  price_usd: number | null
}

export interface PaymentDetails {
  id: string
  reference: string
  amountUsdc?: number
  amountMxn: number
  tokens: number
  expiresAt: string
  walletAddress?: string
  solanaPayUrl?: string
  qrData?: string
  bank?: string
  clabe?: string
  accountName?: string
  concept?: string
  type: 'crypto' | 'spei'
}

export function useTokenPurchase() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPayment, setCurrentPayment] = useState<PaymentDetails | null>(null)

  const createSolanaPayment = useCallback(async (tokens: number, amountMxn: number, packageId?: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const token = await getAuthToken()
      
      const { data, error: funcError } = await supabase.functions.invoke('crypto-payment', {
        body: { 
          action: 'create_solana_payment', 
          tokens, 
          amount_mxn: amountMxn,
          package_id: packageId 
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (funcError) throw new Error(funcError.message)
      if (data.error) throw new Error(data.error)

      const payment: PaymentDetails = {
        id: data.payment.id,
        reference: data.payment.reference,
        amountUsdc: data.payment.amountUsdc,
        amountMxn: data.payment.amountMxn,
        tokens: data.payment.tokens,
        expiresAt: data.payment.expiresAt,
        walletAddress: data.payment.walletAddress,
        solanaPayUrl: data.payment.solanaPayUrl,
        qrData: data.payment.qrData,
        type: 'crypto',
      }

      setCurrentPayment(payment)
      return payment
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createSpeiPayment = useCallback(async (tokens: number, amountMxn: number, packageId?: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const token = await getAuthToken()
      
      const { data, error: funcError } = await supabase.functions.invoke('crypto-payment', {
        body: { 
          action: 'create_spei_payment', 
          tokens, 
          amount_mxn: amountMxn,
          package_id: packageId 
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (funcError) throw new Error(funcError.message)
      if (data.error) throw new Error(data.error)

      const payment: PaymentDetails = {
        id: data.payment.id,
        reference: data.payment.reference,
        amountMxn: data.payment.amountMxn,
        tokens: data.payment.tokens,
        expiresAt: data.payment.expiresAt,
        bank: data.payment.bank,
        clabe: data.payment.clabe,
        accountName: data.payment.accountName,
        concept: data.payment.concept,
        type: 'spei',
      }

      setCurrentPayment(payment)
      return payment
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const checkPaymentStatus = useCallback(async (paymentId?: string, reference?: string) => {
    try {
      const token = await getAuthToken()
      
      const { data, error: funcError } = await supabase.functions.invoke('crypto-payment', {
        body: { action: 'get_payment_status', payment_id: paymentId, reference },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (funcError) throw new Error(funcError.message)
      return data
    } catch (err: any) {
      console.error('Error checking payment status:', err)
      return null
    }
  }, [])

  const clearPayment = useCallback(() => {
    setCurrentPayment(null)
    setError(null)
  }, [])

  return {
    loading,
    error,
    currentPayment,
    createSolanaPayment,
    createSpeiPayment,
    checkPaymentStatus,
    clearPayment,
  }
}
