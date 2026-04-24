import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/config/supabase'
import { logSuccessfulLogin } from '@/services/authService'
import { ShieldCheck } from 'lucide-react'

const LOADING_TIPS = [
  "Verificando identidad...",
  "Preparando tu cuenta...",
  "Casi listo...",
]

export function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % LOADING_TIPS.length)
    }, 1500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus('Iniciando sesion...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
          console.error('Error en callback:', sessionError)
          navigate('/login?error=auth_failed')
          return
        }

        const user = session.user
        setStatus('Verificando organizacion...')

        const { data: existingUser } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .single()

        if (existingUser?.organization_id) {
          setStatus('Organizacion encontrada!')
          await logSuccessfulLogin().catch(console.error)
          setTimeout(() => navigate('/admin'), 500)
          return
        }

        setStatus('Creando organizacion...')
        
        const orgName = user.user_metadata?.full_name 
          ? `Negocio de ${user.user_metadata.full_name}` 
          : 'Mi Negocio'

        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: orgName,
            plan: 'free',
            active: true
          })
          .select('id')
          .single()

        if (orgError) {
          console.error('Error creando org:', orgError)
          const { data: existingOrg } = await supabase
            .from('organizations')
            .select('id')
            .limit(1)
            .single()
          
          if (existingOrg) {
            await supabase.from('users').insert({
              id: user.id,
              name: user.user_metadata?.full_name || user.email,
              role: 'admin',
              active: true,
              organization_id: existingOrg.id,
              is_primary_admin: true,
              is_primary_user: true
            })
            setTimeout(() => navigate('/admin'), 500)
            return
          }
        }

        if (newOrg) {
          await supabase.from('users').insert({
            id: user.id,
            name: user.user_metadata?.full_name || user.email,
            role: 'admin',
            active: true,
            organization_id: newOrg.id,
            is_primary_admin: true,
            is_primary_user: true
          })
        }

        setStatus('Listo!')
        await logSuccessfulLogin().catch(console.error)
        setTimeout(() => navigate('/admin'), 500)

      } catch (err: any) {
        console.error('Auth callback error:', err)
        setError(err.message || 'Error al iniciar sesion')
        setTimeout(() => navigate('/login?error=auth_failed'), 2000)
      }
    }

    handleAuthCallback()
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0B0B] text-white p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0B0B] text-white p-4">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
          <ShieldCheck className="w-16 h-16 text-emerald-400 animate-bounce relative z-10" />
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-white">Bienvenido!</h2>
          <p className="text-gray-400 animate-pulse font-mono text-sm">
            {status || LOADING_TIPS[tipIndex]}
          </p>
        </div>
      </div>
    </div>
  )
}