import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, Check, Lock, AlertCircle } from 'lucide-react';

export default function OAuthConsent() {
  const [searchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);

  // Datos simulados o desde URL params para el preview
  const clientName = searchParams.get('client_name') || 'Aplicación Externa';
  const scopes = searchParams.get('scope')?.split(' ') || [
    'read:profile',
    'read:sales',
    'offline_access'
  ];
  const redirectUri = searchParams.get('redirect_uri') || '#';
  const state = searchParams.get('state') || '';

  const handleAuthorize = (allowed: boolean) => {
    setIsProcessing(true);
    // Simulamos un pequeño delay de red
    setTimeout(() => {
      if (allowed) {
        // En producción, aquí el backend generaría el code
        const mockAuthCode = `rb_auth_${Math.random().toString(36).substring(2)}_${Date.now()}`;
        window.location.href = `${redirectUri}?code=${mockAuthCode}&state=${state}`;
      } else {
        window.location.href = `${redirectUri}?error=access_denied&state=${state}`;
      }
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-4 font-sans text-gray-100 relative overflow-hidden">
      {/* Background Gradients Ambientales */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-gray-900/90 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/5">

        {/* Header con Logo Animado */}
        <div className="p-8 text-center border-b border-gray-800 bg-gradient-to-b from-gray-800/50 to-transparent">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6 transform hover:scale-105 transition-transform duration-300">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Solicitud de Acceso</h1>
          <p className="text-gray-400 text-sm">
            <span className="font-semibold text-indigo-400">{clientName}</span> quiere conectarse a tu cuenta Reisbloc.
          </p>
        </div>

        {/* Lista de Permisos */}
        <div className="p-8 space-y-6">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              Esta aplicación podrá:
            </h3>
            <ul className="space-y-3">
              {scopes.map((scope, index) => (
                <li key={index} className="flex items-start gap-3 group">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition-colors border border-green-500/20">
                    <Check className="w-3 h-3 text-green-500" />
                  </div>
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                    {formatScope(scope)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Aviso de Seguridad */}
          <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4 flex gap-3 items-start">
            <Lock className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-yellow-500">Conexión Segura</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Tus credenciales de inicio de sesión nunca serán compartidas con {clientName}.
              </p>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="p-6 bg-gray-900 border-t border-gray-800 flex gap-3">
          <button
            onClick={() => handleAuthorize(false)}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-700 text-gray-300 font-medium hover:bg-gray-800 hover:text-white hover:border-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={() => handleAuthorize(true)}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? 'Procesando...' : 'Autorizar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatScope(scope: string): string {
  const map: Record<string, string> = {
    'read:profile': 'Ver tu información de perfil personal',
    'read:sales': 'Consultar historial de ventas y reportes',
    'write:orders': 'Crear y modificar órdenes en tu nombre',
    'offline_access': 'Mantener el acceso sin conexión'
  };
  return map[scope] || `Permiso técnico: ${scope}`;
}