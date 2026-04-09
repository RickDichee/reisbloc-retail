import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import supabaseService from '@/services/supabaseService'
import { supabase } from '@/config/supabase'
import {
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  Eye,
  BarChart3,
  Loader,
  Filter,
  Target,
  ArrowDownUp,
  ShoppingBag,
  ArrowDownRight,
  Coins,
  Zap,
  Gift,
  Users
} from 'lucide-react'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'
import AIInsightsWidget from '@/components/common/AIInsightsWidget'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useTokens } from '@/hooks/useTokens'
import { usePlanLimits } from '@/hooks/usePlanLimits'

type ReportTab = 'sales' | 'inventory' | 'employees' | 'goals' | 'purchases' | 'tokens'

export default function Reports() {
  const { currentUser } = useAppStore()
  const permissions = usePermissions()
  const canViewReports = permissions.canViewReports || currentUser?.role === 'admin' || currentUser?.role === 'supervisor'
  const canViewSalesReport = permissions.canViewSalesReport || currentUser?.role === 'admin' || currentUser?.role === 'supervisor'
  const canViewEmployeeMetrics = permissions.canViewEmployeeMetrics || currentUser?.role === 'admin' || currentUser?.role === 'supervisor'
  const isReadOnly = permissions.isReadOnly

  const [activeTab, setActiveTab] = useState<ReportTab>('sales')
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    category: 'all',
    paymentMethod: 'all',
    employeeId: 'all'
  })

  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA'),
    to: new Date().toLocaleDateString('en-CA'),
  })

  const [salesData, setSalesData] = useState<any>(null)
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [employeeMetrics, setEmployeeMetrics] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>(null)

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      loadReports()
    }
  }, [dateRange])

  const loadReports = async () => {
    setLoading(true)
    try {
      // Crear fechas locales explícitas para evitar desfases de zona horaria
      const startDate = new Date(dateRange.from + 'T00:00:00')
      const endDate = new Date(dateRange.to + 'T23:59:59.999')

      // Obtener ventas desde Supabase
      const sales = await supabaseService.getSalesByDateRange(startDate, endDate)

      // Agrupar por día
      const byDay: Record<string, any[]> = {}
      sales.forEach((sale: any) => {
        const date = sale.created_at ? new Date(sale.created_at) : new Date()
        const dayKey = date.toLocaleDateString('en-CA')
        if (!byDay[dayKey]) byDay[dayKey] = []
        byDay[dayKey].push(sale)
      })

      // Chart data por día
      const chartData = Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, sales]: [string, any[]]) => ({
          date: new Date(day).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
          total: sales.reduce((sum, s: any) => sum + Number(s.total || 0), 0),
          transactions: sales.length,
        }))

      // Usar los nuevos métodos de agregación
      const [topProductsData, employeeMetricsData, metricsData] = await Promise.all([
        supabaseService.getTopProducts(startDate, endDate, 5),
        supabaseService.getEmployeeMetrics(startDate, endDate),
        supabaseService.getSalesMetrics(startDate, endDate),
      ])

      setSalesData(chartData)
      setTopProducts(topProductsData)
      setEmployeeMetrics(employeeMetricsData)
      setMetrics(metricsData)
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (!canViewReports) {
    return <Navigate to="/pos" replace />
  }

  const COLORS = ['#10b981', '#334155', '#f59e0b', '#64748b', '#ef4444', '#06b6d4']

  return (
    <DashboardLayout>
      <div className="relative space-y-6">
        {/* Header */}
        {/* Header - Premium Slate/Emerald Style */}
        <div className="bg-slate-900 text-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden border border-white/5 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
          <div className="px-6 py-6 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
                <BarChart3 size={28} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-emerald-400 uppercase tracking-[0.2em] font-black mb-0.5">Business Intelligence</p>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase leading-none">Reportes</h1>
                <p className="text-slate-400 mt-2 font-bold tracking-tight opacity-80 uppercase text-xs">Análisis estratégico y métricas de rendimiento</p>
              </div>
            </div>
            {isReadOnly && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl text-emerald-400 border border-white/10">
                <Eye size={18} />
                <span className="font-bold text-xs uppercase tracking-wider">Modo Lectura</span>
              </div>
            )}
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="card flex items-center justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
              <Calendar size={20} className="text-blue-600" />
              <span className="font-semibold text-gray-700">Período:</span>
            </div>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:outline-none"
            />
            <span className="text-gray-500">hasta</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:outline-none"
            />

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <Filter size={18} />
              Filtros
            </button>

            {loading && (
              <div className="flex items-center gap-2 text-blue-600 ml-auto">
                <Loader size={18} className="animate-spin" />
                <span>Cargando...</span>
              </div>
            )}
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="card bg-slate-50 border-blue-100 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoría</label>
                <select
                  className="input-field w-full"
                  value={filters.category}
                  onChange={e => setFilters({ ...filters, category: e.target.value })}
                >
                  <option value="all">Todas las categorías</option>
                  <option value="food">Alimentos</option>
                  <option value="drinks">Bebidas</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Método de Pago</label>
                <select
                  className="input-field w-full"
                  value={filters.paymentMethod}
                  onChange={e => setFilters({ ...filters, paymentMethod: e.target.value })}
                >
                  <option value="all">Todos los métodos</option>
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="transfer">Transferencia</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {[
            { id: 'sales' as const, label: '📊 Ventas', enabled: canViewSalesReport },
            { id: 'inventory' as const, label: '📦 Inventario', enabled: true },
            { id: 'employees' as const, label: '👥 Empleados', enabled: canViewEmployeeMetrics },
            { id: 'goals' as const, label: '🎯 Metas', enabled: true },
            { id: 'purchases' as const, label: '🛍️ Compras', enabled: true },
            { id: 'tokens' as const, label: '⚡ Tokens', enabled: true },
          ]
            .filter(t => t.enabled)
            .map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-2xl font-black text-sm transition-all ${activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                  } whitespace-nowrap`}
              >
                {tab.label}
              </button>
            ))}
        </div>

        {/* Sales Report */}
        {activeTab === 'sales' && canViewSalesReport && (
          <div className="space-y-6">
            {/* Metrics Cards */}
            {metrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Ventas', value: `$${metrics.totalSales?.toFixed(2)}`, icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
                  { label: 'Transacciones', value: metrics.transactionCount || 0, icon: Package, color: 'bg-slate-50 text-slate-600' },
                  { label: 'Ticket Promedio', value: `$${metrics.averageTicket?.toFixed(2)}`, icon: TrendingUp, color: 'bg-indigo-50 text-indigo-600' },
                ].map((card, i) => {
                  const Icon = card.icon
                  return (
                    <div key={i} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">{card.label}</p>
                          <p className="text-3xl font-black text-slate-900 tracking-tight">{card.value}</p>
                        </div>
                        <div className={`p-3 rounded-2xl ${card.color}`}>
                          <Icon size={24} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* AI Strategic Insights */}
            <AIInsightsWidget metrics={metrics} topProducts={topProducts} />

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment Methods */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Métodos de Pago</h3>
                {metrics && (metrics.totalCash || metrics.totalDigital || metrics.totalClip) ? (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Efectivo', value: metrics.totalCash || 0 },
                            { name: 'Transferencia', value: metrics.totalDigital || 0 },
                            { name: 'Tarjeta', value: metrics.totalClip || 0 },
                          ].filter(p => p.value > 0)}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }: { name?: string, percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                        >
                          {['#10b981', '#3b82f6', '#f59e0b'].map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => `$${Number(value || 0).toFixed(2)}`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-emerald-50 rounded-lg p-3 border-l-4 border-emerald-500">
                        <p className="text-sm text-gray-600">Efectivo</p>
                        <p className="text-lg font-bold text-emerald-600">${(metrics.totalCash || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500">
                        <p className="text-sm text-gray-600">Transferencia</p>
                        <p className="text-lg font-bold text-blue-600">${(metrics.totalDigital || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 border-l-4 border-amber-500">
                        <p className="text-sm text-gray-600">Tarjeta</p>
                        <p className="text-lg font-bold text-amber-600">${(metrics.totalClip || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Sin datos disponibles</p>
                )}
              </div>

              {/* Sales by Day */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Ventas por Día</h3>
                {salesData && salesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        formatter={(value: any) => `$${(Number(value) || 0).toFixed(2)}`}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="total" name="Total Ventas" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">Sin datos disponibles</p>
                )}
              </div>

              {/* Top Products */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Top 5 Productos</h3>
                {topProducts && topProducts.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={topProducts}
                        dataKey="qty"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }: { name?: string, percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        {topProducts.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `${value} unidades`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">Sin datos disponibles</p>
                )}
              </div>
            </div>

            {/* Top Products Table */}
            {topProducts && topProducts.length > 0 && (
              <div className="card overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900">Detalle de Productos Vendidos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Producto</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Cantidad</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Monto Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {topProducts.map((product: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-900 font-medium">{product.name}</td>
                          <td className="px-6 py-4 text-right text-gray-700">{product.qty}</td>
                          <td className="px-6 py-4 text-right font-semibold text-green-600">${product.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Employee Report */}
        {activeTab === 'employees' && canViewEmployeeMetrics && (
          <div className="space-y-6">
            {/* Employee Chart */}
            {employeeMetrics && employeeMetrics.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Ventas por Empleado</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={employeeMetrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="userName" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                      formatter={(value: any) => [`$${value.toFixed(2)}`, 'Ventas']}
                    />
                    <Legend />
                    <Bar dataKey="totalSales" name="Total Ventas" fill="#334155" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Employee Metrics Table */}
            {employeeMetrics && employeeMetrics.length > 0 && (
              <div className="card overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900">Métricas Detalladas por Empleado</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Empleado</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Rol</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Ventas</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Total Vendido</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Ticket Prom.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {employeeMetrics.map((emp: any) => (
                        <tr key={emp.userId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{emp.userName}</td>
                          <td className="px-6 py-4 text-center text-gray-700 capitalize text-sm">{emp.role}</td>
                          <td className="px-6 py-4 text-right text-gray-700">{emp.salesCount}</td>
                          <td className="px-6 py-4 text-right font-semibold text-green-600">${emp.totalSales.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right text-gray-700">${emp.averageTicket.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Inventory Report */}
        {activeTab === 'inventory' && (
          <InventoryReport isReadOnly={isReadOnly} />
        )}

        {/* Goals Report */}
        {activeTab === 'goals' && (
          <GoalsReport />
        )}

        {/* Purchases Report */}
        {activeTab === 'purchases' && (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center py-24 text-center">
            <div className="p-6 bg-white rounded-full mb-6 shadow-sm border border-slate-100">
              <ShoppingBag size={48} className="text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase">Módulo de Compras</h3>
            <p className="text-slate-400 max-w-md mt-2 font-medium">
              Próximamente podrás gestionar proveedores, órdenes de compra y costos detallados aquí.
            </p>
            <span className="mt-6 px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-200">En Desarrollo</span>
        </div>
        )}

        {/* Tokens Report */}
        {activeTab === 'tokens' && (
          <TokensReport />
        )}
      </div>
    </DashboardLayout>
  )
}

// ⚡ Reporte de Tokens AI
function TokensReport() {
  const { balance, transactions, fetchTransactions } = useTokens()
  const { planLimits, getLimit } = usePlanLimits()
  const [productCount, setProductCount] = useState(0)
  const [employeeCount, setEmployeeCount] = useState(0)

  useEffect(() => {
    loadTokenData()
  }, [])

  const loadTokenData = async () => {
    await fetchTransactions()
    try {
      const { currentUser } = useAppStore.getState()
      if (currentUser?.organizationId) {
        const { count: products } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', currentUser.organizationId)
        setProductCount(products || 0)

        const { count: employees } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', currentUser.organizationId)
        setEmployeeCount(employees || 0)
      }
    } catch (e) { console.error(e) }
  }

  const planDailyLimit = planLimits?.aiTokensPerDay || 20
  const planMonthlyLimit = planLimits?.aiTokensPerMonth || 60

  const todayUsage = transactions
    .filter(t => t.type === 'usage' && t.created_at?.startsWith(new Date().toISOString().split('T')[0]))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const weekUsage = transactions
    .filter(t => {
      if (t.type !== 'usage') return false
      const txDate = new Date(t.created_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return txDate >= weekAgo
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const getUsagePercentage = (current: number, limit: number) => Math.min(100, Math.round((current / limit) * 100))
  const getUsageColor = (current: number, limit: number) => {
    const pct = (current / limit) * 100
    if (pct >= 90) return 'bg-red-500'
    if (pct >= 70) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  return (
    <div className="space-y-6">
      {/* Token Balance Header */}
      <div className="bg-slate-900 text-white rounded-[2rem] shadow-lg overflow-hidden">
        <div className="px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-amber-500/20 rounded-2xl border border-amber-500/30">
              <Coins size={32} className="text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] text-amber-400 uppercase tracking-wider font-black">Balance de Tokens</p>
              <p className="text-4xl font-black">{balance}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-sm">Límites del Plan</p>
            <p className="font-bold">{planDailyLimit} / día • {planMonthlyLimit} / mes</p>
          </div>
        </div>

        {/* Usage Bar */}
        <div className="px-8 pb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-300">Uso hoy</span>
            <span className="font-bold">{todayUsage} / {planDailyLimit} tokens</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getUsageColor(todayUsage, planDailyLimit)}`}
              style={{ width: `${getUsagePercentage(todayUsage, planDailyLimit)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
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
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-xl">
              <Calendar size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase">Esta Semana</p>
              <p className="text-2xl font-black text-slate-900">{weekUsage}</p>
            </div>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${getUsageColor(weekUsage, planMonthlyLimit)}`} style={{ width: `${getUsagePercentage(weekUsage, planMonthlyLimit)}%` }} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
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
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
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
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <BarChart3 size={20} className="text-slate-400" />
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
            transactions.slice(0, 15).map((tx) => (
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

      {/* Plan Limits Info */}
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
        <h4 className="font-black text-slate-900 uppercase mb-4">Límites de tu Plan</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white rounded-xl">
            <p className="text-2xl font-black text-slate-900">{getLimit('products')}</p>
            <p className="text-xs text-slate-500 uppercase">Productos</p>
          </div>
          <div className="text-center p-4 bg-white rounded-xl">
            <p className="text-2xl font-black text-slate-900">{getLimit('employees')}</p>
            <p className="text-xs text-slate-500 uppercase">Empleados</p>
          </div>
          <div className="text-center p-4 bg-white rounded-xl">
            <p className="text-2xl font-black text-slate-900">{getLimit('registers')}</p>
            <p className="text-xs text-slate-500 uppercase">Cajas</p>
          </div>
          <div className="text-center p-4 bg-white rounded-xl">
            <p className="text-2xl font-black text-slate-900">{planLimits?.aiTokensPerDay || 0}</p>
            <p className="text-xs text-slate-500 uppercase">AI/día</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// 📦 Componente de Reporte de Inventario (Entradas/Salidas)
function InventoryReport({ isReadOnly }: { isReadOnly: boolean }) {
  // Mock data para visualización "chula"
  const movementData = [
    { name: 'Lun', entradas: 40, salidas: 24 },
    { name: 'Mar', entradas: 30, salidas: 13 },
    { name: 'Mie', entradas: 20, salidas: 58 },
    { name: 'Jue', entradas: 27, salidas: 39 },
    { name: 'Vie', entradas: 18, salidas: 48 },
    { name: 'Sab', entradas: 23, salidas: 38 },
    { name: 'Dom', entradas: 34, salidas: 43 },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Valor Inventario"
          value="$125,430"
          icon={DollarSign}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Items Totales"
          value="1,240"
          icon={Package}
          color="bg-purple-50 text-indigo-600"
        />
        <StatCard
          title="Rotación (Mensual)"
          value="12.5%"
          icon={ArrowDownUp}
          color="bg-orange-50 text-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-xl font-black text-slate-900 mb-6">Movimientos de Stock</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={movementData}>
              <defs>
                <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSalidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
              />
              <Legend />
              <Area type="monotone" dataKey="entradas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEntradas)" />
              <Area type="monotone" dataKey="salidas" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorSalidas)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-xl font-black text-slate-900 mb-6">Alertas de Stock</h3>
          <div className="space-y-3">
            {[
              { name: 'Cerveza Corona', stock: 5, min: 12 },
              { name: 'Limones (kg)', stock: 2, min: 5 },
              { name: 'Servilletas (paq)', stock: 1, min: 4 },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full text-red-600">
                    <ArrowDownRight size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{item.name}</p>
                    <p className="text-xs text-red-600">Stock crítico</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-700">{item.stock} / {item.min}</p>
                  <p className="text-xs text-gray-500">Actual / Mín</p>
                </div>
              </div>
            ))}
            {isReadOnly && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-700 text-sm">
                <Eye size={16} />
                <span>Modo lectura: No puedes realizar ajustes de inventario.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// 🎯 Componente de Reporte de Metas
function GoalsReport() {
  const goalsData = [
    { name: 'Ventas', current: 45000, target: 60000, color: '#10b981' },
    { name: 'Tickets', current: 120, target: 150, color: '#334155' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {goalsData.map((goal, i) => {
          const progress = Math.min(100, (goal.current / goal.target) * 100)
          return (
            <div key={i} className="card relative overflow-hidden">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-gray-500 font-medium">{goal.name}</p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {goal.name === 'Tickets' ? goal.current : `$${goal.current.toLocaleString()}`}
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Meta</p>
                  <p className="font-semibold text-gray-700">
                    {goal.name === 'Tickets' ? goal.target : `$${goal.target.toLocaleString()}`}
                  </p>
                </div>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
                <div
                  className="h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%`, backgroundColor: goal.color }}
                />
              </div>

              <div className="flex justify-between text-xs">
                <span className="font-bold" style={{ color: goal.color }}>{progress.toFixed(1)}% Completado</span>
                <span className="text-gray-400">
                  Faltan {goal.name === 'Tickets' ? (goal.target - goal.current) : `$${(goal.target - goal.current).toLocaleString()}`}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-slate-900 text-white p-8 rounded-[2rem] relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Target className="text-emerald-400" size={32} />
            <h3 className="text-2xl font-black uppercase tracking-tight">Objetivo Mensual</h3>
          </div>
          <p className="text-slate-400 max-w-xl text-lg mb-6 font-medium">
            ¡Estás a un <span className="text-white font-bold">75%</span> de alcanzar tu meta de ventas mensual! Mantén el ritmo para desbloquear el bono de equipo.
          </p>
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="bg-emerald-500 text-slate-900 px-8 py-3 rounded-xl font-black hover:bg-emerald-400 transition-colors shadow-[0_10px_20px_-5px_rgba(16,185,129,0.4)]"
          >
            Ver Detalles
          </button>
        </div>
        <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none">
          <Target size={250} />
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full -mr-20 -mt-20"></div>
      </div>
    </div>
  )
}

// Componente reutilizable de tarjeta de estadística
function StatCard({
  title,
  value,
  icon: Icon,
  color
}: {
  title: string
  value: string
  icon: any
  color: string
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 hover:shadow-xl transition-all duration-300">
      <div className={`p-3 rounded-2xl w-fit mb-4 ${color}`}>
        <Icon size={24} />
      </div>
      <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest">{title}</h3>
      <p className="text-2xl font-black text-slate-900 mt-1 tracking-tight">{value}</p>
    </div>
  )
}
