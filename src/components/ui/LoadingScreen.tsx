import React from 'react';
import { BRANDING } from '@/config/branding';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Cargando sistema...' }) => {
  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50">
      {/* Efecto de pulso en el logo o círculo */}
      <div className="relative flex items-center justify-center mb-8">
        <div className="absolute animate-ping inline-flex h-24 w-24 rounded-full bg-cyan-500 opacity-20"></div>
        <div className="relative inline-flex rounded-full h-20 w-20 bg-slate-800 border-2 border-pink-500 items-center justify-center shadow-[0_0_15px_rgba(236,72,153,0.45)] overflow-hidden">
          <img src={BRANDING.logoUrl} alt={BRANDING.whiteLabelName} className="h-full w-full object-cover" />
        </div>
      </div>

      {/* Texto de carga */}
      <h2 className="text-xl font-bold text-white tracking-widest uppercase mb-2">
        {BRANDING.loadingTitle}
      </h2>
      <p className="text-pink-400 text-sm animate-pulse">{message}</p>
    </div>
  );
};