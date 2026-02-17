import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Info, Loader2, RefreshCw } from 'lucide-react';
import { aiService, AIInsight } from '@/services/aiService';
import WidgetCard from './WidgetCard';

interface AIInsightsWidgetProps {
    metrics: any;
    topProducts: any[];
}

export const AIInsightsWidget: React.FC<AIInsightsWidgetProps> = ({ metrics, topProducts }) => {
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchInsights = async () => {
        if (!metrics || !topProducts || topProducts.length === 0) return;

        setLoading(true);
        setError(null);
        try {
            const data = await aiService.generateStrategicInsights(metrics, topProducts);
            setInsights(data);
        } catch (err) {
            setError('No se pudieron generar los insights.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, [metrics, topProducts]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <TrendingUp className="text-emerald-500" size={20} />;
            case 'warning': return <AlertTriangle className="text-amber-500" size={20} />;
            default: return <Info className="text-blue-500" size={20} />;
        }
    };

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'success': return 'border-emerald-100 bg-emerald-50/50';
            case 'warning': return 'border-amber-100 bg-amber-50/50';
            default: return 'border-blue-100 bg-blue-50/50';
        }
    };

    return (
        <WidgetCard
            title="Consultor Estratégico IA"
            action={
                <button
                    onClick={fetchInsights}
                    disabled={loading}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    title="Actualizar sugerencias"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            }
        >
            <div className="space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <Loader2 className="animate-spin mb-3 text-indigo-600" size={32} />
                        <p className="text-sm font-medium animate-pulse">Analizando tus métricas con Gemini...</p>
                    </div>
                ) : error ? (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-3">
                        <AlertTriangle size={20} />
                        <p>{error}</p>
                    </div>
                ) : insights.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {insights.map((insight, idx) => (
                            <div
                                key={idx}
                                className={`p-4 rounded-xl border transition-all hover:shadow-md animate-fadeIn ${getTypeStyles(insight.type)}`}
                                style={{ animationDelay: `${idx * 150}ms` }}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    {getIcon(insight.type)}
                                    <h4 className="font-bold text-gray-900 text-sm">{insight.title}</h4>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed mb-3">
                                    {insight.description}
                                </p>
                                <div className="mt-auto">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Acción sugerida:</p>
                                    <p className="text-xs font-semibold text-indigo-700">{insight.action}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
                        <Sparkles size={40} className="mb-4 opacity-20" />
                        <p className="text-sm">Selecciona un rango de fechas con ventas para generar insights.</p>
                    </div>
                )}

                <div className="flex items-center gap-2 pt-2 text-[10px] text-gray-400 font-medium border-t border-gray-50 mt-2">
                    <Sparkles size={12} className="text-indigo-400" />
                    <span>Impulsado por Google Gemini 1.5 Flash</span>
                </div>
            </div>
        </WidgetCard>
    );
};

export default AIInsightsWidget;
