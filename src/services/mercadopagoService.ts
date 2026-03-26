/**
 * Reisbloc POS - Sistema POS Profesional
 * Copyright (C) 2026 Reisbloc POS
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 */

import logger from '@/utils/logger'
import { supabase } from '@/config/supabase'

// Tipos para MercadoPago
export interface MercadoPagoPayment {
  id: string
  status: 'approved' | 'pending' | 'rejected' | 'in_process'
  status_detail: string
  transaction_amount: number
  payment_method_id: string
  payment_type_id: string
  date_created: string
  description: string
}

export interface CreatePaymentRequest {
  amount: number
  description: string
  orderId: string
  email?: string
  paymentMethodId?: string
}

export interface PaymentPreference {
  id: string
  init_point: string
  sandbox_init_point: string
}

class MercadoPagoService {
  private apiUrl: string

  constructor() {
    this.apiUrl = '/functions/v1/mercadopago-proxy'
  }

  private async callProxy(action: string, payload: Record<string, unknown> = {}) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('No autenticado')

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
    const response = await fetch(`${supabaseUrl}${this.apiUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, ...payload }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Error en MercadoPago proxy')
    return data
  }

  async createPaymentPreference(data: CreatePaymentRequest): Promise<PaymentPreference> {
    try {
      return await this.callProxy('create_preference', {
        amount: data.amount,
        description: data.description,
        orderId: data.orderId,
        email: data.email,
      })
    } catch (error: any) {
      logger.error('mercadopago', 'Error creating MercadoPago preference', error.message)
      throw new Error(error.message || 'Error al crear preferencia de pago')
    }
  }

  async processDirectPayment(data: CreatePaymentRequest): Promise<MercadoPagoPayment> {
    const method = data.paymentMethodId || 'card'
    logger.info('mercadopago', `💳 Registrando pago manual (${method})`, data)

    await new Promise(resolve => setTimeout(resolve, 800))

    return {
      id: `${method}_${Date.now()}`,
      status: 'approved',
      status_detail: 'accredited',
      transaction_amount: data.amount,
      payment_method_id: method,
      payment_type_id: method === 'transfer' ? 'bank_transfer' : 'credit_card',
      date_created: new Date().toISOString(),
      description: data.description
    }
  }

  async getPaymentStatus(paymentId: string): Promise<MercadoPagoPayment> {
    try {
      return await this.callProxy('get_payment_status', { paymentId })
    } catch (error: any) {
      logger.error('mercadopago', 'Error getting payment status', error.message)
      throw new Error(error.message || 'Error al obtener estado del pago')
    }
  }

  async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      const result = await this.callProxy('cancel_payment', { paymentId })
      return result.success
    } catch (error: any) {
      logger.error('mercadopago', 'Error cancelling payment', error.message)
      return false
    }
  }

  isConfigured(): boolean {
    return true // Configuración verificada en el proxy
  }
}

export default new MercadoPagoService()
