import { useState, useEffect } from 'react'
import logger from '@/utils/logger'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import supabaseService from '@/services/supabaseService'
import {
  DollarSign,
  Check,
  AlertCircle,
  Loader,
  Printer,
  Mail,
  Share2,
  TrendingUp,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

export default function Closing() {
  const { currentUser } = useAppStore()
  const { isAdmin } = usePermissions()

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [closingData, setClosingData] = useState<any>(null)
  const [employeeMetrics, setEmployeeMetrics] = useState<any[]>([])
  const [daySales, setDaySales] = useState<any[]>([])
  const [confirmed, setConfirmed] = useState(false)
  const [notes, setNotes] = useState('')

  // Gestión de Planes: Verificar si la organización tiene acceso a features premium
  const userPlan = (currentUser as any)?.plan || 'free' // Por defecto free si no hay dato
  const canSendEmail = ['starter', 'growth', 'scale', 'enterprise'].includes(userPlan)

  useEffect(() => {
    loadClosingData()
  }, [])

  const loadClosingData = async () => {
    setLoading(true)
    try {
      // Usar UTC correctamente - obtener hoy en UTC
      const today = new Date()
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0))
      const tomorrowUTC = new Date(todayUTC)
      tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1)

      // Obtener ventas del día desde Supabase y calcular métricas localmente
      const sales = await supabaseService.getSalesByDateRange(todayUTC, tomorrowUTC)

      // Métricas generales de cierre
      const metrics = sales.reduce(
        (acc: any, sale: any) => {
          const total = Number(sale.total || 0)
          acc.totalSales += total
          acc.transactionCount += 1
          const method = (sale.payment_method || '').toLowerCase()
          if (method === 'cash') {
            acc.totalCash += total
          } else if (['digital', 'transferencia', 'transfer'].includes(method)) {
            acc.totalDigital += total
          } else if (['clip', 'tarjeta', 'card'].includes(method)) {
            acc.totalClip += total
          }
          return acc
        },
        {
          totalSales: 0,
          totalCash: 0,
          totalDigital: 0,
          totalClip: 0,
          totalDiscounts: 0,
          transactionCount: 0,
          averageTicket: 0,
        }
      )
      metrics.averageTicket = metrics.transactionCount
        ? metrics.totalSales / metrics.transactionCount
        : 0

      // Métricas por empleado
      const users = await supabaseService.getAllUsers()
      const byUser: Record<string, any> = {}
      users.forEach(u => {
        byUser[u.id] = {
          userId: u.id,
          userName: (u as any).username || (u as any).name || 'Usuario',
          role: u.role,
          salesCount: 0,
          totalSales: 0,
          averageTicket: 0,
        }
      })
      sales.forEach((sale: any) => {
        const uid = sale.waiter_id || sale.saleBy
        if (uid && byUser[uid]) {
          byUser[uid].salesCount += 1
          byUser[uid].totalSales += Number(sale.total || 0)
          byUser[uid].totalTips += Number(sale.tip_amount || sale.tip || 0)
        }
      })
      const employees = Object.values(byUser)
        .filter((m: any) => m.salesCount > 0)
        .map((m: any) => ({
          ...m,
          averageTicket: m.salesCount ? m.totalSales / m.salesCount : 0,
        }))
        .sort((a: any, b: any) => b.totalSales - a.totalSales)

      setClosingData(metrics)
      setEmployeeMetrics(employees)
      setDaySales(sales)
    } catch (error) {
      logger.error('closing', 'Error loading closing data', error as any)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitClosing = async () => {
    if (!confirmed) {
      alert('Por favor confirma el cierre de caja')
      return
    }

    setSubmitting(true)
    try {
      const closingRecord = {
        date: new Date(),
        closedBy: currentUser?.id || '',
        closedAt: new Date(),
        totalSales: closingData.totalSales,
        totalCash: closingData.totalCash,
        totalCard: closingData.totalClip,
        totalDigital: closingData.totalDigital,
        totalTips: 0,
        ordersCount: closingData.transactionCount || 0,
        salesCount: closingData.transactionCount || 0,
        employeeMetrics,
        sales: daySales.map((s: any) => ({
          id: s.id,
          total: s.total,
          payment_method: s.payment_method,
          saleBy: s.saleBy || s.waiter_id,
          created_at: s.created_at,
          items: s.items || [],
        })) as any[],
        tipsDistribution: [],
        adjustments: [],
        paymentMethods: {
          cash: closingData.totalCash,
          card: closingData.totalClip,
          digital: closingData.totalDigital,
        },
        notes,
        status: 'closed',
      }

      await supabaseService.saveClosing(closingRecord)

      alert('✅ Cierre de caja guardado exitosamente')
      setConfirmed(false)
      setNotes('')
      loadClosingData()
    } catch (error) {
      logger.error('closing', 'Error submitting closing', error as any)
      alert('❌ Error al guardar el cierre de caja')
    } finally {
      setSubmitting(false)
    }
  }

  const handleShareReport = async () => {
    if (!closingData) return

    const dateStr = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
    const text = `
📊 *REPORTE DE CIERRE - ${currentUser?.businessName || 'REISBLOC POS'}*
📅 ${dateStr}

💰 *Ventas Totales:* $${closingData.totalSales?.toFixed(2)}
🔢 *Transacciones:* ${closingData.transactionCount}
💵 *Ticket Promedio:* $${closingData.averageTicket?.toFixed(2)}

💳 *Desglose:*
- Efectivo: $${closingData.totalCash?.toFixed(2)}
- Tarjeta: $${closingData.totalClip?.toFixed(2)}
- Digital: $${closingData.totalDigital?.toFixed(2)}

🚀 _Generado con Reisbloc POS_
    `.trim()

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Cierre de Caja',
          text: text,
        })
      } catch (err) {
        logger.warn('closing', 'Error al compartir', err as any)
      }
    } else {
      // Fallback para PC: Copiar al portapapeles
      navigator.clipboard.writeText(text)
      alert('📋 Reporte copiado al portapapeles (pégalo en WhatsApp)')
    }
  }

  const handlePrintClosing = () => {
    const printContent = generatePrintHTML()
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.onload = () => {
        printWindow.print()
      }
    }
  }

  const handleSendEmail = async () => {
    if (!canSendEmail) {
      alert('📧 Esta función es exclusiva de los planes Pro y Enterprise.\n\nContacta a soporte para actualizar tu plan.')
      return
    }

    if (!currentUser?.email) {
      alert('⚠️ No hay correo registrado en tu perfil')
      return
    }

    try {
      const response = await fetch('/.netlify/functions/sendClosingEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          username: currentUser.username,
          closingData,
          employeeMetrics,
          notes,
          date: new Date().toLocaleDateString('es-MX'),
        }),
      })

      if (response.ok) {
        alert('✅ Correo enviado exitosamente')
      } else {
        alert('❌ Error al enviar el correo')
      }
    } catch (error) {
      logger.error('closing', 'Error sending email', error as any)
      alert('❌ Error de conexión al enviar correo')
    }
  }

  const generatePrintHTML = () => {
    const total = closingData?.totalSales || 0
    const discounts = closingData?.totalDiscounts || 0
    const toDeposit = total - discounts

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Cierre de Caja - ${new Date().toLocaleDateString('es-MX')}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            margin: 0;
            padding: 20px;
            background: white;
          }
          .receipt {
            max-width: 400px;
            margin: 0 auto;
            border: 1px solid #000;
            padding: 20px;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .header h1 { margin: 0; font-size: 18px; }
          .header p { margin: 5px 0; font-size: 12px; }
          .section {
            margin: 15px 0;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .line {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin: 5px 0;
          }
          .line strong { font-weight: bold; }
          .total-line {
            font-size: 14px;
            font-weight: bold;
            margin-top: 10px;
          }
          .employee-table {
            width: 100%;
            font-size: 11px;
            border-collapse: collapse;
          }
          .employee-table th {
            border-bottom: 1px solid #000;
            padding: 5px;
            text-align: left;
          }
          .employee-table td {
            padding: 5px;
            border-bottom: 1px dotted #ccc;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 10px;
          }
          @media print {
            body { margin: 0; padding: 0; }
            .receipt { border: none; margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>🏪 TPV SOLUTIONS</h1>
            <p>CIERRE DE CAJA</p>
            <p>${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p>Cajero: ${currentUser?.username}</p>
          </div>

          <div class="section">
            <div class="line">
              <span>Total Ventas:</span>
              <strong>$${total.toFixed(2)}</strong>
            </div>
            <div class="line">
              <span>Descuentos:</span>
              <strong>-$${discounts.toFixed(2)}</strong>
            </div>
            <div class="line total-line">
              <span>A DEPOSITAR:</span>
              <span>$${toDeposit.toFixed(2)}</span>
            </div>
          </div>

          <div class="section">
            <strong>DESGLOSE DE PAGOS</strong>
            <div class="line">
              <span>Efectivo:</span>
              <span>$${(closingData?.totalCash || 0).toFixed(2)}</span>
            </div>
            <div class="line">
              <span>Digital:</span>
              <span>$${(closingData?.totalDigital || 0).toFixed(2)}</span>
            </div>
            <div class="line">
              <span>CLIP:</span>
              <span>$${(closingData?.totalClip || 0).toFixed(2)}</span>
            </div>
          </div>

          <div class="section">
            <strong>MÉTRICAS</strong>
            <div class="line">
              <span>Transacciones:</span>
              <span>${closingData?.transactionCount || 0}</span>
            </div>
            <div class="line">
              <span>Ticket Promedio:</span>
              <span>$${(closingData?.averageTicket || 0).toFixed(2)}</span>
            </div>
          </div>

          ${employeeMetrics && employeeMetrics.length > 0 ? `
          <div class="section">
            <strong>DESEMPEÑO DE EMPLEADOS</strong>
            <table class="employee-table">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Ventas</th>
                  <th>Propinas</th>
                </tr>
              </thead>
              <tbody>
                ${employeeMetrics.map(emp => `
                  <tr>
                    <td>${emp.userName}</td>
                    <td>$${emp.totalSales.toFixed(2)}</td>
                    <td>$${emp.totalTips.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${notes ? `
          <div class="section">
            <strong>NOTAS:</strong>
            <p style="font-size: 11px; margin: 5px 0;">${notes}</p>
          </div>
          ` : ''}

          <div class="footer">
            <p>Documento generado automáticamente por Reisbloc POS</p>
            <p>${new Date().toLocaleTimeString('es-MX')}</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  if (!isAdmin) {
    return <Navigate to="/pos" replace />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader size={48} className="animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-slate-500 font-bold">Cargando datos de cierre...</p>
        </div>
      </div>
    )
  }

  const COLORS = ['#10b981', '#334155', '#f59e0b']

  return (
    <DashboardLayout>
      <div className="relative space-y-6">
        {/* Header - Premium Slate/Emerald Style */}
        <div className="bg-slate-900 text-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden border border-white/5 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
          <div className="px-6 py-6 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
                <DollarSign size={28} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-emerald-400 uppercase tracking-[0.2em] font-black mb-0.5">Finanzas</p>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase leading-none">Cierre de Caja</h1>
                <p className="text-slate-400 mt-2 font-bold tracking-tight opacity-80 uppercase text-xs">
                  {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-5 py-2.5 rounded-2xl border border-white/10">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
              <span className="font-bold text-white text-sm uppercase tracking-wide">{currentUser?.username}</span>
            </div>
          </div>
        </div>

        {/* Alert - Clean */}
        <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 flex items-start gap-4 shadow-sm">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl shrink-0">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="font-black text-amber-900 uppercase tracking-wide text-xs mb-1">Aviso Importante</p>
            <p className="text-amber-800 font-medium text-sm leading-relaxed">Este proceso generará un cierre oficial del día. Revisa todos los números antes de confirmar.</p>
          </div>
        </div>

        {/* Summary Cards - Clean White Cards with Accents */}
        {closingData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Total Ventas', value: closingData.totalSales, icon: DollarSign, color: ' text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Transacciones', value: closingData.transactionCount, icon: BarChart, color: 'text-slate-600', bg: 'bg-slate-50', isCount: true },
              { label: 'Ticket Promedio', value: closingData.averageTicket, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:shadow-xl transition-all duration-300 group">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-4 rounded-2xl ${item.bg} ${item.color} group-hover:scale-110 transition-transform`}>
                    <item.icon size={24} />
                  </div>
                </div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{item.label}</p>
                <p className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
                  {item.isCount ? item.value : `$${item.value?.toFixed(2)}`}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Payment Breakdown */}
        {closingData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Methods Chart */}
            <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8">
              <h3 className="text-xl font-black text-stone-800 mb-6">Métodos de Pago</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Efectivo', value: closingData.totalCash || 0 },
                      { name: 'Transferencia', value: closingData.totalDigital || 0 },
                      { name: 'Tarjeta', value: closingData.totalClip || 0 },
                    ].filter(p => p.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${typeof value === 'number' ? value.toFixed(2) : value}`} />
                </PieChart>
              </ResponsiveContainer>

              {/* Payment Summary */}
              <div className="mt-6 space-y-3">
                <div className="flex justify-between items-center p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <span className="font-bold text-slate-700">Efectivo</span>
                  <span className="text-lg font-black text-emerald-600">${(closingData.totalCash || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <span className="font-bold text-slate-700">Transferencia</span>
                  <span className="text-lg font-black text-slate-600">${(closingData.totalDigital || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                  <span className="font-bold text-slate-700">Tarjeta (Clip/Terminal)</span>
                  <span className="text-lg font-black text-amber-600">${(closingData.totalClip || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Discounts & Taxes */}
            <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8 space-y-6">
              <h3 className="text-xl font-black text-stone-800">Resumen Financiero</h3>

              <div className="flex justify-between items-center py-6 bg-stone-900 rounded-2xl p-6 text-white mt-4">
                <span className="font-bold text-stone-300">Total a Depositar</span>
                <span className="text-3xl font-black text-white">
                  ${((closingData.totalSales || 0) - (closingData.totalDiscounts || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Employee Metrics */}
        {employeeMetrics && employeeMetrics.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8">
            <h3 className="text-xl font-black text-slate-900 mb-6">Desempeño de Empleados</h3>
            <ResponsiveContainer width="100%" height={300}>
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
                <Bar dataKey="totalSales" name="Ventas" fill="#334155" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Employee Table */}
            <div className="overflow-x-auto mt-6">
              <table className="w-full">
                <thead className="bg-slate-50 rounded-xl">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider rounded-l-xl">Empleado</th>
                    <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-wider">Ventas</th>
                    <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-wider rounded-r-xl">Tickets</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeeMetrics.map((emp: any) => (
                    <tr key={emp.userId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-700">{emp.userName}</td>
                      <td className="px-6 py-4 text-right font-black text-emerald-600 tracking-tight">${emp.totalSales.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-slate-600 font-bold">{emp.salesCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notes Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8">
          <h3 className="text-lg font-black text-stone-800 mb-4">Notas del Cierre</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Descrepancia en caja, cliente reclamo, etc."
            className="w-full px-4 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none resize-none font-medium text-stone-700"
            rows={4}
          />
        </div>

        {/* Confirmation Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8 space-y-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center flex-shrink-0">
              <AlertCircle size={16} />
            </div>
            <div>
              <h3 className="font-black text-stone-800 text-lg">Confirmación de Cierre</h3>
              <p className="text-stone-500 font-medium mt-1">Al confirmar, este cierre de caja se registrará permanentemente.</p>
            </div>
          </div>

          <label className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-6 h-6 rounded-lg accent-emerald-500"
            />
            <span className="font-bold text-slate-700">
              Confirmo que todos los datos son correctos y autorizo el cierre de caja
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 flex-wrap">
            <button
              onClick={handleSubmitClosing}
              disabled={!confirmed || submitting}
              className="flex-1 min-w-[200px] bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              {submitting ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Completar Cierre
                </>
              )}
            </button>
            <button
              onClick={handlePrintClosing}
              className="px-6 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-4 rounded-2xl transition-all flex items-center gap-2"
            >
              <Printer size={20} />
              <span className="hidden md:inline">Imprimir</span>
            </button>
            <button
              onClick={handleShareReport}
              className="px-6 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-4 rounded-2xl transition-all flex items-center gap-2"
            >
              <Share2 size={20} />
              <span className="hidden md:inline">Compartir</span>
            </button>
            <button
              onClick={handleSendEmail}
              className={`px-6 font-bold py-4 rounded-2xl transition-all flex items-center gap-2 ${canSendEmail ? 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              <Mail size={20} />
              <span className="hidden md:inline">Enviar por Correo</span>
            </button>
            <button
              onClick={loadClosingData}
              className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition-all"
            >
              Recargar
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout >
  )
}
