import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Cargando sistema...' }) => {
  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50">
      {/* Efecto de pulso en el logo o círculo */}
      <div className="relative flex items-center justify-center mb-8">
        <div className="absolute animate-ping inline-flex h-24 w-24 rounded-full bg-cyan-500 opacity-20"></div>
        <div className="relative inline-flex rounded-full h-20 w-20 bg-slate-800 border-2 border-cyan-500 items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
          <svg 
            className="animate-spin h-10 w-10 text-cyan-400" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>

      {/* Texto de carga */}
      <h2 className="text-xl font-bold text-white tracking-widest uppercase mb-2">
        Cevicheria Mexa
      </h2>
      <p className="text-cyan-400 text-sm animate-pulse">{message}</p>
    </div>
  );
};