import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useTokens } from '@/hooks/useTokens'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  Coins,
  Zap,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Users,
  Calendar,
  Gift,
  BarChart3,
  DollarSign,
  Package
} from 'lucide-react'
import { supabase } from '@/config/supabase'

interface TokenUsage {
  date: string
  usage: number
  feature: string
}

export default function Dashboard() {
  const { currentUser } = useAppStore()
  const { isAdmin } = usePermissions()
  const { balance, transactions, fetchTransactions } = useTokens()
  const { planLimits, getLimit } = usePlanLimits()

  const [usageHistory, setUsageHistory] = useState<TokenUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [productCount, setProductCount] = useState(0)
  const [employeeCount, setEmployeeCount] = useState(0)
  const [salesToday, setSalesToday] = useState(0)
  const [salesMonth, setSalesMonth] = useState(0)

  useEffect(() => {
    if (!currentUser) return
    loadAnalytics()
  }, [currentUser])

  const loadAnalytics = async () => {
    if (!currentUser?.organizationId) return
    setLoading(true)

    try {
      await fetchTransactions()

      const today = new Date().toISOString().split('T')[0]
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const [productsData, employeesData, salesData] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('organization_id', currentUser.organizationId),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('organization_id', currentUser.organizationId),
        supabase.from('sales').select('total').eq('organization_id', currentUser.organizationId).gte('created_at', monthStart)
      ])

      setProductCount(productsData.count || 0)
      setEmployeeCount(employeesData.count || 0)

      const monthlySales = salesData.data?.reduce((sum, s) => sum + (s.total || 0), 0) || 0
      setSalesMonth(monthlySales)

      const todaySales = salesData.data?.filter((s: any) => s.created_at?.startsWith(today)) || []
      setSalesToday(todaySales.reduce((sum: number, s: any) => sum + (s.total || 0), 0))

      if (transactions.length > 0) {
        const usageByDate = transactions.reduce((acc: Record<string, TokenUsage>, t) => {
          const date = t.created_at.split('T')[0]
          if (!acc[date]) acc[date] = { date, usage: 0, feature: 'ai_chat' }
          if (t.type === 'usage') acc[date].usage += Math.abs(t.amount)
          return acc
        }, {})
        setUsageHistory(Object.values(usageByDate).slice(0, 7).reverse())
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!currentUser) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/pos" replace />

  const todayUsage = usageHistory.length > 0 ? usageHistory[usageHistory.length - 1]?.usage || 0 : 0
  const weeklyUsage = usageHistory.reduce((sum, u) => sum + u.usage, 0)
  const planDailyLimit = planLimits?.aiTokensPerDay || 20
  const planMonthlyLimit = planLimits?.aiTokensPerMonth || 60

  const getUsagePercentage = (current: number, limit: number) => Math.min(100, Math.round((current / limit) * 100))
  const getUsageColor = (current: number, limit: number) => {
    const pct = (current / limit) * 100
    if (pct >= 90) return 'bg-red-500'
    if (pct >= 70) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Resumen de tu negocio
            </p>
          </div>
          <button
            onClick={loadAnalytics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>

        {/* Sales Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign size={20} className="text-white/80" />
              <span className="text-white/80 text-sm font-medium">Ventas Hoy</span>
            </div>
            <p className="text-3xl font-black">{currency.format(salesToday)}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp size={20} className="text-white/80" />
              <span className="text-white/80 text-sm font-medium">Ventas del Mes</span>
            </div>
            <p className="text-3xl font-black">{currency.format(salesMonth)}</p>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <Coins size={20} className="text-white/80" />
              <span className="text-white/80 text-sm font-medium">Tokens AI</span>
            </div>
            <p className="text-3xl font-black">{balance}</p>
            <p className="text-xs text-white/70 mt-1">{planDailyLimit}/día • {planMonthlyLimit}/mes</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-xl">
                <Zap size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase">Uso Hoy</p>
                <p className="text-2xl font-black text-slate-900">{todayUsage}</p>
              </div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${getUsageColor(todayUsage, planDailyLimit)}`} style={{ width: `${getUsagePercentage(todayUsage, planDailyLimit)}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-2">de {planDailyLimit} tokens diarios</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-xl">
                <Calendar size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase">Esta Semana</p>
                <p className="text-2xl font-black text-slate-900">{weeklyUsage}</p>
              </div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${getUsageColor(weeklyUsage, planMonthlyLimit)}`} style={{ width: `${getUsagePercentage(weeklyUsage, planMonthlyLimit)}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-2">de {planMonthlyLimit} tokens mensuales</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Package size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase">Productos</p>
                <p className="text-2xl font-black text-slate-900">{productCount}</p>
              </div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${getUsageColor(productCount, getLimit('products'))}`} style={{ width: `${getUsagePercentage(productCount, getLimit('products'))}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-2">de {getLimit('products')} productos</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <Users size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase">Empleados</p>
                <p className="text-2xl font-black text-slate-900">{employeeCount}</p>
              </div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${getUsageColor(employeeCount, getLimit('employees'))}`} style={{ width: `${getUsagePercentage(employeeCount, getLimit('employees'))}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-2">de {getLimit('employees')} empleados</p>
          </div>
        </div>

        {/* Limits Warning */}
        {(productCount >= getLimit('products') || employeeCount >= getLimit('employees')) && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-600" />
            <div>
              <p className="font-bold text-red-700">Estás cerca de alcanzar un límite</p>
              <p className="text-sm text-red-600">Considera mejorar tu plan para más capacidad</p>
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <BarChart3 size={20} className="text-slate-400" />
            <h3 className="font-black text-slate-900 uppercase">Uso de Tokens</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Coins size={32} className="mx-auto mb-2 opacity-50" />
                <p>No hay transacciones aún</p>
                <p className="text-sm">Usa el IA Agent para comenzar</p>
              </div>
            ) : (
              transactions.slice(0, 10).map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${tx.type === 'usage' ? 'bg-red-50 text-red-600' : tx.type === 'purchase' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {tx.type === 'usage' ? <Zap size={16} /> : tx.type === 'purchase' ? <Coins size={16} /> : <Gift size={16} />}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{tx.description || tx.feature || 'Transacción'}</p>
                      <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`font-bold ${tx.type === 'usage' ? 'text-red-600' : tx.type === 'purchase' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {tx.type === 'usage' ? '-' : '+'}{Math.abs(tx.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}