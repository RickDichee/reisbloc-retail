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

import axios from 'axios'
import logger from '@/utils/logger'

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
  private accessToken: string
  private apiUrl: string

  constructor() {
    // Configura el access token desde las variables de entorno
    this.accessToken = import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN || ''
    this.apiUrl = 'https://api.mercadopago.com'
  }

  /**
   * Crea una preferencia de pago para MercadoPago
   * Esto genera un link de pago que el usuario puede usar
   */
  async createPaymentPreference(data: CreatePaymentRequest): Promise<PaymentPreference> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/checkout/preferences`,
        {
          items: [
            {
              title: data.description,
              quantity: 1,
              currency_id: 'MXN',
              unit_price: data.amount,
            },
          ],
          external_reference: data.orderId,
          notification_url: `${import.meta.env.VITE_APP_URL}/api/mercadopago/webhook`,
          payer: {
            email: data.email || 'customer@email.com',
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      )

      return response.data
    } catch (error: any) {
      logger.error('mercadopago', 'Error creating MercadoPago preference', error.response?.data || error.message)
      throw new Error(error.response?.data?.message || 'Error al crear preferencia de pago')
    }
  }

  /**
   * Procesa un pago directo (POS integration)
   * Requiere que el terminal esté configurado
   */
  async processDirectPayment(data: CreatePaymentRequest): Promise<MercadoPagoPayment> {
    // MODO REGISTRO MANUAL: No contactar API real, solo registrar
    const method = data.paymentMethodId || 'card'
    logger.info('mercadopago', `💳 Registrando pago manual (${method})`, data)
    
    // Simular pequeño delay para sensación de proceso
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

  /**
   * Obtiene el estado de un pago
   */
  async getPaymentStatus(paymentId: string): Promise<MercadoPagoPayment> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      )

      return response.data
    } catch (error: any) {
      logger.error('mercadopago', 'Error getting payment status', error.response?.data || error.message)
      throw new Error(error.response?.data?.message || 'Error al obtener estado del pago')
    }
  }

  /**
   * Cancela un pago pendiente
   */
  async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      await axios.put(
        `${this.apiUrl}/v1/payments/${paymentId}`,
        { status: 'cancelled' },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      )

      return true
    } catch (error: any) {
      logger.error('mercadopago', 'Error cancelling payment', error.response?.data || error.message)
      return false
    }
  }

  /**
   * Valida la configuración del servicio
   */
  isConfigured(): boolean {
    return !!this.accessToken && this.accessToken.length > 0
  }
}

export default new MercadoPagoService()
