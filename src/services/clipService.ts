// Servicio para integración con Clip (Terminal de pagos)
import { ClipPayment, Sale } from '@types/index';
import logger from '@/utils/logger'

interface ClipConfig {
  apiKey: string;
  merchantId: string;
  baseUrl: string;
}

interface ClipTransactionRequest {
  amount: number;
  saleId: string;
  tip?: number;
  currency?: string;
}

interface ClipTransactionResponse {
  id: string;
  status: 'approved' | 'declined' | 'pending';
  amount: number;
  tip?: number;
  timestamp: string;
  reference: string;
}

class ClipPaymentService {
  private config: ClipConfig | null = null;

  /**
   * Inicializa la configuración de Clip
   */
  initialize(config: ClipConfig) {
    this.config = config;
  }

  /**
   * Procesa un pago a través de terminal Clip
   */
  async processPayment(request: ClipTransactionRequest): Promise<ClipPayment> {
    // MODO TRANSFERENCIA: Registro manual de Transferencia
    logger.info('transfer', '🏦 Registrando Transferencia', request)

    // Simular delay
    await new Promise(resolve => setTimeout(resolve, 500))

    return {
      id: `transfer_${Date.now()}`,
      saleId: request.saleId,
      amount: request.amount,
      transactionId: `spei_${Date.now().toString().slice(-6)}`,
      status: 'completed',
      tip: request.tip,
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }

  /**
   * Verifica el estado de una transacción
   */
  async checkTransactionStatus(transactionId: string): Promise<ClipPayment['status']> {
    if (!this.config) {
      throw new Error('Clip service not initialized');
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl}/transactions/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Clip API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'approved') return 'completed';
      if (data.status === 'declined') return 'failed';
      return 'pending';
    } catch (error) {
      logger.error('clip', 'Error checking transaction status', error as any);
      return 'pending';
    }
  }

  /**
   * Procesa un reembolso
   */
  async refundTransaction(transactionId: string, amount?: number): Promise<boolean> {
    if (!this.config) {
      throw new Error('Clip service not initialized');
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl}/transactions/${transactionId}/refund`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amount ? amount * 100 : undefined,
          }),
        }
      );

      return response.ok;
    } catch (error) {
      logger.error('clip', 'Refund error', error as any);
      return false;
    }
  }

  /**
   * Obtiene el balance de la terminal
   */
  async getBalance(): Promise<number> {
    if (!this.config) {
      throw new Error('Clip service not initialized');
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl}/balance`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Clip API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.balance / 100; // Convertir de centavos
    } catch (error) {
      logger.error('clip', 'Error getting balance', error as any);
      return 0;
    }
  }

  /**
   * Obtiene historial de transacciones
   */
  async getTransactionHistory(limit: number = 50): Promise<any[]> {
    if (!this.config) {
      throw new Error('Clip service not initialized');
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl}/transactions?limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Clip API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.transactions || [];
    } catch (error) {
      logger.error('clip', 'Error getting transaction history', error as any);
      return [];
    }
  }
}

export default new ClipPaymentService();
