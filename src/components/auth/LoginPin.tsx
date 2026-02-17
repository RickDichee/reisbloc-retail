import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAppStore } from '../../store/appStore';
import { Lock, Loader } from 'lucide-react';

/**
 * LoginPin Component
 * 
 * Interfaz de login PIN para acceso al sistema POS
 * - Entrada de PIN de 4-6 dígitos
 * - Validación en tiempo real
 * - Manejo de errores
 * - Detección de dispositivo automática
 * - Feedback visual
 */

export const LoginPin: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading, error: authError } = useAuth();
  
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false); // Estado para feedback de éxito
  
  // Sonido de éxito (Base64 corto para evitar 404)
  const playSuccessSound = () => {
    // Beep válido (Sine wave corto)
    const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU7/3//3/9//3//3/9//3//3/9//3//3/9//3//3/9//3//3/9//3//3/9//3//3/9//3//3/w==');
    audio.volume = 0.5;
    audio.play().catch(e => console.warn('Audio play failed', e));
  };

  // Limpiar errores cuando el usuario escriba
  useEffect(() => {
    if (error) {
      setError('');
    }
  }, [pin]);

  /**
   * Maneja el cambio en el input del PIN
   * - Solo acepta números
   * - Limita a 6 caracteres máximo
   */
  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
    setPin(value);
  };

  /**
   * Maneja el envío del formulario
   * - Valida que el PIN tenga 4-6 dígitos
   * - Detecta información del dispositivo
   * - Llama al servicio de autenticación para validar PIN
   * - Redirige a POS o muestra error
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación básica
    if (!pin) {
      setError('Por favor ingresa tu PIN');
      return;
    }
    
    if (pin.length < 4) {
      setError('El PIN debe tener al menos 4 dígitos');
      return;
    }
    
    setIsValidating(true);
    
    try {
      // Llamar al hook de autenticación (Edge Function)
      const result = await login(pin);
      
      if (result.success) {
        setIsSuccess(true);
        playSuccessSound();

        // Mostrar feedback visual antes de navegar
        setTimeout(() => {
          console.log('✅ Login exitoso, redirigiendo...');
          
          // Si el dispositivo necesita aprobación, App.tsx automáticamente
          // mostrará la pantalla de DeviceVerification sin necesidad de navegar manualmente
          // Solo navegamos si el dispositivo está aprobado
          if (result.device?.isApproved === false) {
            console.log('📱 Dispositivo pendiente de aprobación, esperando...');
            // App.tsx detectará needsDeviceApproval y mostrará DeviceVerification
            return;
          }

          // Redirección inteligente basada en rol (solo si dispositivo aprobado)
          const role = result.user?.role;
          if (role === 'admin' || role === 'supervisor' || role === 'manager') {
            navigate('/admin');
          } else if (role === 'cocina') {
            navigate('/kitchen');
          } else if (role === 'bar') {
            navigate('/bar');
          } else {
            navigate('/pos');
          }
        }, 1000); // Pequeño delay para UX
      } else {
        setError('PIN incorrecto. Intenta de nuevo.');
        setPin('');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error al validar: ${errorMessage}`);
      console.error('Login error:', err);
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * Maneja clics en el teclado numérico
   */
  const handleNumberClick = (num: string) => {
    if (pin.length < 6) {
      setPin(pin + num);
    }
  };

  /**
   * Borra el último dígito
   */
  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  /**
   * Limpia todo el PIN
   */
  const handleClear = () => {
    setPin('');
    setError('');
  };

  const isLoading = loading || isValidating || isSuccess;
  const hasError = error || authError;
  const isValid = pin.length >= 4;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Capa 1: Color de fondo base */}
      <div className="absolute inset-0 bg-slate-900 z-0" />

      {/* Capa 2: Doodle (ahora visible sobre el color base) */}
      <div 
        className="absolute inset-0 z-0 opacity-70 pointer-events-none bg-repeat"
        style={{
          backgroundImage: 'url("/doodle_ceviche.png?v=2")',
          backgroundSize: '300px',
          filter: 'grayscale(100%)'
        }}
      />
      
      {/* Capa 3: Gradiente superior */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-blue-900/20 to-teal-900/20 z-0" />

      {/* Contenedor Principal */}
      <div className="w-full max-w-md relative z-10">
        
        {/* Card de Login */}
        <div className="bg-white rounded-lg shadow-2xl p-8 space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full p-4 shadow-lg shadow-cyan-500/30">
                <Lock className="text-white" size={32} />
              </div>
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-gray-900 uppercase">Reisbloc Retail</h1>
            <p className="text-gray-500 font-medium">Sistema Integral de Ventas</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Input de PIN */}
            <div className="relative">
              <label htmlFor="pin" className="block text-sm font-semibold text-gray-700 mb-3">
                PIN de Acceso
              </label>
              <div className="relative">
                <input
                  id="pin"
                  type={showPassword ? 'text' : 'password'}
                  value={pin}
                  onChange={handlePinChange}
                  placeholder="••••"
                  autoComplete="off"
                  className={`w-full px-4 py-3 text-center text-2xl font-bold letter-spacing: 8px border-2 rounded-lg transition-all ${
                    isSuccess
                      ? 'border-green-500 bg-green-50' : hasError
                      ? 'border-red-500 bg-red-50 focus:border-red-600'
                      : 'border-gray-300 focus:border-blue-500 focus:bg-blue-50'
                  } focus:outline-none`}
                  autoFocus
                  disabled={isLoading}
                />
                {/* Botón mostrar/ocultar */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm"
                  disabled={!pin || isLoading}
                >
                  {showPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              
              {/* Contador de dígitos */}
              <p className="text-xs text-gray-500 mt-2">
                {pin.length} / 6 dígitos
                {pin.length >= 4 && <span className="ml-2 text-green-600">✓ Listo para validar</span>}
              </p>
            </div>

            {/* Teclado Numérico */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleNumberClick(num.toString())}
                    disabled={pin.length >= 6 || isLoading}
                    className="bg-white hover:bg-blue-50 disabled:bg-gray-200 disabled:text-gray-400 text-lg font-semibold py-3 rounded border border-gray-200 transition-colors"
                  >
                    {num}
                  </button>
                ))}
              </div>
              
              {/* Fila de 0 y controles */}
              <div className="grid grid-cols-3 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => handleNumberClick('0')}
                  disabled={pin.length >= 6 || isLoading}
                  className="col-span-1 bg-white hover:bg-blue-50 disabled:bg-gray-200 disabled:text-gray-400 text-lg font-semibold py-3 rounded border border-gray-200 transition-colors"
                >
                  0
                </button>
                
                <button
                  type="button"
                  onClick={handleBackspace}
                  disabled={!pin || isLoading}
                  className="col-span-1 bg-white hover:bg-red-50 disabled:bg-gray-200 disabled:text-gray-400 text-lg font-semibold py-3 rounded border border-gray-200 transition-colors"
                >
                  ← Atrás
                </button>
                
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={!pin || isLoading}
                  className="col-span-1 bg-white hover:bg-orange-50 disabled:bg-gray-200 disabled:text-gray-400 text-lg font-semibold py-3 rounded border border-gray-200 transition-colors"
                >
                  Limpiar
                </button>
              </div>
            </div>

            {/* Mostrar errores */}
            {hasError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700 font-semibold">⚠️ {hasError}</p>
              </div>
            )}

            {/* Botón de Submit */}
            <button
              type="submit"
              disabled={!isValid || isLoading}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                isSuccess
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                  : (isValid && !isLoading)
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-lg active:scale-95'
                    : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {isLoading && <Loader className="animate-spin" size={20} />}
              {isLoading ? 'Validando...' : 'Ingresar'}
            </button>
          </form>

          {/* Información Adicional */}
          <div className="bg-blue-50 rounded-lg p-4 text-sm text-gray-600">
            <p className="font-semibold text-gray-700 mb-2">💡 Información Adicional</p>
            <ul className="space-y-1 text-xs">
              <li>• Tu dispositivo será registrado automáticamente</li>
              <li>• Deberá ser aprobado por un administrador</li>
              <li>• PIN de 4-6 dígitos numéricos</li>
              <li>• Contacta al admin si olvidaste tu PIN</li>
            </ul>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 border-t pt-4">
            <p className="font-bold">v3.7.3</p>
            <p>© 2026 Reisbloc Lab</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPin;
