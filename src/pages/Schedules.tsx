import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useEmployeeSchedules } from '@/hooks/useBranches'
import { useBranches } from '@/hooks/useBranches'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Clock, Save, ChevronRight, Check, X } from 'lucide-react'

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function Schedules() {
  const { currentUser } = useAppStore()
  const { isAdmin } = usePermissions()
  const { schedules, setSchedule, DAY_NAMES } = useEmployeeSchedules()
  const { branches } = useBranches()

  const [editDay, setEditDay] = useState<number | null>(null)
  const [editData, setEditData] = useState({
    start_time: '09:00',
    end_time: '18:00',
    branch_id: ''
  })
  const [saving, setSaving] = useState(false)

  if (!currentUser) return <Navigate to="/login" replace />
  if (!isAdmin && currentUser.role === 'employee') {
    // Empleados pueden ver pero solo editar su propio horario
  }

  const getScheduleForDay = (day: number) => {
    return schedules.find(s => s.day_of_week === day)
  }

  const openEdit = (day: number) => {
    const existing = getScheduleForDay(day)
    setEditDay(day)
    setEditData({
      start_time: existing?.start_time?.substring(0, 5) || '09:00',
      end_time: existing?.end_time?.substring(0, 5) || '18:00',
      branch_id: existing?.branch_id || ''
    })
  }

  const handleSave = async () => {
    if (editDay === null) return
    setSaving(true)
    await setSchedule(
      editDay,
      editData.start_time,
      editData.end_time,
      editData.branch_id || undefined
    )
    setEditDay(null)
    setSaving(false)
  }

  const formatTime = (time: string | undefined) => {
    if (!time) return '—'
    return time.substring(0, 5)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur">
              <Clock size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black">Horarios de Trabajo</h1>
              <p className="text-emerald-200">Configura tu semana laboral</p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Los días marcados en verde son tus días de trabajo. 
            {currentUser?.role === 'employee' 
              ? ' Solo tú puedes ver esta información.'
              : ' Como admin, puedes configurar los horarios de cada empleado.'}
          </p>
        </div>

        {/* Schedule Grid */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-7">
            {DAYS_ES.map((day, index) => {
              const schedule = getScheduleForDay(index)
              const isEditing = editDay === index
              const isWeekend = index === 0 || index === 6
              const isToday = new Date().getDay() === index

              return (
                <div 
                  key={index}
                  className={`p-4 text-center border-r border-slate-100 last:border-r-0 ${
                    isToday ? 'bg-indigo-50' : ''
                  } ${schedule ? 'bg-emerald-50/30' : ''}`}
                >
                  <div className="mb-3">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      isToday ? 'text-indigo-600' : 'text-slate-500'
                    }`}>
                      {day.substring(0, 3)}
                    </span>
                    {isToday && (
                      <span className="ml-1 text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded font-bold">
                        HOY
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-slate-500">Entrada</label>
                        <input
                          type="time"
                          value={editData.start_time}
                          onChange={e => setEditData({ ...editData, start_time: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Salida</label>
                        <input
                          type="time"
                          value={editData.end_time}
                          onChange={e => setEditData({ ...editData, end_time: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-slate-200 rounded-lg"
                        />
                      </div>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        <Save size={12} />
                        {saving ? '...' : 'Guardar'}
                      </button>
                      <button
                        onClick={() => setEditDay(null)}
                        className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        <X size={12} />
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className={`text-lg font-black ${
                        schedule ? 'text-emerald-700' : 'text-slate-300'
                      }`}>
                        {schedule ? (
                          <>
                            {formatTime(schedule.start_time)}
                            <span className="text-xs font-normal mx-1">-</span>
                            {formatTime(schedule.end_time)}
                          </>
                        ) : (
                          'Descanso'
                        )}
                      </div>
                      <button
                        onClick={() => openEdit(index)}
                        className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1 mx-auto"
                      >
                        {schedule ? 'Editar' : 'Asignar'}
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <Check size={20} className="text-emerald-600" />
              </div>
              <span className="text-sm text-slate-500">Días laborales</span>
            </div>
            <p className="text-3xl font-black text-emerald-600">
              {schedules.length}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Clock size={20} className="text-blue-600" />
              </div>
              <span className="text-sm text-slate-500">Horas/semana</span>
            </div>
            <p className="text-3xl font-black text-blue-600">
              {schedules.reduce((acc, s) => {
                const start = parseInt(s.start_time.split(':')[0])
                const end = parseInt(s.end_time.split(':')[0])
                return acc + (end - start)
              }, 0)}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 rounded-xl">
                <X size={20} className="text-amber-600" />
              </div>
              <span className="text-sm text-slate-500">Días libres</span>
            </div>
            <p className="text-3xl font-black text-amber-600">
              {7 - schedules.length}
            </p>
          </div>
        </div>

        {/* Branches selector (if multiple branches) */}
        {branches.length > 1 && editDay !== null && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Asignar a sucursal (opcional)
            </label>
            <select
              value={editData.branch_id}
              onChange={e => setEditData({ ...editData, branch_id: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todas las sucursales</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
