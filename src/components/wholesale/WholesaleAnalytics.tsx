import { useRef, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { Download, Loader2 } from 'lucide-react'

interface WholesaleAnalyticsProps {
  data: {
    adoptionTrend: { date: string; imports: number; stores: number }[]
    totalMarketPenetration: number
    weeklyGrowth: number
    topProducts: { product_name: string; store_count: number; total_stock: number }[]
    categoryVelocity: { category: string; stores_count: number; stock_total: number }[]
    totalStoresWithProducts: number
    totalStockDistributed: number
  }
}

export default function WholesaleAnalytics({ data }: WholesaleAnalyticsProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  const exportToPDF = async () => {
    if (!chartRef.current || exporting) return
    
    setExporting(true)
    try {
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        backgroundColor: '#F8FAFC',
        logging: false
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      
      pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth - 20, pdfHeight - 20)
      pdf.save('wholesale-analytics-report.pdf')
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }
  const {
    adoptionTrend = [],
    totalMarketPenetration = 0,
    weeklyGrowth = 0,
    topProducts = [],
    categoryVelocity = [],
    totalStoresWithProducts = 0,
    totalStockDistributed = 0
  } = data

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
  }

  const chartData = adoptionTrend.map(d => ({
    ...d,
    dateFormatted: formatDate(d.date)
  }))

  const topProductsData = topProducts.slice(0, 8).reverse()

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex justify-end">
        <button
          onClick={exportToPDF}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-[#035CAB] hover:bg-[#02488a] text-white rounded-xl font-bold transition-all disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Exportar PDF
        </button>
      </div>

{/* Charts Container */}
      <div ref={chartRef} className="space-y-6 p-4 bg-[#F8FAFC] rounded-2xl">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Tiendas Activas</p>
            <p className="text-3xl font-black text-[#035CAB] mt-1">{totalStoresWithProducts}</p>
          </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Unidades Distribuidas</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{totalStockDistributed.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Penetracion de Mercado</p>
          <p className="text-3xl font-black text-[#76A5BA] mt-1">{totalMarketPenetration.toFixed(1)}%</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Crecimiento Semanal</p>
          <p className={`text-3xl font-black mt-1 ${weeklyGrowth >= 0 ? 'text-emerald-600' : 'text-[#E31836]'}`}>
            {weeklyGrowth >= 0 ? '+' : ''}{weeklyGrowth.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Adoption Trend - Area Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-1 flex items-center gap-2 text-[#035CAB]">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Tendencia de Adopciones
          </h3>
          <p className="text-xs text-slate-500 mb-4">Productos importados por semana</p>
          
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorImports" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#035CAB" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#035CAB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="dateFormatted" stroke="#94A3B8" tick={{ fontSize: 12 }} tickLine={false} />
                <YAxis stroke="#94A3B8" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#1E293B' }} />
                <Area type="monotone" dataKey="imports" stroke="#035CAB" fillOpacity={1} fill="url(#colorImports)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-slate-400">No hay datos de adopcion aun</div>
          )}
        </div>

        {/* Stores by Week - Line Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-1 flex items-center gap-2 text-[#035CAB]">
            <span className="w-2 h-2 rounded-full bg-[#76A5BA]"></span>
            Tiendas Unicas por Semana
          </h3>
          <p className="text-xs text-slate-500 mb-4">Nuevas tiendas cada semana</p>
          
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <XAxis dataKey="dateFormatted" stroke="#94A3B8" tick={{ fontSize: 12 }} tickLine={false} />
                <YAxis stroke="#94A3B8" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#1E293B' }} />
                <Line type="monotone" dataKey="stores" stroke="#76A5BA" strokeWidth={3} dot={{ r: 6, fill: '#76A5BA' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-slate-400">No hay datos de tiendas aun</div>
          )}
        </div>
      </div>

      {/* Top Products - Horizontal Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2 text-[#035CAB]">
          <span className="w-2 h-2 rounded-full bg-[#035CAB]"></span>
          Productos Mas Distribuidos
        </h3>
        <p className="text-xs text-slate-500 mb-4">Ranking por tiendas que lo han importado</p>
        
        {topProductsData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProductsData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" stroke="#94A3B8" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis type="category" dataKey="product_name" stroke="#94A3B8" tick={{ fontSize: 11 }} tickLine={false} width={120} tickFormatter={(value) => value.length > 15 ? value.slice(0, 15) + '...' : value} />
              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#1E293B' }} />
              <Bar dataKey="store_count" fill="#035CAB" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-slate-400">No hay productos distribuidos aun</div>
        )}
      </div>

      {/* Category Velocity */}
      {categoryVelocity.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-[#035CAB]">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Velocidad por Categoria
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categoryVelocity.map((cat, idx) => (
              <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-sm text-slate-600 truncate">{cat.category}</p>
                <p className="text-2xl font-black text-emerald-600">{cat.stores_count}</p>
                <p className="text-xs text-slate-400">{cat.stock_total} unidades</p>
                <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(100, (cat.stores_count / Math.max(1, categoryVelocity[0]?.stores_count || 1)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}