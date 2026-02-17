import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, Users, Calendar } from 'lucide-react'
import supabaseService from '@/services/supabaseService'
import { useAppStore } from '@/store/appStore'
import logger from '@/utils/logger'

export default function TipsWidget() {
  const { currentUser } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [tips, setTips] = useState({
    today: 0,
    week: 0,
    month: 0,
  })

  useEffect(() => {
    loadTips()
  }, [currentUser])

  const loadTips = async () => {
    if (!currentUser) return

    setLoading(true)
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Obtener ventas del día
      const sales = await supabaseService.getSalesByDateRange(today, tomorrow)
      
      // Filtrar ventas del usuario actual (si no es admin/supervisor)
      const userSales = ['admin', 'supervisor', 'capitan'].includes(currentUser.role)
        ? sales
        : sales.filter(s => s.saleBy === currentUser.id)

      // Calcular propinas del día
      const todayTips = userSales.reduce((sum, sale) => sum + (sale.tip || 0), 0)

      // Calcular propinas de la semana (últimos 7 días)
      const weekStart = new Date(today)
      weekStart.setDate(weekStart.getDate() - 7)
      const weekSales = await supabaseService.getSalesByDateRange(weekStart, tomorrow)
      const userWeekSales = ['admin', 'supervisor', 'capitan'].includes(currentUser.role)
        ? weekSales
        : weekSales.filter(s => s.saleBy === currentUser.id)
      const weekTips = userWeekSales.reduce((sum, sale) => sum + (sale.tip || 0), 0)

      // Calcular propinas del mes
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const monthSales = await supabaseService.getSalesByDateRange(monthStart, tomorrow)
      const userMonthSales = ['admin', 'supervisor', 'capitan'].includes(currentUser.role)
        ? monthSales
        : monthSales.filter(s => s.saleBy === currentUser.id)
      const monthTips = userMonthSales.reduce((sum, sale) => sum + (sale.tip || 0), 0)

      setTips({
        today: todayTips,
        week: weekTips,
        month: monthTips,
      })
    } catch (error) {
      logger.error('tips', 'Error loading tips', error as any)
    } finally {
      setLoading(false)
    }
  }

  const currency = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  })

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 border-2 border-green-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
          <DollarSign className="text-white" size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Propinas del Equipo</h3>
          <p className="text-sm text-gray-600">
            {['admin', 'supervisor', 'capitan'].includes(currentUser?.role || '')
              ? 'Totales del equipo'
              : 'Acumulado personal'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hoy */}
        <div className="bg-white rounded-xl p-4 border-2 border-green-200">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <Calendar size={18} />
            <span className="text-sm font-semibold">Hoy</span>
          </div>
          <p className="text-2xl font-black text-gray-900">{currency.format(tips.today)}</p>
          <p className="text-xs text-gray-600 mt-1">Propinas del día</p>
        </div>

        {/* Semana */}
        <div className="bg-white rounded-xl p-4 border-2 border-green-200">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <TrendingUp size={18} />
            <span className="text-sm font-semibold">Semana</span>
          </div>
          <p className="text-2xl font-black text-gray-900">{currency.format(tips.week)}</p>
          <p className="text-xs text-gray-600 mt-1">Últimos 7 días</p>
        </div>

        {/* Mes */}
        <div className="bg-white rounded-xl p-4 border-2 border-green-200">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <Users size={18} />
            <span className="text-sm font-semibold">Mes</span>
          </div>
          <p className="text-2xl font-black text-gray-900">{currency.format(tips.month)}</p>
          <p className="text-xs text-gray-600 mt-1">Mes actual</p>
        </div>
      </div>

      {tips.today > 0 && (
        <div className="mt-4 p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white">
          <p className="text-sm font-semibold">🎉 ¡Excelente trabajo!</p>
          <p className="text-xs opacity-90">
            Has generado {currency.format(tips.today)} en propinas hoy
          </p>
        </div>
      )}
    </div>
  )
}
