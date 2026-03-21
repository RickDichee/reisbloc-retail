import logger from '@/utils/logger'
import { supabase } from '@/config/supabase'

interface ConektaPaymentIntent {
    amount: number;
    currency: string;
    orderId: string;
    description: string;
}

export class ConektaService {
    private isInitialized = false;

    public async initialize(): Promise<boolean> {
        if (this.isInitialized) return true;
        
        logger.info('conekta-service', 'Conekta services initialized');
        this.isInitialized = true;
        return true;
    }

    public async createPaymentIntent(intent: ConektaPaymentIntent): Promise<{ success: boolean; transactionId?: string; error?: string; checkoutUrl?: string }> {
        logger.info('conekta-service', 'Creating payment intent via Edge Function', intent);

        try {
            const { data, error } = await supabase.functions.invoke('conekta-checkout', {
                body: {
                    amount: intent.amount,
                    currency: intent.currency,
                    description: intent.description,
                    orderId: intent.orderId
                }
            })

            if (error) throw error

            if (data?.success) {
                return {
                    success: true,
                    transactionId: data.transactionId,
                    checkoutUrl: data.checkoutUrl
                }
            } else {
                return {
                    success: false,
                    error: data?.error || 'No se pudo crear el checkout de Conekta'
                }
            }
        } catch (error: any) {
            logger.error('conekta-service', 'Failed to create Conekta checkout', error.message || error);
            return {
                success: false,
                error: error.message || 'Error de conexión con la pasarela.'
            }
        }
    }
}

export const conektaService = new ConektaService();
export default conektaService;
