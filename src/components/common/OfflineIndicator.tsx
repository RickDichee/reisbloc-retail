import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { syncService } from '@/services/syncService';
import { offlineStorage } from '@/services/offlineStorage';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

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
    };

    const updatePendingCount = async () => {
      const pending = await offlineStorage.getPendingSyncOperations();
      setPendingCount(pending.length);
    };

    // Auto update count
    const interval = setInterval(updatePendingCount, 5000);
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

  if (isOnline && pendingCount === 0 && !isSyncing) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 transition-all duration-300 ${isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
      {isSyncing ? (
        <RefreshCw size={20} className="animate-spin text-emerald-600" />
      ) : !isOnline ? (
        <WifiOff size={20} className="text-amber-600" />
      ) : (
        <Wifi size={20} className="text-emerald-600" />
      )}

      <div className="flex flex-col">
        <span className="font-semibold text-sm">
          {!isOnline ? 'Modo Sin Conexión' : isSyncing ? 'Sincronizando con la Nube...' : 'Conexión Restablecida'}
        </span>
        {!isOnline && pendingCount > 0 && (
          <span className="text-xs opacity-80">
            {pendingCount} operacion{pendingCount > 1 ? 'es' : ''} pendiente{pendingCount > 1 ? 's' : ''} de envío
          </span>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;
