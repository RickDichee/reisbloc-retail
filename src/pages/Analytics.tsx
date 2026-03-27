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
  ShoppingBag,
  Users,
  Receipt,
  Calendar,
  Gift
} from 'lucide-react'
import { supabase } from '@/config/supabase'

interface TokenUsage {
  date: string
  usage: number
  feature: string
}

export default function Analytics() {
  const { currentUser } = useAppStore()
  const { isAdmin } = usePermissions()
  const { balance, transactions, fetchTransactions } = useTokens()
  const { planName, planLimits, getLimit } = usePlanLimits()

  const [usageHistory, setUsageHistory] = useState<TokenUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [productCount, setProductCount] = useState(0)
  const [employeeCount, setEmployeeCount] = useState(0)

  useEffect(() => {
    if (!currentUser) return
    loadAnalytics()
  }, [currentUser])

  const loadAnalytics = async () => {
    if (!currentUser?.organizationId) return
    setLoading(true)

    try {
      // Load token transactions
      await fetchTransactions()

      // Get product count
      const { count: products } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentUser.organizationId)
      setProductCount(products || 0)

      // Get employee count
      const { count: employees } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentUser.organizationId)
      setEmployeeCount(employees || 0)

      // Calculate usage from transactions
      if (transactions.length > 0) {
        const usageByDate = transactions.reduce((acc: Record<string, TokenUsage>, t) => {
          const date = t.created_at.split('T')[0]
          if (!acc[date]) {
            acc[date] = { date, usage: 0, feature: 'ai_chat' }
          }
          if (t.type === 'usage') {
            acc[date].usage += Math.abs(t.amount)
          }
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

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              Analytics
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Monitorea tu uso de recursos y tokens
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

        {/* Token Balance Card - Destacado */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur">
                <Coins size={32} className="text-white" />
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">Tu Balance de Tokens</p>
                <p className="text-5xl font-black">{balance}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/80 text-sm">Plan {planName}</p>
              <p className="text-lg font-bold">{planDailyLimit} tokens/día</p>
              <p className="text-sm text-white/70">{planMonthlyLimit} tokens/mes</p>
            </div>
          </div>
          
          {/* Today's usage bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Uso hoy</span>
              <span>{todayUsage} / {planDailyLimit} tokens</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getUsageColor(todayUsage, planDailyLimit)}`}
                style={{ width: `${getUsagePercentage(todayUsage, planDailyLimit)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Usage Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Daily Usage */}
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
              <div
                className={`h-full rounded-full ${getUsageColor(todayUsage, planDailyLimit)}`}
                style={{ width: `${getUsagePercentage(todayUsage, planDailyLimit)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">de {planDailyLimit} tokens diarios</p>
          </div>

          {/* Weekly Usage */}
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
              <div
                className={`h-full rounded-full ${getUsageColor(weeklyUsage, planMonthlyLimit)}`}
                style={{ width: `${getUsagePercentage(weeklyUsage, planMonthlyLimit)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">de {planMonthlyLimit} tokens mensuales</p>
          </div>

          {/* Products */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-xl">
                <ShoppingBag size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase">Productos</p>
                <p className="text-2xl font-black text-slate-900">{productCount}</p>
              </div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${getUsageColor(productCount, getLimit('products'))}`}
                style={{ width: `${getUsagePercentage(productCount, getLimit('products'))}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">de {getLimit('products')} productos</p>
          </div>

          {/* Employees */}
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
              <div
                className={`h-full rounded-full ${getUsageColor(employeeCount, getLimit('employees'))}`}
                style={{ width: `${getUsagePercentage(employeeCount, getLimit('employees'))}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">de {getLimit('employees')} empleados</p>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <TrendingUp size={20} className="text-slate-400" />
            <h3 className="font-black text-slate-900 uppercase">Historial de Tokens</h3>
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
                    <div className={`p-2 rounded-xl ${
                      tx.type === 'usage' ? 'bg-red-50 text-red-600' :
                      tx.type === 'purchase' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {tx.type === 'usage' ? <Zap size={16} /> :
                       tx.type === 'purchase' ? <Coins size={16} /> :
                       <Gift size={16} />}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{tx.description || tx.feature || 'Transacción'}</p>
                      <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`font-bold ${
                    tx.type === 'usage' ? 'text-red-600' :
                    tx.type === 'purchase' ? 'text-emerald-600' :
                    'text-amber-600'
                  }`}>
                    {tx.type === 'usage' ? '-' : '+'}{Math.abs(tx.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Plan Limits */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <Receipt size={20} className="text-slate-400" />
            <h3 className="font-black text-slate-900 uppercase">Límites de tu Plan {planName}</h3>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <p className="text-2xl font-black text-slate-900">{getLimit('products')}</p>
              <p className="text-xs text-slate-500 uppercase">Productos</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <p className="text-2xl font-black text-slate-900">{getLimit('employees')}</p>
              <p className="text-xs text-slate-500 uppercase">Empleados</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <p className="text-2xl font-black text-slate-900">{getLimit('registers')}</p>
              <p className="text-xs text-slate-500 uppercase">Cajas</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <p className="text-2xl font-black text-slate-900">{planLimits?.aiTokensPerDay || 0}</p>
              <p className="text-xs text-slate-500 uppercase">AI/día</p>
            </div>
          </div>
          {(productCount >= getLimit('products') || employeeCount >= getLimit('employees')) && (
            <div className="p-4 bg-red-50 border-t border-red-100">
              <div className="flex items-center gap-3 text-red-700">
                <AlertTriangle size={20} />
                <div>
                  <p className="font-bold">Estás cerca de alcanzar un límite</p>
                  <p className="text-sm">Considera mejorar tu plan para más capacidad</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
