import React, { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import supabaseService from '@/services/supabaseService'
import { User, UserRole } from '@/types/index'
import AvatarUpload from './AvatarUpload'
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Shield,
  Eye,
  Lock,
  UserPlus,
  Key,
  Mail,
  User as UserIcon,
  Sparkles,
  Check
} from 'lucide-react'

export const roleColors: Record<string, string> = {
  admin: 'from-purple-600 to-indigo-600',
  supervisor: 'from-cyan-600 to-blue-600',
  vendedor: 'from-teal-500 to-emerald-600',
  almacen: 'from-amber-500 to-orange-600',
  cashier: 'from-emerald-600 to-teal-700',
  employee: 'from-blue-600 to-indigo-700',
  manager: 'from-indigo-600 to-purple-700',
}

export const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  supervisor: 'Supervisor (Solo lectura)',
  cashier: 'Cajero / Mostrador',
  employee: 'Empleado / Inventario',
}

// Preset de Avatares estilo iOS Memoji
const MEMOJI_PRESETS = [
  'https://api.dicebear.com/7.x/open-peeps/svg?seed=Sofia&face=smile,cute&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/open-peeps/svg?seed=Mateo&face=smileBig&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/open-peeps/svg?seed=Valentina&face=smile&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/open-peeps/svg?seed=Santiago&face=smileBig&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/open-peeps/svg?seed=Camila&face=cute&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/open-peeps/svg?seed=Diego&face=smile&backgroundColor=d1d4f9',
]

