import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/config/supabase'
import { BRANDING } from '@/config/branding'
import {
  Gift,
  Users,
  Copy,
  CheckCircle,
  TrendingUp,
  Loader2,
  QrCode,
  MessageCircle,
  Mail
} from 'lucide-react'

interface ReferralStats {
  total_referrals: number
  successful_referrals: number
  pending_referrals: number
  total_credits_earned: number
  total_credits_used: number
}

interface Referral {
  id: string
  referred_email: string
  referred_name: string
  status: 'pending' | 'signed_up' | 'active' | 'churned'
  reward_earned: number
  created_at: string
  activated_at: string | null
}

export default function ReferralProgram() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [copied, setCopied] = useState(false)

  const referralCode = `RBL-${user?.id?.slice(0, 8).toUpperCase() || 'USER'}`
  const referralLink = `https://app.reisbloc.com/register?ref=${referralCode}`

  const loadReferralData = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      const [statsRes, referralsRes] = await Promise.all([
        supabase.rpc('get_referral_stats', { p_user_id: user.id }),
        supabase
          .from('referrals')
          .select('*')
          .eq('referrer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
      ])

      if (statsRes.data) {
        setStats(statsRes.data)
      }

      if (referralsRes.data) {
        setReferrals(referralsRes.data)
      }
    } catch (error) {
      console.error('Error loading referral data:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadReferralData()
  }, [loadReferralData])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying:', error)
    }
  }

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `¡Hey! 👋\n\nEstoy usando ${BRANDING.appWithBrand} para mi negocio y me está encantado. Es un sistema de punto de venta que funciona sin internet y tiene IA integrada.\n\nSi lo pruebas con mi código "${referralCode}", ambos obtenemos crédito gratis.\n\nRegistro aquí: ${referralLink}\n\n¡Salud!`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`¡Prueba ${BRANDING.appWithBrand} - Sistema de POS inteligente!`)
    const body = encodeURIComponent(
      `¡Hola!\n\nEstoy usando ${BRANDING.appWithBrand} para mi negocio y me está funcionando muy bien. Es un sistema de punto de venta que funciona sin internet y tiene IA integrada.\n\nSi te registras con mi código "${referralCode}", ambos obtenemos crédito gratis para usar la plataforma.\n\nRegistro aquí: ${referralLink}\n\n¡Salud!`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
  }

  const handleGenerateQR = () => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(referralLink)}`
    window.open(qrUrl, '_blank')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">Pendiente</span>
      case 'signed_up':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Registrado</span>
      case 'active':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Activo</span>
      case 'churned':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">Inactivo</span>
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">{status}</span>
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur">
              <Gift size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Programa de Referidos</h1>
              <p className="text-white/80">Recomienda y gana créditos gratis</p>
            </div>
          </div>

          {/* Referral Link Card */}
          <div className="bg-white rounded-3xl p-6 text-slate-900">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-500">Tu código de referido</span>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 font-bold rounded-lg">
                {referralCode}
              </span>
            </div>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 px-4 py-3 bg-slate-100 rounded-xl text-sm font-mono text-slate-600 truncate"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2 transition-colors"
              >
                {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors"
              >
                <MessageCircle size={18} />
                WhatsApp
              </button>
              <button
                onClick={handleShareEmail}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl transition-colors"
              >
                <Mail size={18} />
                Email
              </button>
              <button
                onClick={handleGenerateQR}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition-colors"
              >
                <QrCode size={18} />
                QR Code
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Users size={20} className="text-indigo-600" />
              <span className="text-sm text-slate-500">Total</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats?.total_referrals || 0}</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle size={20} className="text-green-600" />
              <span className="text-sm text-slate-500">Activos</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{stats?.successful_referrals || 0}</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp size={20} className="text-amber-600" />
              <span className="text-sm text-slate-500">Ganado</span>
            </div>
            <p className="text-3xl font-bold text-amber-600">${stats?.total_credits_earned || 0}</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Gift size={20} className="text-purple-600" />
              <span className="text-sm text-slate-500">Usado</span>
            </div>
            <p className="text-3xl font-bold text-purple-600">${stats?.total_credits_used || 0}</p>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">¿Cómo funciona?</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold shrink-0">1</div>
              <div>
                <h3 className="font-semibold text-slate-900">Comparte tu link o código</h3>
                <p className="text-slate-500 text-sm">Envía tu link personalizado a otros comerciantes que conozcas.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold shrink-0">2</div>
              <div>
                <h3 className="font-semibold text-slate-900">Ellos se registran</h3>
                <p className="text-slate-500 text-sm">Cuando alguien se registra con tu código, ambos obtienen $200 de crédito.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold shrink-0">3</div>
              <div>
                <h3 className="font-semibold text-slate-900">Ellos pagan su primera cuenta</h3>
                <p className="text-slate-500 text-sm">Cuando tu referido paga su primer mes, ganas $500 adicionales.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <p className="text-amber-800 text-sm font-medium">
              💡 <strong>Tip:</strong> Los comerciantes en Moroleón que usan sistemas POS están buscando mejoras. 
              ¡Son tus mejores prospectos de referido!
            </p>
          </div>
        </div>

        {/* Rewards Table */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Tus Referidos</h2>
            <span className="text-sm text-slate-500">{referrals.length} total</span>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="animate-spin mx-auto text-slate-400" size={32} />
            </div>
          ) : referrals.length === 0 ? (
            <div className="p-8 text-center">
              <Users size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 mb-2">Aún no tienes referidos</p>
              <p className="text-sm text-slate-400">¡Comparte tu link y empieza a ganar!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {referrals.map((referral) => (
                <div key={referral.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                      {referral.referred_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{referral.referred_name || 'Sin nombre'}</p>
                      <p className="text-sm text-slate-500">{referral.referred_email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      {referral.reward_earned > 0 && (
                        <p className="font-bold text-green-600">+${referral.reward_earned}</p>
                      )}
                    </div>
                    {getStatusBadge(referral.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Terms */}
        <div className="mt-8 text-center text-sm text-slate-400">
          <p>
            El crédito de referido solo aplica para nuevos usuarios. 
            El referred debe permanecer activo por 30 días para que el reward sea liberado.
          </p>
        </div>
      </div>
    </div>
  )
}
