import { useState, useEffect, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import supabaseService from '@/services/supabaseService'
import { aiService, AIInsight } from '@/services/aiService'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  TrendingUp,
  RefreshCw,
  DollarSign,
  Package,
  ShoppingBag,
  Sparkles,
  AlertTriangle,
  Calendar,
  BarChart3,
  ArrowUpRight,
  CheckCircle2,
  Clock
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

export default function Analytics() {
  const { currentUser, products: storeProducts } = useAppStore()
  const permissions = usePermissions()
  const canAccess = permissions.isAdmin || currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'supervisor'

  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [sales30Days, setSales30Days] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [metrics30d, setMetrics30d] = useState<any>(null)
  const [catalogProducts, setCatalogProducts] = useState<any[]>([])
  const [aiForecastInsights, setAiForecastInsights] = useState<AIInsight[]>([])

  useEffect(() => {
    if (!currentUser) return
    loadRealAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.organizationId])

  const loadRealAnalytics = async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      const endDate = new Date()
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      const [sales, topProds, salesMetrics, fetchedProducts] = await Promise.all([
        supabaseService.getSalesByDateRange(startDate, endDate),
        supabaseService.getTopProducts(startDate, endDate, 8),
        supabaseService.getSalesMetrics(startDate, endDate),
        storeProducts && storeProducts.length > 0
          ? Promise.resolve(storeProducts)
          : supabaseService.getProducts(currentUser.organizationId)
      ])

      setSales30Days(sales || [])
      setTopProducts(topProds || [])
      setMetrics30d(salesMetrics || { totalSales: 0, transactionCount: 0, averageTicket: 0 })
      setCatalogProducts(fetchedProducts || [])

      generateIntelligentProjections(salesMetrics, topProds, fetchedProducts || [], sales || [])
    } catch (error) {
      console.error('Error loading real analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  // Estadísticas matemáticas y proyecciones basadas en datos reales del negocio
  const stats = useMemo(() => {
    const totalSales30d = Number(metrics30d?.totalSales || 0)
    const txCount30d = Number(metrics30d?.transactionCount || sales30Days.length || 0)
    const avgTicket = txCount30d > 0 ? totalSales30d / txCount30d : 0

    // Agrupar ventas por fecha y por día de la semana
    const byDate: Record<string, { date: string; label: string; total: number; count: number }> = {}
    const byWeekday: Record<number, { name: string; total: number; count: number }> = {
      0: { name: 'Dom', total: 0, count: 0 },
      1: { name: 'Lun', total: 0, count: 0 },
      2: { name: 'Mar', total: 0, count: 0 },
      3: { name: 'Mié', total: 0, count: 0 },
      4: { name: 'Jue', total: 0, count: 0 },
      5: { name: 'Vie', total: 0, count: 0 },
      6: { name: 'Sáb', total: 0, count: 0 }
    }

    sales30Days.forEach((s: any) => {
      const d = s.created_at ? new Date(s.created_at) : new Date()
      const key = d.toLocaleDateString('en-CA')
      const amount = Number(s.total || 0)
      if (!byDate[key]) {
        byDate[key] = {
          date: key,
          label: d.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
          total: 0,
          count: 0
        }
      }
      byDate[key].total += amount
      byDate[key].count += 1

      const wd = d.getDay()
      byWeekday[wd].total += amount
      byWeekday[wd].count += 1
    })

    const dailySeries = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
    const activeDays = Math.max(1, dailySeries.length)
    const dailyAvgRevenue = totalSales30d / activeDays
    const projectedNext7Days = dailyAvgRevenue * 7
    const projectedNext30Days = dailyAvgRevenue * 30

    // Construir serie con proyección a 7 días
    const chartWithProjection = [...dailySeries.map(d => ({ ...d, proyectado: null as number | null }))]
    if (dailySeries.length > 0) {
      const lastPoint = dailySeries[dailySeries.length - 1]
      chartWithProjection[chartWithProjection.length - 1].proyectado = lastPoint.total
    }
    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date(Date.now() + i * 24 * 60 * 60 * 1000)
      const wd = futureDate.getDay()
      // Ponderar proyección según el rendimiento histórico de ese día de la semana
      const wdAvg = byWeekday[wd].count > 0 ? byWeekday[wd].total / Math.max(1, Math.ceil(activeDays / 7)) : dailyAvgRevenue
      const blendedProjection = Math.round(((dailyAvgRevenue * 0.6) + (wdAvg * 0.4)) * 100) / 100
      chartWithProjection.push({
        date: futureDate.toLocaleDateString('en-CA'),
        label: `+${i}d (${byWeekday[wd].name})`,
        total: 0,
        count: 0,
        proyectado: blendedProjection
      })
    }

    // Valor real del inventario y margen potencial
    const activeCatalog = catalogProducts.filter(p => p.active !== false)
    const totalUnitsInStock = activeCatalog.reduce((acc, p) => acc + Math.max(0, Number(p.currentStock ?? 0)), 0)
    const inventoryRetailValue = activeCatalog.reduce((acc, p) => {
      const stock = Math.max(0, Number(p.currentStock ?? 0))
      return acc + stock * Number(p.price || 0)
    }, 0)
    const lowStockItems = activeCatalog
      .filter(p => p.hasInventory !== false && Number(p.currentStock ?? 0) <= Number(p.minimumStock ?? 5))
      .sort((a, b) => Number(a.currentStock ?? 0) - Number(b.currentStock ?? 0))

    // Mejor día de la semana
    const weekdayList = [1, 2, 3, 4, 5, 6, 0].map(k => byWeekday[k])
    const bestWeekday = [...weekdayList].sort((a, b) => b.total - a.total)[0]

    return {
      totalSales30d,
      txCount30d,
      avgTicket,
      dailyAvgRevenue,
      projectedNext7Days,
      projectedNext30Days,
      chartWithProjection,
      weekdayList,
      bestWeekday,
      activeCatalogCount: activeCatalog.length,
      totalUnitsInStock,
      inventoryRetailValue,
      lowStockItems
    }
  }, [metrics30d, sales30Days, catalogProducts])

  const generateIntelligentProjections = async (
    salesMetrics: any,
    topProds: any[],
    prods: any[],
    rawSales: any[]
  ) => {
    setAiLoading(true)
    try {
      // Intentar obtener análisis del LLM (Edge Function ai-insights) si está disponible
      if (salesMetrics && topProds && topProds.length > 0) {
        const llmInsights = await aiService.generateStrategicInsights(salesMetrics, topProds)
        const isValidLlm =
          Array.isArray(llmInsights) &&
          llmInsights.length > 0 &&
          !llmInsights[0].title.toLowerCase().includes('error')
        if (isValidLlm) {
          setAiForecastInsights(llmInsights)
          setAiLoading(false)
          return
        }
      }
    } catch {
      // Continúa al motor estadístico determinista en tiempo real
    }

    // Motor estadístico local basado 100% en los datos reales del tenant
    const totalRev = Number(salesMetrics?.totalSales || 0)
    const txCount = Number(salesMetrics?.transactionCount || rawSales.length || 0)
    const avgTicket = txCount > 0 ? totalRev / txCount : 0
    const activeProds = prods.filter(p => p.active !== false)
    const invValue = activeProds.reduce((sum, p) => sum + Math.max(0, Number(p.currentStock ?? 0)) * Number(p.price || 0), 0)
    const lowStock = activeProds.filter(p => Number(p.currentStock ?? 0) <= Number(p.minimumStock ?? 5))
    const bestSeller = topProds?.[0]

    const computedInsights: AIInsight[] = [
      {
        title: bestSeller
          ? `Producto Estrella: ${bestSeller.name}`
          : 'Potencial de Catálogo Listo para Venta',
        description: bestSeller
          ? `Lidera la demanda con ${bestSeller.qty} unidades vendidas ($${Number(bestSeller.total || 0).toFixed(2)} MXN). Mantener exhibición principal y stock de seguridad evita quiebres de venta.`
          : `Tienes ${activeProds.length} productos activos con un valor comercial en piso de $${invValue.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN listo para rotación.`,
        action: bestSeller
          ? `Asegurar reabasto de ${bestSeller.name}`
          : 'Destacar los artículos de mayor margen en mostrador',
        type: 'success'
      },
      {
        title: txCount > 0 ? 'Proyección de Flujo a 30 Días' : 'Proyección de Liquidación de Inventario',
        description: txCount > 0
          ? `Con un ticket promedio real de $${avgTicket.toFixed(2)} MXN en ${txCount} ventas recientes, manteniendo el ritmo actual proyectas facturar $${(totalRev / Math.max(1, Math.min(30, rawSales.length || 1)) * 30).toFixed(2)} MXN en los próximos 30 días.`
          : `Con un precio promedio por artículo de $${(activeProds.reduce((s, p) => s + Number(p.price || 0), 0) / Math.max(1, activeProds.length)).toFixed(2)} MXN, rotar el 35% de tu stock actual generará $${(invValue * 0.35).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN.`,
        action: txCount > 0
          ? 'Impulsar venta cruzada en caja para subir el ticket +15%'
          : 'Iniciar registro de ventas en caja para calibrar curva semanal',
        type: 'info'
      },
      {
        title: lowStock.length > 0
          ? `Alerta de Reabasto (${lowStock.length} artículos)`
          : 'Salud de Inventario Óptima',
        description: lowStock.length > 0
          ? `Se detectaron ${lowStock.length} productos con existencias bajas o agotadas (ej. ${lowStock.slice(0, 2).map(p => p.name).join(', ')}). Reponerlos protege tus ventas de fin de semana.`
          : `El 100% de tu catálogo activo cuenta con stock saludable (${activeProds.reduce((s, p) => s + Number(p.currentStock ?? 0), 0)} piezas totales en tienda).`,
        action: lowStock.length > 0
          ? 'Revisar tabla de stock crítico abajo'
          : 'Programar promoción de productos con mayor existencia',
        type: lowStock.length > 0 ? 'warning' : 'success'
      }
    ]

    setAiForecastInsights(computedInsights)
    setAiLoading(false)
  }

  if (!currentUser) return <Navigate to="/login" replace />
  if (!canAccess) return <Navigate to="/pos" replace />

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-[var(--primary)] rounded-2xl text-white shadow-lg">
              <TrendingUp size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/10 text-amber-300 font-bold">
                  Datos Reales en Vivo
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mt-1">
                Analítica & Proyecciones
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-medium mt-0.5">
                Estadísticas operativas, valor de inventario y pronóstico inteligente basado en tus ventas reales
              </p>
            </div>
          </div>

          <button
            onClick={loadRealAnalytics}
            disabled={loading || aiLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 active:scale-95"
          >
            <RefreshCw size={16} className={loading || aiLoading ? 'animate-spin' : ''} />
            <span>Actualizar Análisis</span>
          </button>
        </div>

        {/* KPI Cards Reales + Proyecciones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Ventas (Últimos 30d)</span>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <DollarSign size={18} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">
              ${stats.totalSales30d.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 font-semibold mt-1.5 flex items-center gap-1">
              <span>{stats.txCount30d} tickets cobrados</span>
              <span>·</span>
              <span>Prom: ${stats.avgTicket.toFixed(0)}</span>
            </p>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Proyección Próx. 7 Días</span>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <ArrowUpRight size={18} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-indigo-600">
              ${stats.projectedNext7Days.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 font-semibold mt-1.5">
              Proyección 30d: ${stats.projectedNext30Days.toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN
            </p>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Valor Comercial Stock</span>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <ShoppingBag size={18} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">
              ${stats.inventoryRetailValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 font-semibold mt-1.5">
              {stats.totalUnitsInStock.toLocaleString('es-MX')} piezas en {stats.activeCatalogCount} productos
            </p>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Día Más Fuerte</span>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                <Calendar size={18} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">
              {stats.bestWeekday && stats.bestWeekday.total > 0 ? stats.bestWeekday.name : 'En captura'}
            </p>
            <p className="text-xs text-slate-500 font-semibold mt-1.5">
              {stats.bestWeekday && stats.bestWeekday.total > 0
                ? `$${stats.bestWeekday.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} acumulados`
                : `${stats.lowStockItems.length} alertas de stock mínimo`}
            </p>
          </div>
        </div>

        {/* Diagnóstico y Proyecciones Inteligentes (LLM + Estadística Real) */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80">
          <div className="flex items-center justify-between gap-2 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                  Diagnóstico Estadístico y Proyecciones IA
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Recomendaciones calculadas directamente sobre tu inventario y ventas registradas
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {aiForecastInsights.map((item, idx) => {
              const borderStyle =
                item.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : item.type === 'warning'
                  ? 'border-amber-200 bg-amber-50/40'
                  : 'border-indigo-200 bg-indigo-50/40'

              return (
                <div key={idx} className={`p-4 rounded-2xl border ${borderStyle} flex flex-col justify-between`}>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {item.type === 'warning' ? (
                        <AlertTriangle size={17} className="text-amber-600 shrink-0" />
                      ) : item.type === 'success' ? (
                        <CheckCircle2 size={17} className="text-emerald-600 shrink-0" />
                      ) : (
                        <TrendingUp size={17} className="text-indigo-600 shrink-0" />
                      )}
                      <h3 className="font-black text-sm text-slate-900">{item.title}</h3>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{item.description}</p>
                  </div>
                  <div className="mt-4 pt-2.5 border-t border-slate-200/60">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Acción recomendada
                    </span>
                    <span className="text-xs font-extrabold text-slate-800">{item.action}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Gráficas: Tendencia + Pronóstico a 7 Días y Rendimiento por Día */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase">
                  Curva de Ventas Reales + Pronóstico 7 Días
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Línea sólida: ingresos reales · Línea punteada: proyección estimada
                </p>
              </div>
              <Clock size={18} className="text-slate-400" />
            </div>

            {stats.chartWithProjection.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={stats.chartWithProjection}>
                  <defs>
                    <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    formatter={(value: any, name: string) => [
                      `$${Number(value || 0).toFixed(2)}`,
                      name === 'proyectado' ? 'Proyección' : 'Venta Real'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorReal)"
                  />
                  <Area
                    type="monotone"
                    dataKey="proyectado"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    fillOpacity={1}
                    fill="url(#colorProj)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center text-slate-400">
                <BarChart3 size={36} className="mb-2 opacity-40" />
                <p className="text-sm font-bold">Registra tus primeras ventas para trazar la proyección</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80">
            <h3 className="text-base font-black text-slate-900 uppercase mb-1">
              Demanda por Día de Semana
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-4">
              Acumulado de ventas por día (Lun - Dom)
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.weekdayList}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={(value: any) => [`$${Number(value || 0).toFixed(2)}`, 'Ventas']} />
                <Bar dataKey="total" fill="#C8323E" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tablas Operativas: Top Productos y Alertas de Reabasto */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-900 uppercase">
                Top Artículos Más Vendidos (30d)
              </h3>
              <Package size={18} className="text-slate-400" />
            </div>
            {topProducts.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {topProducts.map((p: any, i: number) => (
                  <div key={i} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">{p.name}</p>
                        <p className="text-[11px] text-slate-500 font-semibold">{p.qty} unidades vendidas</p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-emerald-600 shrink-0">
                      ${Number(p.total || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400">
                <p className="text-xs font-bold">Sin ventas registradas en este periodo</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-900 uppercase">
                Riesgo de Quiebre de Stock
              </h3>
              <AlertTriangle size={18} className="text-amber-500" />
            </div>
            {stats.lowStockItems.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {stats.lowStockItems.slice(0, 6).map((item: any) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">{item.name}</p>
                      <p className="text-[11px] text-slate-500 font-semibold">
                        Precio: ${Number(item.price || 0).toFixed(2)}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-black shrink-0 ${
                        Number(item.currentStock ?? 0) === 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      Stock: {item.currentStock ?? 0} pzs
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-emerald-600">
                <CheckCircle2 size={32} className="mx-auto mb-2" />
                <p className="text-xs font-black uppercase">Todo tu inventario tiene stock suficiente</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
