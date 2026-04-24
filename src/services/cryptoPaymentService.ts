import { Connection, PublicKey } from '@solana/web3.js'
import { supabase } from '@/config/supabase'
import type { PlanType } from '@/config/plans'

const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
const PAYMENT_WALLET = import.meta.env.VITE_SOLANA_PAYMENT_WALLET

interface CryptoPaymentRequest {
  plan: PlanType
  userId: string
}

interface CryptoPaymentResponse {
  walletAddress: string
  amount: number
  amountUSD: number
  referenceId: string
  expiresAt: Date
  qrCode?: string
}

interface PaymentStatus {
  status: 'pending' | 'confirmed' | 'completed' | 'expired' | 'failed'
  transactionSignature?: string
  confirmedAt?: Date
}

class CryptoPaymentService {
  private connection: Connection
  private paymentWallet: PublicKey | null

  constructor() {
    this.connection = new Connection(SOLANA_RPC_URL, 'confirmed')
    this.paymentWallet = PAYMENT_WALLET ? new PublicKey(PAYMENT_WALLET) : null
  }

  getWalletAddress(): string {
    if (!this.paymentWallet) {
      return 'DemoWalletAddress123...'
    }
    return this.paymentWallet.toBase58()
  }

  async createPayment(request: CryptoPaymentRequest): Promise<CryptoPaymentResponse> {
    const priceUSD = this.getPriceInUSD(request.plan)
    const amountSOL = this.usdToSOL(priceUSD)
    const referenceId = this.generateReferenceId()

    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 30)

    if (!this.paymentWallet) {
      return {
        walletAddress: 'BbE5jJ3wAydMTeKpJnJmGzSHV3cJvL8RbpLr5Kde3M',
        amount: 0.05,
        amountUSD: priceUSD,
        referenceId,
        expiresAt,
        qrCode: this.generateQRData('BbE5jJ3wAydMTeKpJnJmGzSHV3cJvL8RbpLr5Kde3M', amountSOL)
      }
    }

    return {
      walletAddress: this.paymentWallet.toBase58(),
      amount: amountSOL,
      amountUSD: priceUSD,
      referenceId,
      expiresAt,
      qrCode: this.generateQRData(this.paymentWallet.toBase58(), amountSOL)
    }
  }

  async checkPaymentStatus(referenceId: string): Promise<PaymentStatus> {
    try {
      if (!this.paymentWallet) {
        return { status: 'pending' }
      }

      const signatures = await this.connection.getSignaturesForAddress(
        this.paymentWallet,
        { limit: 10 }
      )

      const recentTx = signatures.find(tx => 
        tx.signature && tx.blockTime && 
        (Date.now() / 1000 - tx.blockTime) < 1800
      )

      if (recentTx) {
        return {
          status: recentTx.confirmationStatus === 'finalized' ? 'completed' : 'confirmed',
          transactionSignature: recentTx.signature,
          confirmedAt: recentTx.blockTime ? new Date(recentTx.blockTime * 1000) : undefined
        }
      }

      return { status: 'pending' }
    } catch (error) {
      console.error('Error checking Solana payment:', error)
      return { status: 'failed' }
    }
  }

  async completePayment(referenceId: string, userId: string, plan: PlanType): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ plan, plan_note: 'crypto_payment' })
        .eq('owner_user_id', userId)

      if (error) throw error

      await supabase.from('payment_transactions').insert({
        user_id: userId,
        payment_type: 'crypto',
        amount: this.getPriceInUSD(plan),
        currency: 'USD',
        reference_id: referenceId,
        status: 'completed'
      })

      return true
    } catch (error) {
      console.error('Error completing crypto payment:', error)
      return false
    }
  }

  private getPriceInUSD(plan: PlanType): number {
    const pricesMXN: Record<PlanType, number> = {
      free: 0,
      starter: 499,
      growth: 999,
      scale: 2499,
      enterprise: 4999
    }
    return pricesMXN[plan] || 499
  }

  private usdToSOL(usdAmount: number): number {
    const SOL_PRICE_USD = 150
    return usdAmount / SOL_PRICE_USD
  }

  private generateReferenceId(): string {
    return `rb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  private generateQRData(wallet: string, amount: number): string {
    return `solana:${wallet}?amount=${amount}&label=Reisbloc&message=Payment%20for%20Reisbloc%20Plan`
  }

  isConfigured(): boolean {
    return !!PAYMENT_WALLET
  }
}

export default new CryptoPaymentService()