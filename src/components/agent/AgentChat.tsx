import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ShieldCheck, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import ActionApprovalCard, { AgentAction } from './ActionApprovalCard';
import { supabase } from '@/config/supabase';

const fetchAgentResponse = async (query: string): Promise<{ text: string, action?: AgentAction }> => {
    try {
        const { data, error } = await supabase.functions.invoke('ai-agent', {
            body: {
                query,
                context: {
                    // This could later contain real stats from Zustand
                    todaySales: null,
                    lowStock: null
                }
            }
        });

        if (error) {
            console.error('ai-agent error:', error);
            // Catch custom Rate Limit errors from our Edge Function
            if (error.status === 429) {
                return { text: '⚠️ Límite Excedido: Has alcanzado el límite diario de interacciones (20/día) para proteger tu presupuesto de facturación de IA. Regresa mañana o actualiza tu plan.' };
            }
            throw error;
        }

        return data; // { text, action }
    } catch (e) {
        return {
            text: 'Ocurrió un error al contactar al Agente. Revisa tu conexión o la configuración de Supabase.'
        };
    }
};

interface Message {
    id: string;
    role: 'user' | 'agent';
    text: string;
    action?: AgentAction;
    timestamp: Date;
}

export default function AgentChat() {
    const { currentUser } = useAppStore();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome-1",
            role: 'agent',
            text: `Hola ${currentUser?.username || 'Commander'}, soy Reisbloc Agent. Estoy aquí para ayudarte a escalar la tienda. \n\nRecuerda: **Cero Cobros Sorpresa**. Yo propongo, tú autorizas. ¿En qué trabajamos hoy?`,
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            text: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetchAgentResponse(userMessage.text);

            const agentMessage: Message = {
                id: crypto.randomUUID(),
                role: 'agent',
                text: response.text,
                action: response.action,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, agentMessage]);
        } catch (error) {
            console.error("Agent error", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleActionApproved = (_actionId: string) => {
        // In a real app, this triggers the Edge Function to actually execute the payload
        setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'agent',
            text: '✅ ¡Ejecutado con éxito! La plataforma externa ha recibido la instrucción.',
            timestamp: new Date()
        }]);
    };

    const handleActionRejected = (_actionId: string) => {
        setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'agent',
            text: '🚫 Acción cancelada por política de Human-in-the-Loop. El borrador fue descartado sin cargos.',
            timestamp: new Date()
        }]);
    };

    return (
        <div className="flex flex-col h-[700px] bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Chat Header */}
            <div className="bg-slate-900 p-4 shrink-0 flex items-center justify-between border-b border-indigo-900/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-xl">
                        <Bot size={24} className="text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-white font-black tracking-tighter uppercase leading-none">REISBLOC AGENT</h2>
                        <div className="flex items-center gap-1 mt-1">
                            <ShieldCheck size={12} className="text-emerald-400" />
                            <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">Modo Seguro: Activado</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 relative">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fadeIn`}>
                        {/* Avatar */}
                        <div className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-xl shadow-sm ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-900 text-white'}`}>
                            {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                        </div>

                        {/* Bubble */}
                        <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-none'
                                }`}>
                                {msg.text}
                            </div>

                            <span className="text-[10px] text-slate-400 mt-1 font-medium">
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>

                            {/* Action Payload Rendering (Human-in-the-loop) */}
                            {msg.action && (
                                <div className="mt-3 w-full max-w-sm">
                                    <ActionApprovalCard
                                        action={msg.action}
                                        onApprove={() => handleActionApproved(msg.action!.id)}
                                        onReject={() => handleActionRejected(msg.action!.id)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-4 animate-pulse">
                        <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 text-white">
                            <Loader2 size={20} className="animate-spin" />
                        </div>
                        <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-2xl rounded-tl-none text-slate-400 text-sm">
                            Analizando contexto e integraciones...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="shrink-0 p-4 bg-white border-t border-slate-100">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ej. Haz un draft de anuncio en Meta para los tenis que menos se venden..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-900 placeholder:text-slate-400"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="shrink-0 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-12"
                    >
                        <Send size={20} />
                    </button>
                </div>
                <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">
                    El Agente nunca realizará cobros ni publicará en redes sin tu clic de aprobación explícito.
                </p>
            </div>
        </div>
    );
}
