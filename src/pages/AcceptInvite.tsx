import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/config/supabase'
import logger from '@/utils/logger'
import { Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function AcceptInvite() {
    const [searchParams] = useSearchParams()
    const [status, setStatus] = useState<'verifying' | 'form' | 'success' | 'error'>('verifying')
    const [inviteData, setInviteData] = useState<any>(null)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const navigate = useNavigate()

    const token = searchParams.get('token')

    useEffect(() => {
        if (token) {
            verifyToken()
        } else {
            checkNativeSession()
        }
    }, [token])

    const checkNativeSession = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session && session.user) {
                const user = session.user
                const orgId = user.user_metadata?.organization_id || user.user_metadata?.organizationId
                const role = user.user_metadata?.role

                if (orgId) {
                    const { data: orgData } = await supabase
                        .from('organizations')
                        .select('name')
                        .eq('id', orgId)
                        .maybeSingle()

                    setInviteData({
                        email: user.email,
                        organization_id: orgId,
                        role: role || 'employee',
                        organization: {
                            name: orgData?.name || 'Reisbloc POS'
                        },
                        isNative: true
                    })
                    setStatus('form')
                    return
                }
            }
            setStatus('error')
            setErrorMessage('Token de invitación no encontrado o sesión no válida.')
        } catch (err: any) {
            logger.error('invite', 'Error checking native invite session', err)
            setStatus('error')
            setErrorMessage(err.message)
        }
    }

    const verifyToken = async () => {
        try {
            // Consultamos la tabla de invitaciones (asumiendo que existe)
            // Generamos el hash del token para comparar (SHA-256)
            const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token!))
                .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));

            const { data, error } = await supabase
                .from('organization_invites')
                .select('*, organization:organizations(name)')
                .eq('token_hash', tokenHash)
                .eq('status', 'pending')
                .single()

            if (error || !data) {
                throw new Error('Invitación inválida, expirada o ya utilizada.')
            }

            setInviteData(data)
            setStatus('form')
        } catch (err: any) {
            logger.error('invite', 'Error verifying token', err)
            setStatus('error')
            setErrorMessage(err.message)
        }
    }

    const handleAccept = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            alert('Las contraseñas no coinciden')
            return
        }
        if (password.length < 8) {
            alert('La contraseña debe tener al minímo 8 caracteres')
            return
        }

        setLoading(true)
        try {
            if (inviteData.isNative) {
                // Flujo A: Invitación Nativa de Supabase
                // El usuario ya está logueado por el token en el fragmento hash, actualizamos su contraseña
                const { error: authError } = await supabase.auth.updateUser({
                    password: password
                })
                if (authError) throw authError

                // Vincular el perfil de la base de datos
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { error: profileError } = await supabase
                        .from('users')
                        .update({
                            organization_id: inviteData.organization_id,
                            role: inviteData.role,
                            active: true
                        })
                        .eq('id', user.id)

                    if (profileError) {
                        logger.error('invite', 'Error linking native public profile to organization', profileError)
                    }
                }
            } else {
                // Flujo B: Invitación por Link/Token Personalizado
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: inviteData.email,
                    password: password,
                })
                if (authError) throw authError

                // Vincular el perfil público insertado por el trigger con la organización y rol correctos
                if (authData.user) {
                    const { error: profileError } = await supabase
                        .from('users')
                        .update({
                            organization_id: inviteData.organization_id,
                            role: inviteData.role,
                            active: true
                        })
                        .eq('id', authData.user.id)

                    if (profileError) {
                        logger.error('invite', 'Error linking public profile to organization', profileError)
                    }
                }

                // Notificar al backend que la invitación fue aceptada
                const { error: inviteUpdateError } = await supabase
                    .from('organization_invites')
                    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
                    .eq('id', inviteData.id)

                if (inviteUpdateError) logger.warn('invite', 'No se pudo marcar invitación como aceptada', inviteUpdateError)
            }

            setStatus('success')
            setTimeout(() => navigate('/login'), 3000)
        } catch (err: any) {
            logger.error('invite', 'Error accepting invite', err)
            alert(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden p-10">

                {status === 'verifying' && (
                    <div className="text-center space-y-4">
                        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
                        <h2 className="text-2xl font-black text-slate-900 uppercase">Verificando invitación</h2>
                        <p className="text-slate-500 font-medium">Espera un momento mientras validamos el acceso...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                            <XCircle size={40} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-slate-900 uppercase">Enlace Inválido</h2>
                            <p className="text-slate-500 font-medium">{errorMessage}</p>
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
                        >
                            Ir al Login
                        </button>
                    </div>
                )}

                {status === 'form' && (
                    <div className="space-y-8">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <Shield size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase leading-none">Únete a {inviteData.organization?.name}</h2>
                            <p className="text-slate-500 font-medium pt-2">Completa tu perfil para empezar a operar.</p>
                        </div>

                        <form onSubmit={handleAccept} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email</label>
                                <input
                                    type="text"
                                    value={inviteData.email}
                                    disabled
                                    className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold text-slate-400 cursor-not-allowed"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nueva Contraseña</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Mínimo 8 caracteres"
                                    className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold text-slate-900 focus:border-indigo-500 focus:bg-white transition-all outline-none"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Confirmar Contraseña</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repite tu contraseña"
                                    className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold text-slate-900 focus:border-indigo-500 focus:bg-white transition-all outline-none"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0"
                            >
                                {loading ? 'Procesando...' : 'Activar mi cuenta'}
                            </button>
                        </form>
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-center space-y-6 animate-fadeIn">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle size={40} className="animate-bounce" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-slate-900 uppercase">¡Cuenta Activada!</h2>
                            <p className="text-slate-500 font-medium">Te has unido exitosamente al equipo. Redirigiendo al login...</p>
                        </div>
                        <div className="pt-4 flex flex-col items-center">
                            <Loader2 className="animate-spin text-slate-300" />
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}
