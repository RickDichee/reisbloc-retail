// src/components/reports/SalesHistoryTab.tsx
import { useEffect, useState, useMemo } from 'react'
import { Search, Eye, X, User, Clock, CreditCard, Banknote, ArrowLeftRight, ChevronDown, ChevronUp, Package } from 'lucide-react'
import supabaseService from '@/services/supabaseService'

interface SalesHistoryTabProps {
  dateRange: { from: string; to: string }
}

interface SaleItem {
  productId?: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface Sale {
  id: string
  table_number?: number
  tableNumber?: number
  items: SaleItem[]
  subtotal: number
  discounts: number
  tax: number
  total: number
  paymentMethod: 'cash' | 'digital' | 'clip' | 'mixed'
  saleBy: string
  tip?: number
  notes?: string
  client_id?: string
  created_at: string
}

interface UserInfo {
  id: string
  name?: string
  username?: string
}

export default function SalesHistoryTab({ dateRange }: SalesHistoryTabProps) {
  const [sales, setSales] = useState<Sale[]>([])
  const [users, setUsers] = useState<UserInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'digital' | 'clip' | 'mixed'>('all')
  const [employeeFilter, setEmployeeFilter] = useState<'all' | string>('all')
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)

  // Load sales + users when date range changes
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const start = new Date(dateRange.from + 'T00:00:00')
        const end = new Date(dateRange.to + 'T23:59:59.999')
        const [saleData, userData] = await Promise.all([
          supabaseService.getSalesByDateRange(start, end),
          supabaseService.getAllUsers(),
        ])
        setSales(saleData as Sale[])
        setUsers(userData as UserInfo[])
      } catch (e) {
        console.error('Error loading sales history', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [dateRange])

  const userMap = useMemo(() => {
    const map: Record<string, string> = {}
    users.forEach(u => {
      map[u.id] = u.name ?? u.username ?? '—'
    })
    return map
  }, [users])

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      // payment method filter
      if (paymentFilter !== 'all' && s.paymentMethod !== paymentFilter) return false
      // employee filter
      if (employeeFilter !== 'all' && userMap[s.saleBy] !== employeeFilter) return false
      // search filter (ticket number, client name, product name)
      if (!search) return true
      const lower = search.toLowerCase()
      const ticket = `${s.tableNumber ?? s.table_number ?? ''}`.toLowerCase()
      if (ticket.includes(lower)) return true
      // extract client name from notes if present
      const clientMatch = s.notes?.match(/\[Cliente:\s*([^\]\n]+)\]/i)
      if (clientMatch && clientMatch[1].toLowerCase().includes(lower)) return true
      // product name search
      if (s.items?.some(it => it.productName.toLowerCase().includes(lower))) return true
      return false
    })
  }, [sales, paymentFilter, employeeFilter, search, userMap])

  const totalAmount = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + (s.total ?? 0), 0)
  }, [filteredSales])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.toLocaleDateString('es-MX')} ${d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
  }

  // Badge helper
  const paymentBadge = (method: string) => {
    switch (method) {
      case 'cash':
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">💵 Efectivo</span>
      case 'digital':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">📱 Transferencia</span>
      case 'clip':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">💳 Tarjeta</span>
      case 'mixed':
        return <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">🔄 Mixto</span>
      default:
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">—</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-2 py-1">
          <Search size={16} className="text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por ticket, cliente o producto"
            className="outline-none text-sm w-48"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="p-0.5 hover:bg-slate-200 rounded">
              <X size={14} className="text-slate-500" />
            </button>
          )}
        </div>
        {/* Payment filter */}
        <select
          className="border border-slate-300 rounded-lg px-2 py-1 text-sm"
          value={paymentFilter}
          onChange={e => setPaymentFilter(e.target.value as any)}
        >
          <option value="all">Todos los métodos</option>
          <option value="cash">Efectivo</option>
          <option value="digital">Transferencia</option>
          <option value="clip">Tarjeta</option>
          <option value="mixed">Mixto</option>
        </select>
        {/* Employee filter */}
        <select
          className="border border-slate-300 rounded-lg px-2 py-1 text-sm"
          value={employeeFilter}
          onChange={e => setEmployeeFilter(e.target.value as any)}
        >
          <option value="all">Todos los vendedores</option>
          {users.map(u => (
            <option key={u.id} value={u.name ?? u.username ?? ''}>
              {u.name ?? u.username ?? ''}
            </option>
          ))}
        </select>
        <div className="ml-auto text-sm font-medium text-slate-600">
          Total ventas: <span className="text-emerald-600">${totalAmount.toFixed(2)}</span> • {filteredSales.length} registro(s)
        </div>
      </div>

      {/* Table for md+ screens */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600"># Ticket</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Fecha / Hora</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Vendedor</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Productos</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-slate-600">Total</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Método</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredSales.map(s => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-sm text-slate-800">
                  {s.tableNumber ?? s.table_number ?? '—'}
                </td>
                <td className="px-4 py-2 text-sm text-slate-600">
                  {formatDate(s.created_at)}
                </td>
                <td className="px-4 py-2 text-sm text-slate-800">
                  {userMap[s.saleBy] ?? '—'}
                </td>
                <td className="px-4 py-2 text-sm text-slate-700">
                  {s.items?.length || 0} artículo(s)
                </td>
                <td className="px-4 py-2 text-right font-semibold text-emerald-600">
                  ${s.total?.toFixed(2)}
                </td>
                <td className="px-4 py-2 text-sm">{paymentBadge(s.paymentMethod)}</td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => setSelectedSale(s)}
                    className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900"
                  >
                    <Eye size={16} /> Ver detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Card list for mobile */}
      <div className="md:hidden space-y-4">
        {filteredSales.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-sm font-medium text-slate-800">Ticket #{s.tableNumber ?? s.table_number ?? '—'}</p>
                <p className="text-xs text-slate-500">{formatDate(s.created_at)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-emerald-600">${s.total?.toFixed(2)}</p>
                {paymentBadge(s.paymentMethod)}
              </div>
            </div>
            <button
              onClick={() => setSelectedSale(s)}
              className="w-full flex items-center justify-center gap-1 text-sm text-slate-600 hover:text-slate-900 mt-2"
            >
              <Eye size={14} /> Ver detalle
            </button>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-slate-900">
                Detalle del Ticket #{selectedSale.tableNumber ?? selectedSale.table_number ?? '—'}
              </h2>
              <button
                onClick={() => setSelectedSale(null)}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-2">
              <Clock size={14} className="inline-block mr-1" /> {formatDate(selectedSale.created_at)}
            </p>
            <p className="text-sm text-slate-600 mb-2">
              <User size={14} className="inline-block mr-1" /> Vendedor: {userMap[selectedSale.saleBy] ?? '—'}
            </p>
            {/* Cliente */}
            {selectedSale.notes && (
              <p className="text-sm text-slate-600 mb-2">
                {(() => {
                  const match = selectedSale.notes?.match(/\[Cliente:\s*([^\]\n]+)\]/i)
                  return match ? (
                    <>
                      <Package size={14} className="inline-block mr-1" /> Cliente: {match[1]}
                    </>
                  ) : null
                })()}
              </p>
            )}
            {/* Items table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full table-auto">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Producto</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Cant.</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Precio u.</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedSale.items?.map((it, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-sm text-slate-800">{it.productName || (it as any).name}</td>
                      <td className="px-3 py-2 text-right text-sm text-slate-800">{it.quantity}</td>
                      <td className="px-3 py-2 text-right text-sm text-slate-800">${(it.unitPrice || (it as any).price || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-medium text-emerald-600">
                        ${(it.totalPrice ?? (it.quantity * (it.unitPrice || (it as any).price || 0))).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Summary */}
            <div className="mt-4 space-y-1 text-right text-sm text-slate-700 border-t border-slate-100 pt-3">
              <p>Subtotal: ${selectedSale.subtotal?.toFixed(2) ?? '0.00'}</p>
              {selectedSale.discounts ? <p>Descuentos: -${selectedSale.discounts?.toFixed(2)}</p> : null}
              {selectedSale.tax ? <p>Impuestos: ${selectedSale.tax?.toFixed(2)}</p> : null}
              {selectedSale.tip ? <p>Propina: ${selectedSale.tip?.toFixed(2)}</p> : null}
              <p className="font-bold text-base text-slate-900">Total: ${selectedSale.total?.toFixed(2)}</p>
              <div className="flex justify-end items-center gap-2 pt-1">
                <span>Método de pago:</span> {paymentBadge(selectedSale.paymentMethod)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
