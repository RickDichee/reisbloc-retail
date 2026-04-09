import { useState, useEffect } from 'react'
import { 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign,
  Database,
  HardDrive,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Megaphone,
  Calculator,
  Bot
} from 'lucide-react'
import { supabase } from '@/config/supabase'
import { useAppStore } from '@/store/appStore'
import logger from '@/utils/logger'

interface Metrics {
  organizations: {
    total: number
    active: number
    inactive: number
    paying: number
    free: number
  }
  revenue: {
    mrr: number
    payingCustomers: number
    arpu: number
  }
  costs: {
    supabase: number
    storage: number
    database: number
  }
  ai: {
    queriesToday: number
    queriesMonth: number
    estimatedCost: number
  }
}

interface Alert {
  level: 'critical' | 'warning' | 'notice'
  metric: string
  message: string
  value: number
  limit?: number
}

const THRESHOLDS = {
  organizations: { warning: 40, critical: 50 },
  supabaseCost: { warning: 20, critical: 25 },
  storage: { warning: 800, critical: 1000 }, // MB
  database: { warning: 400, critical: 500 }, // MB
}

export default function AnalyticsDashboard() {
  useAppStore() // For potential future use
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    organizations: true,
    revenue: true,
    costs: true,
    ai: false
  })

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      // Get organization counts
      const { count: totalOrgs } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })

      // Get user counts per org (for activity)
      const { data: activeOrgs } = await supabase
        .from('organizations')
        .select('id')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      // Get paying orgs (those with active subscriptions)
      const { count: payingOrgs } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // Mock data for demo (replace with real queries)
      const mockMetrics: Metrics = {
        organizations: {
          total: totalOrgs || 0,
          active: activeOrgs?.length || 0,
          inactive: (totalOrgs || 0) - (activeOrgs?.length || 0),
          paying: payingOrgs || 0,
          free: (totalOrgs || 0) - (payingOrgs || 0)
        },
        revenue: {
          mrr: (payingOrgs || 0) * 149,
          payingCustomers: payingOrgs || 0,
          arpu: 149
        },
        costs: {
          supabase: 23,
          storage: 850,
          database: 450
        },
        ai: {
          queriesToday: 234,
          queriesMonth: 4521,
          estimatedCost: 226
        }
      }

      setMetrics(mockMetrics)
      setLastUpdated(new Date())
      generateAlerts(mockMetrics)

    } catch (error) {
      logger.error('analytics', 'Error fetching metrics', error as any)
    } finally {
      setLoading(false)
    }
  }

  const generateAlerts = (m: Metrics) => {
    const newAlerts: Alert[] = []

    // Organizations
    if (m.organizations.total >= THRESHOLDS.organizations.critical) {
      newAlerts.push({
        level: 'critical',
        metric: 'organizations',
        message: `Límite de organizaciones alcanzado (${m.organizations.total}/${THRESHOLDS.organizations.critical})`,
        value: m.organizations.total,
        limit: THRESHOLDS.organizations.critical
      })
    } else if (m.organizations.total >= THRESHOLDS.organizations.warning) {
      newAlerts.push({
        level: 'warning',
        metric: 'organizations',
        message: `Organizaciones cerca del límite (${m.organizations.total}/${THRESHOLDS.organizations.critical})`,
        value: m.organizations.total,
        limit: THRESHOLDS.organizations.critical
      })
    }

    // Supabase cost
    if (m.costs.supabase >= THRESHOLDS.supabaseCost.critical) {
      newAlerts.push({
        level: 'critical',
        metric: 'supabase_cost',
        message: 'Costo de Supabase excede free tier',
        value: m.costs.supabase
      })
    } else if (m.costs.supabase >= THRESHOLDS.supabaseCost.warning) {
      newAlerts.push({
        level: 'warning',
        metric: 'supabase_cost',
        message: 'Costo de Supabase cerca del límite',
        value: m.costs.supabase
      })
    }

    // Conversion rate
    if (m.organizations.total > 20 && m.organizations.paying < 5) {
      newAlerts.push({
        level: 'warning',
        metric: 'conversion',
        message: 'Conversión muy baja (menos de 5 paying customers)',
        value: m.organizations.paying
      })
    }

    setAlerts(newAlerts)
  }

  useEffect(() => {
    fetchMetrics()
    // Refresh every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const getStatusColor = (level: Alert['level']) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'warning': return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'notice': return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const getStatusIcon = (level: Alert['level']) => {
    switch (level) {
      case 'critical': return <AlertTriangle size={18} />
      case 'warning': return <AlertTriangle size={18} />
      case 'notice': return <CheckCircle size={18} />
    }
  }

  const getPercentage = (value: number, limit: number) => Math.min(100, Math.round((value / limit) * 100))

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-slate-400" size={32} />
      </div>
    )
  }

  const overallStatus = alerts.some(a => a.level === 'critical') 
    ? 'CRÍTICO' 
    : alerts.some(a => a.level === 'warning')
    ? 'ATENCIÓN'
    : 'SALUDABLE'

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            Analytics
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            {lastUpdated && `Última actualización: ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className={`p-4 rounded-2xl border ${getStatusColor(alerts[0].level)}`}>
          <div className="flex items-center gap-3 mb-2">
            {getStatusIcon(alerts[0].level)}
            <span className="font-black uppercase text-sm">Estado: {overallStatus}</span>
          </div>
          <div className="space-y-1">
            {alerts.map((alert, idx) => (
              <p key={idx} className="text-sm font-medium">
                • {alert.message}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Organizations */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Users size={20} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase">Organizaciones</p>
              <p className="text-2xl font-black text-slate-900">{metrics?.organizations.total || 0}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Activas</span>
              <span className="font-bold text-slate-700">{metrics?.organizations.active || 0}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  (metrics?.organizations.total || 0) >= 40 ? 'bg-red-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${getPercentage(metrics?.organizations.total || 0, 50)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              {metrics?.organizations.total || 0}/50 ({getPercentage(metrics?.organizations.total || 0, 50)}%)
            </p>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <DollarSign size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase">MRR</p>
              <p className="text-2xl font-black text-slate-900">${metrics?.revenue.mrr || 0}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Paying</span>
              <span className="font-bold text-emerald-600">{metrics?.revenue.payingCustomers || 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">ARPU</span>
              <span className="font-bold text-slate-700">${metrics?.revenue.arpu || 0}</span>
            </div>
          </div>
        </div>

        {/* Supabase Cost */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 rounded-xl">
              <Database size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase">Supabase</p>
              <p className="text-2xl font-black text-slate-900">${metrics?.costs.supabase || 0}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Free tier</span>
              <span className="font-bold text-slate-700">$25</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  (metrics?.costs.supabase || 0) >= 25 ? 'bg-red-500' : 
                  (metrics?.costs.supabase || 0) >= 20 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${getPercentage(metrics?.costs.supabase || 0, 25)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              {(metrics?.costs.supabase || 0) > 25 ? '⚠️ Excedido' : 'Dentro del límite'}
            </p>
          </div>
        </div>

        {/* AI Usage */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-xl">
              <Zap size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase">AI Queries</p>
              <p className="text-2xl font-black text-slate-900">{metrics?.ai.queriesMonth || 0}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Hoy</span>
              <span className="font-bold text-purple-600">{metrics?.ai.queriesToday || 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Costo est.</span>
              <span className="font-bold text-slate-700">${metrics?.ai.estimatedCost || 0} MXN</span>
            </div>
          </div>
        </div>
      </div>

      {/* Token Usage Breakdown - Solo para ti */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-white/10 rounded-xl">
            <Zap size={20} className="text-amber-400" />
          </div>
          <div>
            <h3 className="font-black uppercase text-lg">Desglose de Tokens AI</h3>
            <p className="text-xs text-slate-400">Consumo por feature en la plataforma</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <Bot size={24} className="mx-auto text-blue-400 mb-2" />
            <p className="text-2xl font-black">125</p>
            <p className="text-xs text-slate-400">IA Agent</p>
            <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400" style={{ width: '35%' }} />
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 text-center">
            <Megaphone size={24} className="mx-auto text-pink-400 mb-2" />
            <p className="text-2xl font-black">142</p>
            <p className="text-xs text-slate-400">Marketing</p>
            <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-pink-400" style={{ width: '40%' }} />
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 text-center">
            <BarChart3 size={24} className="mx-auto text-purple-400 mb-2" />
            <p className="text-2xl font-black">85</p>
            <p className="text-xs text-slate-400">Analytics</p>
            <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-purple-400" style={{ width: '24%' }} />
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 text-center">
            <Calculator size={24} className="mx-auto text-emerald-400 mb-2" />
            <p className="text-2xl font-black">8</p>
            <p className="text-xs text-slate-400">Reportes</p>
            <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400" style={{ width: '2%' }} />
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-white/5 rounded-xl">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-300">Total tokens este mes</span>
            <span className="text-2xl font-black text-amber-400">360</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            💡 <span className="text-emerald-400">78%</span> usado en Marketing AI + IA Agent
          </div>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="space-y-4">
        {/* Organizations Detail */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => toggleSection('organizations')}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Users size={20} className="text-slate-400" />
              <span className="font-black text-slate-900 uppercase">Detalle de Organizaciones</span>
            </div>
            {expandedSections.organizations ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {expandedSections.organizations && (
            <div className="p-4 border-t border-slate-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <p className="text-3xl font-black text-indigo-600">{metrics?.organizations.total || 0}</p>
                  <p className="text-xs text-slate-500 uppercase font-bold mt-1">Total</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <p className="text-3xl font-black text-emerald-600">{metrics?.organizations.active || 0}</p>
                  <p className="text-xs text-slate-500 uppercase font-bold mt-1">Activas</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <p className="text-3xl font-black text-amber-600">{metrics?.organizations.free || 0}</p>
                  <p className="text-xs text-slate-500 uppercase font-bold mt-1">Free</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <p className="text-3xl font-black text-emerald-600">{metrics?.organizations.paying || 0}</p>
                  <p className="text-xs text-slate-500 uppercase font-bold mt-1">Paying</p>
                </div>
              </div>
              <div className="mt-4 p-4 bg-indigo-50 rounded-xl">
                <p className="text-sm font-medium text-indigo-900">
                  💡 Tasa de conversión: {metrics?.organizations.total ? Math.round((metrics.organizations.paying / metrics.organizations.total) * 100) : 0}%
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Costs Detail */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => toggleSection('costs')}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <HardDrive size={20} className="text-slate-400" />
              <span className="font-black text-slate-900 uppercase">Costos de Infraestructura</span>
            </div>
            {expandedSections.costs ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {expandedSections.costs && (
            <div className="p-4 border-t border-slate-100 space-y-4">
              {/* Storage */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Storage (Imágenes)</span>
                  <span className="text-sm font-bold text-slate-900">{metrics?.costs.storage || 0}MB / 1GB</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      (metrics?.costs.storage || 0) >= 900 ? 'bg-red-500' : 
                      (metrics?.costs.storage || 0) >= 800 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${(metrics?.costs.storage || 0) / 10}%` }}
                  />
                </div>
              </div>
              {/* Database */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Database</span>
                  <span className="text-sm font-bold text-slate-900">{metrics?.costs.database || 0}MB / 500MB</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      (metrics?.costs.database || 0) >= 450 ? 'bg-red-500' : 
                      (metrics?.costs.database || 0) >= 400 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${(metrics?.costs.database || 0) / 5}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
          <h3 className="font-black text-lg mb-2">📊 Reporte Semanal</h3>
          <p className="text-sm text-indigo-100 mb-4">
            Recibe un resumen cada lunes con métricas, alertas y recomendaciones.
          </p>
          <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-bold text-sm transition-colors">
            Configurar Reportes
          </button>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
          <h3 className="font-black text-lg mb-2">🔔 Alertas</h3>
          <p className="text-sm text-slate-300 mb-4">
            Configura notificaciones para cuando llegues a umbrales críticos.
          </p>
          <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-bold text-sm transition-colors">
            Configurar Alertas
          </button>
        </div>
      </div>
    </div>
  )
}
