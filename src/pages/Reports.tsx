import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import supabaseService from '@/services/supabaseService'
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Calendar,
  Download,
  Eye,
  Lock,
  BarChart3,
  Loader,
  Filter,
  Target,
  ArrowDownUp,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight
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
  PieLabel,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts'
import AIInsightsWidget from '@/components/common/AIInsightsWidget'

type ReportTab = 'sales' | 'inventory' | 'employees' | 'goals' | 'purchases'

export default function Reports() {
  const { currentUser } = useAppStore()
  const permissions = usePermissions()
  const canViewReports = permissions.canViewReports || currentUser?.role === 'capitan'
  const canViewSalesReport = permissions.canViewSalesReport || currentUser?.role === 'capitan'
  const canViewEmployeeMetrics = permissions.canViewEmployeeMetrics || currentUser?.role === 'capitan'
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

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4']

  return (
    <div className="min-h-screen relative bg-rb-canvas p-6 pb-20">
      {/* Background Doodle */}
      <div
        className="fixed inset-0 z-0 opacity-40 pointer-events-none bg-repeat"
        style={{
          backgroundImage: 'url("/doodle_ceviche.png?v=2")',
          backgroundSize: '450px',
        }}
      />
      {/* Gradient Overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-gray-500/5 z-0 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
                <BarChart3 size={36} />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Reportes</h1>
                <p className="text-blue-100 mt-2">Análisis y métricas del negocio</p>
              </div>
            </div>
            {isReadOnly && (
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                <Eye size={20} />
                <span className="font-semibold">Solo lectura</span>
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
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[
            { id: 'sales' as const, label: '📊 Ventas', enabled: canViewSalesReport },
            { id: 'inventory' as const, label: '📦 Inventario', enabled: true },
            { id: 'employees' as const, label: '👥 Empleados', enabled: canViewEmployeeMetrics },
            { id: 'goals' as const, label: '🎯 Metas', enabled: true },
            { id: 'purchases' as const, label: '🛍️ Compras', enabled: true },
          ]
            .filter(t => t.enabled)
            .map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 shadow-md hover:shadow-lg'
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
                  { label: 'Total Ventas', value: `$${metrics.totalSales?.toFixed(2)}`, icon: DollarSign, color: 'from-green-500 to-emerald-600' },
                  { label: 'Transacciones', value: metrics.transactionCount || 0, icon: Package, color: 'from-blue-500 to-cyan-600' },
                  { label: 'Ticket Promedio', value: `$${metrics.averageTicket?.toFixed(2)}`, icon: TrendingUp, color: 'from-purple-500 to-pink-600' },
                  { label: 'Propinas', value: `$${metrics.totalTips?.toFixed(2)}`, icon: DollarSign, color: 'from-orange-500 to-red-600' },
                ].map((card, i) => {
                  const Icon = card.icon
                  return (
                    <div key={i} className={`bg-gradient-to-br ${card.color} rounded-2xl p-6 text-white shadow-lg`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/80 text-sm font-medium">{card.label}</p>
                          <p className="text-3xl font-bold mt-2">{card.value}</p>
                        </div>
                        <Icon size={40} className="opacity-30" />
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
              <div className="card">
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
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {['#10b981', '#3b82f6', '#f59e0b'].map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
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
              <div className="card">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Ventas por Día</h3>
                {salesData && salesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        formatter={(value) => `$${value.toFixed(2)}`}
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
              <div className="card">
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
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {topProducts.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} unidades`} />
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
              <div className="card">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Ventas por Empleado</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={employeeMetrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="userName" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value: any) => `$${value.toFixed(2)}`}
                    />
                    <Legend />
                    <Bar dataKey="totalSales" name="Total Ventas" fill="#3b82f6" />
                    <Bar dataKey="totalTips" name="Propinas" fill="#10b981" />
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
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Propinas</th>
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
                          <td className="px-6 py-4 text-right text-orange-600 font-semibold">${emp.totalTips.toFixed(2)}</td>
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
          <div className="card-gradient flex flex-col items-center justify-center py-20 text-center">
            <div className="p-6 bg-blue-50 rounded-full mb-4">
              <ShoppingBag size={48} className="text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">Módulo de Compras</h3>
            <p className="text-gray-500 max-w-md mt-2">
              Próximamente podrás gestionar proveedores, órdenes de compra y costos detallados aquí.
            </p>
            <span className="mt-4 px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">En Desarrollo</span>
          </div>
        )}
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
          color="from-blue-500 to-cyan-600"
        />
        <StatCard
          title="Items Totales"
          value="1,240"
          icon={Package}
          color="from-purple-500 to-indigo-600"
        />
        <StatCard
          title="Rotación (Mensual)"
          value="12.5%"
          icon={ArrowDownUp}
          color="from-orange-500 to-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Movimientos de Stock</h3>
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
              <XAxis dataKey="name" />
              <YAxis />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="entradas" stroke="#10b981" fillOpacity={1} fill="url(#colorEntradas)" />
              <Area type="monotone" dataKey="salidas" stroke="#ef4444" fillOpacity={1} fill="url(#colorSalidas)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Alertas de Stock</h3>
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
    { name: 'Ventas', current: 45000, target: 60000, color: '#3b82f6' },
    { name: 'Tickets', current: 120, target: 150, color: '#8b5cf6' },
    { name: 'Propinas', current: 4500, target: 5000, color: '#10b981' },
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

      <div className="card bg-gradient-to-r from-indigo-900 to-blue-900 text-white p-8 rounded-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Target className="text-yellow-400" size={32} />
            <h3 className="text-2xl font-bold">Objetivo Mensual</h3>
          </div>
          <p className="text-blue-100 max-w-xl text-lg mb-6">
            ¡Estás a un 75% de alcanzar tu meta de ventas mensual! Mantén el ritmo para desbloquear el bono de equipo.
          </p>
          <button className="bg-white text-blue-900 px-6 py-2 rounded-lg font-bold hover:bg-blue-50 transition-colors">
            Ver Detalles
          </button>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
          <Target size={200} />
        </div>
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-all">
      <div className={`p-3 bg-gradient-to-br ${color} rounded-xl text-white w-fit mb-3 shadow-sm`}>
        <Icon size={24} />
      </div>
      <h3 className="text-gray-600 text-sm font-semibold">{title}</h3>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
  )
}
