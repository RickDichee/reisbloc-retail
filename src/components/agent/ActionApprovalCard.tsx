import { useState } from 'react';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export interface AgentAction {
    id: string;
    type: 'meta_campaign_draft' | 'purchase_order_draft' | 'discount_creation';
    title: string;
    description: string;
    payload: any;
}

interface ActionApprovalCardProps {
    action: AgentAction;
    onApprove: () => void;
    onReject: () => void;
}

export default function ActionApprovalCard({ action, onApprove, onReject }: ActionApprovalCardProps) {
    const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

    const handleApprove = () => {
        setStatus('approved');
        onApprove();
    };

    const handleReject = () => {
        setStatus('rejected');
        onReject();
    };

    if (status !== 'pending') {
        const isApproved = status === 'approved';
        return (
            <div className={`p-3 rounded-xl border flex items-center gap-3 ${isApproved ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                {isApproved ? <CheckCircle size={18} className="text-emerald-500" /> : <XCircle size={18} />}
                <span className="text-xs font-bold uppercase tracking-widest text-inherit">
                    {isApproved ? 'Acción Autorizada' : 'Acción Rechazada'}
                </span>
            </div>
        )
    }

    return (
        <div className="bg-amber-50 rounded-2xl border-2 border-amber-200 overflow-hidden shadow-sm animate-scaleIn">
            <div className="bg-amber-100 px-4 py-2 flex items-center gap-2 border-b border-amber-200">
                <AlertCircle size={16} className="text-amber-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                    Aprobación Requerida
                </span>
            </div>

            <div className="p-4 space-y-3">
                <div>
                    <h4 className="font-bold text-slate-900 text-sm mb-1">{action.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{action.description}</p>
                </div>

                {/* Secure JSON Payload Preview */}
                <div className="bg-slate-900 rounded-lg p-3 font-mono text-[10px] text-emerald-400 overflow-x-auto border border-slate-700 shadow-inner">
                    <pre>{JSON.stringify(action.payload, null, 2)}</pre>
                </div>

                <div className="flex gap-2 pt-2">
                    <button
                        onClick={handleReject}
                        className="flex-1 py-2 px-3 bg-white text-slate-600 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
                    >
                        Rechazar
                    </button>
                    <button
                        onClick={handleApprove}
                        className="flex-1 py-2 px-3 bg-amber-500 text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-sm hover:bg-amber-600 hover:-translate-y-[1px] transition-all"
                    >
                        Autorizar
                    </button>
                </div>
            </div>
        </div>
    );
}
