import React from 'react';
import { BRANDING } from '@/config/branding';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Cargando sistema...' }) => {
  const theme = BRANDING.theme;
  const isFestive = Boolean(theme.loadingBg);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-slate-900"
      style={theme.loadingBg ? { backgroundImage: theme.loadingBg } : undefined}
    >
      {/* Decoración festiva para tenants con loadingBg (navideño u otro) */}
      {isFestive && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-8 left-8 text-5xl opacity-20">🎄</div>
          <div className="absolute top-12 right-8 text-4xl opacity-15">⭐</div>
          <div className="absolute bottom-16 left-6 text-4xl opacity-15">🎁</div>
          <div className="absolute bottom-12 right-8 text-5xl opacity-15">🧸</div>
        </div>
      )}

      {/* Efecto de pulso en el logo o círculo */}
      <div className="relative flex items-center justify-center mb-8">
        <div className="absolute animate-ping inline-flex h-24 w-24 rounded-full bg-[var(--primary)] opacity-20"></div>
        <div
          className="relative inline-flex rounded-full h-20 w-20 bg-slate-800 border-2 border-[var(--primary)] items-center justify-center overflow-hidden"
          style={{ boxShadow: '0 0 20px color-mix(in srgb, var(--primary) 50%, transparent)' }}
        >
          <img src={BRANDING.logoUrl} alt={BRANDING.whiteLabelName} className="h-full w-full object-cover" />
        </div>
      </div>

      {/* Texto de carga */}
      <h2
        className="text-xl font-bold tracking-widest uppercase mb-2 text-white"
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        {BRANDING.loadingTitle}
      </h2>
      <p className="text-sm animate-pulse text-[var(--on-primary-soft)]">{message}</p>
    </div>
  );
};
