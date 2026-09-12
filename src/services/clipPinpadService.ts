/**
 * Reisbloc POS - Clip PinPad Cloud Terminal Service
 * Gestiona cobros directos en terminal física Clip Total 3 vía Cloud API
 */

import logger from '@/utils/logger'

export interface PinpadPaymentResponse {
  pinpad_request_id?: string
  reference?: string
  amount?: string
  serial_number_pos?: string
  code?: string
  name?: string
  message?: string
}

export interface PinpadStatusResponse {
  pinpad_request_id: string
  reference: string
  amount: string
  status: 'PENDING' | 'IN_PROCESS' | 'APPROVED' | 'PAID' | 'REJECTED' | 'DECLINED' | 'CANCELLED' | 'CANCELED' | 'EXPIRED' | 'ERROR' | 'FAILED'
  create_date?: string
  error?: {
    code?: string
    detail?: string
    message?: string
  }
  detail?: {
    authorization_code?: string
    last4?: string
    brand?: string
    receipt_no?: string
  }
}

class ClipPinpadService {
  private defaultSerial = 'AA61B532642902383'

  public getSerialNumber(): string {
    return localStorage.getItem('reisbloc_clip_serial') || this.defaultSerial
  }

  public setSerialNumber(serial: string) {
    localStorage.setItem('reisbloc_clip_serial', serial.trim())
  }

  /**
   * Envía una intención de cobro a la terminal física Clip Total 3
   */
  public async createPayment(amount: number, reference?: string): Promise<PinpadPaymentResponse> {
    const serial = this.getSerialNumber()
    const ref = reference || `REIS-${Date.now().toString().slice(-6)}`

    logger.info('clip-pinpad', `Enviando cobro de $${amount} a terminal Clip ${serial}...`)

    try {
      const res = await fetch('/api/clip-pinpad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          reference: ref,
          serialNumber: serial,
        }),
      })

      const text = await res.text()
      let data: any = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        throw new Error(`Respuesta inválida del servidor Clip (${res.status}): ${text.slice(0, 120)}`)
      }

      if (!res.ok && !data.code && !data.message && !data.error) {
        throw new Error(`Error en servidor Clip (${res.status}): ${text.slice(0, 120)}`)
      }

      logger.info('clip-pinpad', 'Respuesta de Clip PinPad:', data)
      return data
    } catch (err: any) {
      logger.error('clip-pinpad', 'Error conectando con /api/clip-pinpad:', err)
      throw new Error(`Error de conexión con la terminal Clip: ${err.message || err}`)
    }
  }

  /**
   * Consulta el estado de una transacción por su pinpad_request_id
   */
  public async checkStatus(requestId: string): Promise<PinpadStatusResponse> {
    try {
      const res = await fetch(`/api/clip-pinpad?action=check_payment&requestId=${encodeURIComponent(requestId)}`)
      const text = await res.text()
      let data: any = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        throw new Error(`Respuesta inválida al consultar estado (${res.status}): ${text.slice(0, 120)}`)
      }
      return data
    } catch (err: any) {
      logger.error('clip-pinpad', 'Error consultando estado de PinPad:', err)
      throw err
    }
  }

  /**
   * Sondea el estado del pago cada 600ms hasta completarse, rechazarse o tiempo de espera
   */
  public async pollPayment(
    requestId: string,
    onTick?: (status: string, data?: PinpadStatusResponse) => void,
    timeoutSeconds = 45
  ): Promise<PinpadStatusResponse> {
    const startTime = Date.now()
    const maxTime = timeoutSeconds * 1000

    while (Date.now() - startTime < maxTime) {
      try {
        const data = await this.checkStatus(requestId)
        if (onTick) onTick(data.status, data)

        // 1. Pago Aprobado con Éxito
        if (data.status === 'PAID' || data.status === 'APPROVED') {
          return data
        }

        // 2. Pago Rechazado, Declinado o Cancelado en la Terminal
        const isRejected = 
          data.status === 'REJECTED' || 
          data.status === 'DECLINED' || 
          data.status === 'CANCELLED' || 
          data.status === 'CANCELED' || 
          data.status === 'EXPIRED' ||
          data.status === 'ERROR' ||
          data.status === 'FAILED'

        if (isRejected) {
          const rawReason = data.error?.detail || data.error?.message || data.error?.code || data.status
          
          let friendlyReason = rawReason
          if (rawReason.includes('CHIP') || rawReason.includes('chip')) {
            friendlyReason = 'Debe insertarse el chip de la tarjeta (no deslizar)'
          } else if (rawReason.includes('FUNDS') || rawReason.includes('funds') || rawReason.includes('insufficient')) {
            friendlyReason = 'Fondos insuficientes en la tarjeta'
          } else if (rawReason.includes('PIN') || rawReason.includes('pin')) {
            friendlyReason = 'PIN incorrecto o cancelado'
          } else if (rawReason.includes('EXPIRED') || rawReason.includes('expired')) {
            friendlyReason = 'Tarjeta expirada'
          }

          throw new Error(`Tarjeta rechazada: ${friendlyReason}`)
        }
      } catch (err) {
        // Detener el sondeo de inmediato si el pago fue rechazado
        if (err instanceof Error && (err.message.includes('Tarjeta rechazada') || err.message.includes('rechazada'))) {
          throw err
        }
      }

      // Sondeo cada 600ms
      await new Promise(resolve => setTimeout(resolve, 600))
    }

    throw new Error('Tiempo de espera agotado en la terminal Clip. Por favor reintenta.')
  }

  /**
   * Consulta el estado en línea del lector Clip Total 3
   */
  public async getDeviceStatus(serial?: string): Promise<any> {
    const s = serial || this.getSerialNumber()
    try {
      const res = await fetch(`/api/clip-pinpad?action=devices_status&serialNumber=${encodeURIComponent(s)}`)
      if (!res.ok) return null
      return await res.json()
    } catch (err: any) {
      logger.error('clip-pinpad', 'Error consultando estado del lector Clip:', err)
      return null
    }
  }
}

export const clipPinpadService = new ClipPinpadService()
export default clipPinpadService