export default function UsersManagement() {
  const { users, setUsers, currentUser } = useAppStore()
  const { canManageUsers, isReadOnly } = usePermissions()
  const [loading, setLoading] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const loadedUsers = await supabaseService.getAllUsers()
      setUsers(loadedUsers)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (user: User) => {
    if (isReadOnly) return
    if (user.id === currentUser?.id) {
      alert('No puedes desactivar tu propio usuario')
      return
    }

    const newStatus = !user.active
    setUsers(users.map(u => u.id === user.id ? { ...u, active: newStatus } : u))

    try {
      await supabaseService.updateUser(user.id, { active: newStatus })
    } catch (error) {
      console.error('Error toggling user:', error)
      setUsers(users.map(u => u.id === user.id ? { ...u, active: !newStatus } : u))
      alert('Error al actualizar usuario')
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (isReadOnly) return
    if (user.id === currentUser?.id) {
      alert('No puedes eliminar tu propio usuario')
      return
    }

    if (!confirm(`¿Eliminar usuario "${user.username}"? Esta acción no se puede deshacer.`)) {
      return
    }

    const previousUsers = [...users]
    setUsers(users.filter(u => u.id !== user.id))

    try {
      await supabaseService.deleteUser(user.id)
    } catch (error) {
      console.error('Error deleting user:', error)
      setUsers(previousUsers)
      alert('Error al eliminar usuario')
    }
  }

  const filteredUsers = users.filter(u => showInactive || u.active)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Equipo & Personal</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-500 text-xs font-semibold">
              {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''} activo{filteredUsers.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border transition-all ${
                showInactive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
              }`}
            >
              {showInactive ? 'Ocultar inactivos' : 'Ver inactivos'}
            </button>
          </div>
        </div>

        {canManageUsers && !isReadOnly && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95 self-start sm:self-auto"
          >
            <UserPlus size={18} />
            <span>Invitar Empleado</span>
          </button>
        )}
      </div>

      {/* Read-only warning */}
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <Eye className="text-amber-600 shrink-0" size={22} />
          <div>
            <p className="font-extrabold text-xs text-amber-900 uppercase">Modo Solo Lectura</p>
            <p className="text-xs text-amber-700 font-medium">No cuentas con permisos para modificar o agregar cuentas de usuario.</p>
          </div>
        </div>
      )}

      {/* Users Grid - Estilo iOS Memoji Cards */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cargando perfiles...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user, idx) => {
            const displayName = (user.name && user.name.trim() !== '') 
              ? user.name 
              : ((user.username && user.username.trim() !== '') ? user.username : (user.email ? user.email.split('@')[0] : `Empleado ${idx + 1}`))
            
            const fallbackAvatar = MEMOJI_PRESETS[idx % MEMOJI_PRESETS.length]
            const isSelf = user.id === currentUser?.id
            const canEditThisCard = canManageUsers || isSelf

            return (
              <div
                key={user.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between group relative"
              >
                {/* Visual Top Header */}
                <div className={`h-24 bg-gradient-to-r ${roleColors[user.role] || 'from-indigo-600 to-purple-600'} p-4 relative`}>
                  <div className="flex justify-between items-start">
                    <span className="bg-white/20 backdrop-blur-md text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {roleLabels[user.role] || user.role}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border shadow-sm ${
                      user.active ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-red-500 text-white border-red-400'
                    }`}>
                      {user.active ? '● Activo' : '○ Inactivo'}
                    </span>
                  </div>
                </div>

                {/* Avatar flotante estilo iOS Memoji */}
                <div className="px-6 relative -mt-12 flex justify-between items-end">
                  <div className="relative">
                    <img 
                      src={user.avatar_url || fallbackAvatar} 
                      alt={displayName} 
                      className="w-20 h-20 rounded-3xl object-cover bg-slate-100 border-4 border-white shadow-xl transition-transform group-hover:scale-105" 
                    />
                    <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[8px] font-mono font-black px-1.5 py-0.5 rounded-md border border-white">
                      #0{idx + 1}
                    </span>
                  </div>

                  {canEditThisCard && (
                    <button
                      onClick={() => setEditingUser(user)}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                    >
                      <Edit2 size={13} />
                      <span>{isSelf ? 'Editar Mi Perfil' : 'Editar'}</span>
                    </button>
                  )}
                </div>

                {/* User Info Content */}
                <div className="p-6 pt-3 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-lg text-slate-900 tracking-tight leading-tight capitalize truncate">
                      {displayName}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1">
                      <Mail size={13} className="text-slate-400 shrink-0" />
                      <span>{user.email || `@${user.username || 'empleado'}`}</span>
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-slate-600 font-medium">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">PIN de Acceso:</span>
                      <span className="font-mono font-black text-slate-900">
                        {user.pin ? '••••' : 'No configurado'}
                      </span>
                    </div>
                    {isSelf && (
                      <div className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                        <Sparkles size={11} />
                        <span>Este es tu perfil actual</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  {canManageUsers && !isReadOnly && user.id !== currentUser?.id && (
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                          user.active
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {user.active ? 'Desactivar' : 'Activar'}
                      </button>

                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                        title="Eliminar usuario"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <InviteUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadUsers}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={loadUsers}
        />
      )}
    </div>
  )
}

// Modal para invitar usuario
function InviteUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    email: '',
    role: 'employee' as UserRole
  })
  const [loading, setLoading] = useState(false)
  const [devLink, setDevLink] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await supabaseService.inviteUser(formData.email, formData.role)

      if (result.success) {
        supabaseService.createAuditLog({
          userId: 'admin',
          action: 'invite_staff',
          entityType: 'user',
          entityId: formData.email,
          newValue: { role: formData.role }
        })

        if (result.devLink) {
          setDevLink(result.devLink)
        } else {
          alert('✅ ' + (result.message || 'Invitación enviada exitosamente'))
          onSuccess()
          onClose()
        }
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      console.error('Error inviting user:', error)
      alert('❌ Error al enviar invitación: ' + (error.message || 'Error desconocido'))
    } finally {
      if (!devLink) setLoading(false)
    }
  }

  if (devLink) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-scaleIn text-center border border-slate-100">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={36} />
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase">¡Invitación Creada!</h2>
          <p className="text-xs text-slate-500 font-medium mb-4">Enlace de activación generado para la cuenta:</p>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 mb-4 break-all text-xs font-mono text-indigo-600">
            {devLink}
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(devLink)
              alert('Enlace copiado al portapapeles')
            }}
            className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase mb-2 hover:bg-slate-800 transition-all"
          >
            Copiar Enlace
          </button>

          <button
            onClick={() => {
              onSuccess()
              onClose()
            }}
            className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs hover:bg-slate-200 transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-scaleIn border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <UserPlus size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase">Invitar Empleado</h2>
            <p className="text-xs text-slate-500 font-medium">Ingresa el correo para activar la cuenta.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl font-bold text-sm text-slate-900 focus:border-indigo-500 focus:bg-white transition-all outline-none"
              placeholder="ejemplo@empresa.com"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              Rol Asignado
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['cashier', 'employee', 'supervisor', 'manager', 'admin'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setFormData({ ...formData, role })}
                  className={`py-3 px-3 rounded-2xl text-xs font-bold border transition-all ${
                    formData.role === role
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {roleLabels[role] || role}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs hover:bg-slate-200 transition-all"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Enviar Invitación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Modal para editar perfil (Accesible por el Administrador y por el propio Empleado)
function EditUserModal({
  user,
  onClose,
  onSuccess
}: {
  user: User
  onClose: () => void
  onSuccess: () => void
}) {
  const { currentUser } = useAppStore()
  const { canManageUsers } = usePermissions()

  const [formData, setFormData] = useState({
    name: user.name || user.username || '',
    username: user.username || '',
    email: user.email || '',
    pin: user.pin || '',
    role: user.role,
    avatar_url: user.avatar_url || ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await supabaseService.updateUser(user.id, {
        name: formData.name,
        username: formData.username || formData.name,
        email: formData.email,
        pin: formData.pin,
        role: formData.role,
        avatar_url: formData.avatar_url
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error updating user profile:', error)
      alert('Error al actualizar perfil')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-scaleIn border border-slate-100 max-h-[90vh] flex flex-col">
        
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 shrink-0">
          <h2 className="text-lg font-black text-slate-900 uppercase">Editar Perfil de Empleado</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
        </div>

        <div className="overflow-y-auto space-y-4 pr-1 flex-1 custom-scrollbar">
          
          {/* Selector de Avatar Memoji iOS */}
          <div className="space-y-2 text-center">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              1. Selecciona un Avatar Estilo iOS Memoji
            </label>
            
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {MEMOJI_PRESETS.map((presetUrl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setFormData({ ...formData, avatar_url: presetUrl })}
                  className={`w-12 h-12 rounded-2xl border-2 transition-all p-0.5 ${
                    formData.avatar_url === presetUrl 
                      ? 'border-indigo-600 scale-110 shadow-lg shadow-indigo-200' 
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <img src={presetUrl} alt="memoji" className="w-full h-full object-cover rounded-xl" />
                </button>
              ))}
            </div>

            <div className="pt-2">
              <AvatarUpload
                userId={user.id}
                currentAvatarUrl={formData.avatar_url}
                onUploadComplete={(url) => setFormData({ ...formData, avatar_url: url })}
              />
            </div>
          </div>

          <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                Nombre Completo
              </label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 pl-10 pr-3.5 py-3 rounded-2xl font-bold text-sm text-slate-900 focus:border-indigo-500 focus:bg-white transition-all outline-none"
                  placeholder="Nombre de la empleada"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 pl-10 pr-3.5 py-3 rounded-2xl font-bold text-sm text-slate-900 focus:border-indigo-500 focus:bg-white transition-all outline-none"
                  placeholder="empleada@modamiel.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                PIN de 4 dígitos para Punto de Venta
              </label>
              <div className="relative">
                <Key size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  maxLength={4}
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                  className="w-full bg-slate-50 border border-slate-200 pl-10 pr-3.5 py-3 rounded-2xl font-mono font-black text-sm text-slate-900 focus:border-indigo-500 focus:bg-white transition-all outline-none"
                  placeholder="1234"
                />
              </div>
            </div>

            {canManageUsers && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  Rol del Usuario (Solo Admin)
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl font-bold text-sm text-slate-900 focus:border-indigo-500 focus:bg-white transition-all outline-none"
                >
                  <option value="employee">{roleLabels['employee']}</option>
                  <option value="cashier">{roleLabels['cashier']}</option>
                  <option value="supervisor">{roleLabels['supervisor']}</option>
                  <option value="manager">{roleLabels['manager']}</option>
                  <option value="admin">{roleLabels['admin']}</option>
                </select>
              </div>
            )}
          </form>

        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100 shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs hover:bg-slate-200 transition-all"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="edit-profile-form"
            className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar Perfil'}
          </button>
        </div>

      </div>
    </div>
  )
}
