import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/config/supabase'
import { pollForOrganization } from '@/services/authService'
import { ShieldCheck } from 'lucide-react'

const LOADING_TIPS = [
  "🔐 Encriptando conexión de grado militar...",
  "👤 Verificando identidad con Google...",
  "🏢 Preparando tu bóveda digital...",
  "🚀 Afinando los motores del POS...",
  "🛡️ Cargando módulos de seguridad...",
  "📡 Estableciendo enlace seguro...",
  "☁️ Sincronizando catálogos...",
  "✅ Validando permisos de acceso..."
]

export function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string | null>(null)
  const [tipIndex, setTipIndex] = useState(0)

  // Efecto para rotar mensajes de carga
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % LOADING_TIPS.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleAuthCallback = async () => {
      // 1. Obtener sesión actual (Supabase ya procesó el código de Google en la URL)
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session?.user) {
        console.error('Error en callback:', error)
        navigate('/login?error=auth_failed')
        return
      }

      // 2. Verificar si el usuario ya tiene organización (Esperando al Webhook)
      
      // Aquí usamos el "Backoff" que programamos
      const orgId = await pollForOrganization(session.user.id)

      if (orgId) {
        // ✅ Éxito: Webhook completó la creación de la Org
        setStatus('¡Verificación exitosa! Accediendo...')
        // Pequeña pausa para que el usuario lea el mensaje
        setTimeout(() => navigate('/admin'), 800)
      } else {
        // ⚠️ Timeout: La Edge Function tardó demasiado o falló
        console.warn('Timeout esperando organization_id')
        // Redirigir al login con error claro en lugar de dejarlo en el limbo
        // Esto fuerza al usuario a intentar de nuevo, disparando el webhook otra vez si falló
        navigate('/login?error=setup_timeout') 
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
          {/* Icono de Seguridad para reforzar la confianza */}
          <ShieldCheck className="w-16 h-16 text-emerald-400 animate-bounce relative z-10" />
        </div>
        
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-white">Verificación de Seguridad</h2>
          <p className="text-slate-400 animate-pulse font-mono text-sm min-h-[20px]">
            {status || LOADING_TIPS[tipIndex]}
          </p>
        </div>
      </div>
    </div>
  )
}