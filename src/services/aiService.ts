import logger from '../utils/logger';
import { supabase } from '@/config/supabase';

export interface AIInsight {
    title: string;
    description: string;
    action: string;
    type: 'success' | 'warning' | 'info';
}

export const aiService = {
    async generateStrategicInsights(metrics: any, topProducts: any[]): Promise<AIInsight[]> {
        try {
            const { data, error } = await supabase.functions.invoke('ai-insights', {
                body: { metrics, topProducts }
            });

            if (error) {
                logger.error('ai', 'Error calling AI insights function', error);
                throw error;
            }

            return data?.insights || [];
        } catch (error) {
            logger.error('ai', 'Failed to generate strategic insights via Edge Function', error as any);
            return [
                {
                    title: "Error al generar insights",
                    description: "No pudimos conectar con el consultor de IA en este momento.",
                    action: "El equipo técnico ya ha sido notificado.",
                    type: "warning"
                }
            ];
        }
    }
};
