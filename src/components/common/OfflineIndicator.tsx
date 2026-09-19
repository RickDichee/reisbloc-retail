import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, X } from 'lucide-react';
import { syncService } from '@/services/syncService';
import { offlineStorage } from '@/services/offlineStorage';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      try {
        await syncService.processQueue();
      } finally {
        setIsSyncing(false);
        updatePendingCount();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsDismissed(false);
    };

    const updatePendingCount = async () => {
      try {
        const pending = await offlineStorage.getPendingSyncOperations();
        setPendingCount(pending.length);

        // Si hay conexión y tareas pendientes, sincronizar en segundo plano sin mostrar alertas invasivas
        if (navigator.onLine && pending.length > 0 && !(syncService as any).isSyncing) {
          syncService.processQueue();
        }
      } catch {
        // Silencioso
      }
    };

    // Auto update count
    const interval = setInterval(updatePendingCount, 15000);
    updatePendingCount();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Custom event fired by syncService when finished
    const syncListener = () => {
      setIsSyncing(false);
      updatePendingCount();
    };
    window.addEventListener('reisbloc-sync-completed', syncListener);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('reisbloc-sync-completed', syncListener);
      clearInterval(interval);
    };
  }, []);

  // Si estamos en línea y no está sincronizando activamente, o si el usuario lo descartó, NO mostrar nada
  if ((isOnline && !isSyncing) || isDismissed) return null;

  return (
    <div className={`fixed bottom-20 md:bottom-4 right-4 z-[9999] px-3.5 py-2.5 rounded-xl shadow-xl flex items-center gap-3 transition-all duration-300 border ${
      !isOnline
        ? 'bg-amber-950/95 text-amber-200 border-amber-500/40 backdrop-blur-md'
        : 'bg-slate-900/95 text-teal-300 border-teal-500/40 backdrop-blur-md'
    }`}>
      {isSyncing ? (
        <RefreshCw size={16} className="animate-spin text-teal-400 shrink-0" />
      ) : (
        <WifiOff size={16} className="text-amber-400 shrink-0" />
      )}

      <div className="flex flex-col min-w-0 pr-1">
        <span className="font-bold text-xs leading-tight">
          {isSyncing ? 'Sincronizando con la nube...' : 'Modo Sin Conexión'}
        </span>
        {!isOnline && pendingCount > 0 && (
          <span className="text-[10px] text-amber-300/80 leading-tight mt-0.5 font-medium">
            {pendingCount} operación{pendingCount > 1 ? 'es' : ''} pendiente{pendingCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors shrink-0 ml-0.5"
        aria-label="Cerrar aviso"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default OfflineIndicator;
