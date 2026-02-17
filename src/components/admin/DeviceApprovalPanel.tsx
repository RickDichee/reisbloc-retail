import { useEffect, useState } from 'react'
import {
  Smartphone,
  Check,
  X,
  Clock,
  Shield,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Laptop
} from 'lucide-react'
import supabaseService from '@/services/supabaseService'
import { Device } from '@/types'
import { supabase } from '@/config/supabase'
import Card from '@/components/common/Card'

// Helper simple para mostrar tiempo relativo
const timeAgo = (date: Date | string) => {
  if (!date) return 'Hace un momento'
  const d = new Date(date)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000)

  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + " años"
  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + " meses"
  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + " días"
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + " horas"
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + " min"
  return "Hace un momento"
}

export default function DeviceApprovalPanel() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDevices = async () => {
    setLoading(true)
    try {
      // Asegúrate de que este método exista en tu supabaseService
      // Si no, usa: const { data } = await supabase.from('devices').select('*')
      const data = await supabaseService.getAllDevices()
      setDevices(data || [])
    } catch (error) {
      console.error('Error fetching devices:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()

    // Suscripción en tiempo real a cambios en dispositivos
    const channel = supabase
      .channel('devices_approval_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices' },
        () => {
          fetchDevices() // Recargar lista si hay cambios
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleStatusChange = async (deviceId: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await supabaseService.approveDevice(deviceId)
      } else {
        await supabaseService.revokeDevice(deviceId)
      }
      await fetchDevices()
    } catch (error) {
      console.error('Error updating device:', error)
      alert('Error al actualizar el dispositivo')
    }
  }

  const handleDelete = async (deviceId: string) => {
    if (!window.confirm('¿Eliminar este dispositivo permanentemente?')) return
    try {
      await supabaseService.deleteDevice(deviceId)
      await fetchDevices()
    } catch (error) {
      console.error('Error deleting device:', error)
    }
  }

  const getDeviceIcon = (name?: string | null) => {
    const n = (name || '').toLowerCase()
    if (n.includes('mobile') || n.includes('android') || n.includes('iphone')) return <Smartphone size={20} />
    return <Laptop size={20} />
  }

  const pendingDevices = devices.filter(d => !d.isApproved && !d.isRejected)
  const approvedDevices = devices.filter(d => d.isApproved)

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando dispositivos...</div>

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Sección de Pendientes */}
      {pendingDevices.length > 0 && (
        <Card noPadding className="border-l-4 border-yellow-500">
          <div className="p-6 bg-yellow-50 border-b border-yellow-100 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-yellow-800 flex items-center gap-2">
                <AlertTriangle size={24} />
                Solicitudes Pendientes
              </h2>
              <p className="text-yellow-700 text-sm mt-1">Dispositivos esperando autorización.</p>
            </div>
            <span className="bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full font-bold text-sm">
              {pendingDevices.length}
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingDevices.map(device => (
              <div key={device.id} className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">{getDeviceIcon(device.deviceName)}</div>
                  <div>
                    <h3 className="font-bold text-gray-900">{device.deviceName || 'Sin nombre'}</h3>
                    <p className="text-sm text-gray-500">Usuario: {(device as any).userName || device.userId}</p>
                    <p className="text-xs text-gray-400 font-mono mt-1">ID: {device.id}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleStatusChange(device.id, 'reject')} className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-semibold flex items-center gap-2"><X size={18} /> Rechazar</button>
                  <button onClick={() => handleStatusChange(device.id, 'approve')} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow-md flex items-center gap-2"><Check size={18} /> Aprobar</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sección de Aprobados */}
      <Card noPadding>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Shield size={24} className="text-[var(--brand-primary)]" />
            Dispositivos Autorizados
          </h2>
          <button onClick={fetchDevices} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"><RefreshCw size={20} /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="px-6 py-3 text-left">Dispositivo</th>
                <th className="px-6 py-3 text-left">Usuario</th>
                <th className="px-6 py-3 text-left">Último Acceso</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {approvedDevices.map(device => (
                <tr key={device.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="text-gray-400">{getDeviceIcon(device.deviceName)}</div>
                      <div>
                        <p className="font-semibold text-gray-900">{device.deviceName}</p>
                        <p className="text-xs text-gray-500 font-mono">{device.macAddress || 'No MAC'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="font-medium text-gray-900">{(device as any).userName || 'Desconocido'}</div>
                    <div className="text-xs text-gray-400">{device.userId.slice(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{timeAgo(device.lastAccess)}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(device.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}