import React, { useEffect, useState, useCallback } from 'react'
import { AlertCircle, CheckCircle, Clock, Smartphone } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { Device } from '../../types'
import supabaseService from '@/services/supabaseService'

/**
 * DeviceVerification Component
 * 
 * Muestra el estado de verificación del dispositivo
 * - Espera aprobación si el dispositivo no está aprobado
 * - Muestra información del dispositivo
 * - Opción para registrar nuevo dispositivo
 * - Permite reintentar la validación
 */

interface DeviceVerificationProps {
  onDeviceApproved?: () => void;
  autoRetry?: boolean;
  retryInterval?: number;
}

export const DeviceVerification: React.FC<DeviceVerificationProps> = ({
  onDeviceApproved,
  autoRetry = true,
  retryInterval = 5000,
}) => {
  const { currentDevice, currentUser, setCurrentDevice } = useAppStore()
  const [status, setStatus] = useState<'pending' | 'approved' | 'error'>('pending')
  const [retryCount, setRetryCount] = useState(0)
  const [timeElapsed, setTimeElapsed] = useState(0)

  // Poll Supabase for device approval status
  const validateDevice = useCallback(async () => {
    if (!currentDevice?.id || !currentUser?.id) {
      return 'missing'
    }

    try {
      // Get device by ID from Supabase
      const device = await supabaseService.getDeviceById(currentDevice.id)
      if (device && device.isApproved) {
        const updated: Device = {
          ...currentDevice,
          ...device,
          isApproved: true,
          isRejected: false,
        }
        setCurrentDevice(updated)
        setStatus('approved')
        onDeviceApproved?.()
        return 'approved'
      }
      setStatus('pending')
      return 'pending'
    } catch (err: any) {
      console.error('validateDevice error:', err)
      setStatus('error')
      return 'error'
    }
  }, [currentDevice, currentUser, onDeviceApproved, setCurrentDevice])

  /**
   * Simula la comprobación de aprobación del dispositivo
  * En producción, esto consultaría Supabase periódicamente
   */
  useEffect(() => {
    if (!autoRetry) return

    const checkNow = async () => {
      const result = await validateDevice()
      if (result !== 'approved') {
        setRetryCount(prev => prev + 1)
      }
    }

    checkNow()

    const interval = setInterval(() => {
      checkNow()
      setTimeElapsed(prev => prev + retryInterval / 1000)
    }, retryInterval)

    return () => clearInterval(interval)
  }, [autoRetry, retryInterval, validateDevice])

  // UI de Error Específico (útil para detectar problemas de RLS)
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-red-100 rounded-full p-4">
              <AlertCircle className="text-red-600" size={48} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Error de Acceso</h2>
          <p className="text-gray-600">
            No se pudo verificar el dispositivo. Si estás usando un dispositivo compartido, es posible que las reglas de seguridad (RLS) estén bloqueando el acceso.
          </p>
          <button
            onClick={() => { setStatus('pending'); validateDevice(); }}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Reintentar Verificación
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full text-gray-500 text-sm hover:underline"
          >
            Recargar Página
          </button>
        </div>
      </div>
    );
  }

  if (status === 'approved') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-green-100 rounded-full p-4">
              <CheckCircle className="text-green-600" size={48} />
            </div>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-gray-900">¡Dispositivo Aprobado!</h2>
            <p className="text-gray-600 mt-2">Tu dispositivo ha sido autorizado para acceder al sistema</p>
          </div>

          <div className="bg-green-50 rounded-lg p-4 text-left space-y-3">
            <div>
              <p className="text-sm text-gray-600">Dispositivo:</p>
              <p className="font-semibold text-gray-900">{currentDevice?.deviceName || currentDevice?.macAddress || 'Desconocido'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Nombre de Usuario:</p>
              <p className="font-semibold text-gray-900">{currentUser?.username || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Rol:</p>
              <p className="font-semibold text-gray-900 capitalize">{currentUser?.role || 'N/A'}</p>
            </div>
          </div>

          <button
            onClick={() => window.location.href = '/pos'}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Continuar al Sistema →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="bg-blue-100 rounded-full p-4 animate-pulse">
              <Smartphone className="text-blue-600" size={48} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Verificando Dispositivo</h2>
          <p className="text-gray-600">
            Tu dispositivo debe ser aprobado por un administrador
          </p>
        </div>

        {/* Información del Dispositivo */}
        <div className="bg-blue-50 rounded-lg p-4 space-y-3">
          <div>
            <p className="text-sm text-gray-600 font-medium">Nombre del Dispositivo</p>
            <p className="text-gray-900 font-mono text-sm break-all">
              {currentDevice?.deviceName || currentDevice?.macAddress || 'Detectando...'}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600 font-medium">ID del Dispositivo</p>
            <p className="text-gray-900 font-mono text-sm break-all">
              {currentDevice?.id?.substring(0, 12)}...
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 font-medium">MAC Address</p>
            <p className="text-gray-900 font-mono text-sm">
              {currentDevice?.macAddress || 'No disponible'}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 font-medium">Usuario</p>
            <p className="text-gray-900">
              {currentUser?.username || 'N/A'}
            </p>
          </div>
        </div>

        {/* Estado */}
        <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
          <div className="flex gap-3">
            <AlertCircle className="text-yellow-600 flex-shrink-0" size={24} />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Pendiente de Aprobación</p>
              <p className="text-sm text-gray-600 mt-1">
                Por favor, solicita a un administrador que apruebe este dispositivo.
              </p>
            </div>
          </div>
        </div>

        {/* Estadísticas de Reintento */}
        <div className="text-center space-y-2 text-sm">
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <Clock size={16} />
            <span>Revisando cada {retryInterval / 1000}s</span>
          </div>
          <p className="text-gray-500">
            Intentos realizados: <span className="font-semibold">{retryCount}</span>
          </p>
          <p className="text-gray-500">
            Tiempo esperando: <span className="font-semibold">{timeElapsed}s</span>
          </p>
        </div>

        {/* Acciones */}
        <div className="space-y-3 pt-4 border-t">
          <button
            onClick={() => {
              setRetryCount(0);
              setTimeElapsed(0);
              validateDevice();
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            Reintentar Ahora
          </button>
          
          <button
            onClick={() => {
              useAppStore.setState({ isAuthenticated: false });
              window.location.href = '/login';
            }}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 rounded-lg transition-colors"
          >
            Volver a Login
          </button>
        </div>

        {/* Instrucciones para Admin */}
        <div className="bg-indigo-50 rounded-lg p-4 text-sm">
          <p className="font-semibold text-gray-900 mb-2">📋 Para Administradores:</p>
          <ol className="space-y-1 text-gray-600 text-xs">
            <li>1. Ve a Admin Panel → Dispositivos</li>
            <li>2. Busca: {currentUser?.username}</li>
            <li>3. Haz clic en "Aprobar Dispositivo"</li>
            <li>4. El usuario verá el cambio en 5 segundos</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default DeviceVerification;
