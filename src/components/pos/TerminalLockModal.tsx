import React from 'react'
import { Monitor, AlertTriangle, ArrowRight, ShieldCheck, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TerminalInfo } from '@/hooks/useTerminalSession'

interface TerminalLockModalProps {
  isOpen: boolean
  planName: string
  maxRegisters: number
  competingTerminal: TerminalInfo | null
  onClaimControl: () => void
}

export const TerminalLockModal: React.FC<TerminalLockModalProps> = ({
  isOpen,
  planName,
  maxRegisters,
  competingTerminal,
  onClaimControl
}) => {
  const navigate = useNavigate()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-slate-900 border border-slate-700/60 rounded-3xl p-6 sm:p-8 text-white shadow-2xl shadow-indigo-500/10 custom-scrollbar">
        
        {/* Glow de fondo */}
        <div className="absolute -top-10 -left-10 w-36 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-36 h-36 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Icono de Cabecera */}
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-400 mx-auto mb-6">
          <Monitor className="w-8 h-8" />
        </div>

        {/* Título & Badge de Plan */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-300">
            <span>PLAN {planName.toUpperCase()}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>{maxRegisters} {maxRegisters === 1 ? 'CAJA SIMULTÁNEA' : 'CAJAS SIMULTÁNEAS'}</span>
          </div>

          <h2 className="text-2xl font-black tracking-tight text-white">
            Límite de Terminales Alcanzado
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Tu cuenta se encuentra activa en otra terminal de cobro. Para proteger la consistencia de tu inventario y el corte de caja, solo se permite operar una caja a la vez con este plan.
          </p>
        </div>

        {/* Info de la otra terminal activa */}
        {competingTerminal && (
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Terminal con control activo</p>
              <p className="text-sm font-black text-white truncate">{competingTerminal.terminalName}</p>
              <p className="text-xs text-slate-400">Operada por: <span className="text-indigo-300 font-semibold">{competingTerminal.userName}</span></p>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={onClaimControl}
            className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Tomar el control de cobro en esta pantalla
          </button>

          <button
            type="button"
            onClick={() => navigate('/pricing')}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white rounded-2xl font-black text-sm tracking-wide transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-white" />
            Habilitar 2 o más cajas a la vez ($199/mes)
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-4">
          La consulta administrativa (Dashboard / Inventario / Reportes) no consume terminales de cobro.
        </p>
      </div>
    </div>
  )
}
