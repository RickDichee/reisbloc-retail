import { useState, useEffect } from 'react'
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
  UserPlus
} from 'lucide-react'

export const roleColors: Record<string, string> = {
  admin: 'from-purple-500 to-indigo-600',
  supervisor: 'from-blue-500 to-cyan-600',
  vendedor: 'from-teal-500 to-green-600',
  almacen: 'from-orange-500 to-red-600',
  mostrador: 'from-green-500 to-emerald-600',
  manager: 'from-blue-600 to-indigo-700',
}

export const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  supervisor: 'Supervisor (Solo lectura)',
  cashier: 'Cajero',
  employee: 'Empleado',
}

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
    // Actualización Optimista: Cambiamos el estado local de inmediato
    setUsers(users.map(u => u.id === user.id ? { ...u, active: newStatus } : u))

    try {
      await supabaseService.updateUser(user.id, { active: newStatus })
    } catch (error) {
      console.error('Error toggling user:', error)
      setUsers(users.map(u => u.id === user.id ? { ...u, active: !newStatus } : u)) // Revertir si falla
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

    // Actualización Optimista: Lo quitamos de la lista de inmediato
    const previousUsers = [...users]
    setUsers(users.filter(u => u.id !== user.id))

    try {
      await supabaseService.deleteUser(user.id)
    } catch (error) {
      console.error('Error deleting user:', error)
      setUsers(previousUsers) // Revertir si falla
      alert('Error al eliminar usuario')
    }
  }

  const filteredUsers = users.filter(u => showInactive || u.active)


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-gray-600 text-sm">
              {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''} visible{filteredUsers.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${showInactive
                ? 'bg-slate-800 text-white border-slate-800'
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
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Invitar Staff
          </button>
        )}
      </div>

      {/* Read-only warning */}
      {isReadOnly && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Eye className="text-blue-600" size={24} />
          <div>
            <p className="font-bold text-blue-900">Modo Solo Lectura</p>
            <p className="text-sm text-blue-700">No puedes crear, editar o eliminar usuarios</p>
          </div>
        </div>
      )}

      {/* Users Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="spinner mx-auto mb-4" />
          <p className="text-gray-600">Cargando usuarios...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user, idx) => {
            const displayName = (user.name && user.name.trim() !== '') 
              ? user.name 
              : ((user.username && user.username.trim() !== '') ? user.username : (user.email ? user.email.split('@')[0] : `Staff ${idx + 1}`))
            
            const avatarSeed = encodeURIComponent(displayName)
            const fallbackAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9`

            return (
              <div
                key={user.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 hover:shadow-lg transition-all overflow-hidden relative group"
              >
                {/* Header con rol y Gafete Animado */}
                <div className={`bg-gradient-to-r ${roleColors[user.role] || 'from-indigo-600 to-purple-600'} -mx-4 -mt-4 p-4.5 mb-4 rounded-t-2xl`}>
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <img 
                          src={user.avatar_url || fallbackAvatar} 
                          alt={displayName} 
                          className="w-13 h-13 rounded-2xl object-cover border-2 border-white/40 bg-white/20 shadow-md transition-transform group-hover:scale-105" 
                        />
                        <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-white uppercase shadow">
                          GAFETE
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-base leading-tight truncate capitalize">{displayName}</h3>
                        {user.email ? (
                          <p className="text-[11px] font-bold opacity-90 truncate">{user.email}</p>
                        ) : (
                          <p className="text-[11px] font-bold opacity-90 truncate">@{user.username || 'staff'}</p>
                        )}
                        <span className="inline-block mt-1 bg-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                          {roleLabels[user.role] || user.role}
                        </span>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div title={user.active ? 'Usuario Activo' : 'Usuario Inactivo'}>
                      {user.active ? (
                        <CheckCircle size={22} className="text-emerald-300 drop-shadow" />
                      ) : (
                        <XCircle size={22} className="opacity-60 text-red-200" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Estado Operativo:</span>
                    <span className={`font-black px-2 py-0.5 rounded-full text-[10px] uppercase ${user.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {user.active ? '● Activo' : '○ Inactivo'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">ID de Empleado:</span>
                    <span className="font-mono font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      #STF-0{idx + 1}
                    </span>
                  </div>

                {/* Actions */}
                {canManageUsers && !isReadOnly && user.id !== currentUser?.id && (
                  <div className="flex gap-2 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => handleToggleActive(user)}
                      className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${user.active
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                    >
                      {user.active ? 'Desactivar' : 'Activar'}
                    </button>

                    <button
                      onClick={() => setEditingUser(user)}
                      className="p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-all"
                    >
                      <Edit2 size={18} />
                    </button>

                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}

                {user.id === currentUser?.id && (
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Lock size={16} />
                      <span>Este es tu usuario actual</span>
                    </div>
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
        // Registrar acción en la bitácora
        supabaseService.createAuditLog({
          userId: 'admin',
          action: 'invite_staff',
          entityType: 'user',
          entityId: formData.email,
          newValue: { role: formData.role }
        });

        if (result.devLink) {
          setDevLink(result.devLink)
        } else {
          alert('✅ ' + (result.message || 'Invitación enviada o usuario transferido exitosamente'))
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-scaleIn text-center">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-2">¡Invitación Generada!</h2>
          <p className="text-gray-600 mb-6">Como estamos en desarrollo, copia este enlace para activar la cuenta:</p>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 break-all text-xs font-mono text-indigo-600">
            {devLink}
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(devLink)
              alert('Enlace copiado')
            }}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold mb-3 hover:bg-slate-800 transition-all"
          >
            Copiar Enlace
          </button>

          <button
            onClick={() => {
              onSuccess()
              onClose()
            }}
            className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scaleIn">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <UserPlus size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase">Invitar Staff</h2>
            <p className="text-xs text-slate-500 font-medium">Se enviará un correo para activar la cuenta.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold text-slate-900 focus:border-indigo-500 focus:bg-white transition-all outline-none"
              placeholder="ejemplo@empresa.com"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
              Rol del Empleado
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['cashier', 'employee', 'supervisor', 'manager', 'admin'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setFormData({ ...formData, role })}
                  className={`py-3 px-4 rounded-xl text-xs font-bold capitalize border-2 transition-all ${formData.role === role
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm'
                    : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
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
              className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0"
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

// Modal para editar usuario
function EditUserModal({
  user,
  onClose,
  onSuccess
}: {
  user: User
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    username: user.username,
    role: user.role,
    avatar_url: user.avatar_url || ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    try {
      await supabaseService.updateUser(user.id, {
        username: formData.username,
        role: formData.role,
        avatar_url: formData.avatar_url
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Error al actualizar usuario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scaleIn">
        <h2 className="text-2xl font-bold mb-4">Editar Usuario</h2>

        <div className="mb-6 flex justify-center">
          <AvatarUpload
            userId={user.id}
            currentAvatarUrl={formData.avatar_url}
            onUploadComplete={(url) => setFormData({ ...formData, avatar_url: url })}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Nombre de usuario
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Rol
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="input-field"
            >
              <option value="employee">{roleLabels['employee']}</option>
              <option value="cashier">{roleLabels['cashier']}</option>
              <option value="supervisor">{roleLabels['supervisor']}</option>
              <option value="manager">{roleLabels['manager']}</option>
              <option value="admin">{roleLabels['admin']}</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
