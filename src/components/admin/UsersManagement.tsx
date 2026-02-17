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
  Lock
} from 'lucide-react'


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

  const roleColors = {
    admin: 'from-purple-500 to-indigo-600',
    capitan: 'from-blue-500 to-cyan-600',
    mesero: 'from-teal-500 to-green-600',
    cocina: 'from-orange-500 to-red-600',
    bar: 'from-green-500 to-emerald-600',
    supervisor: 'from-gray-500 to-gray-700',
  }

  const roleLabels = {
    admin: 'Administrador',
    capitan: 'Capitán',
    mesero: 'Mesero',
    cocina: 'Cocina',
    bar: 'Bar',
    supervisor: 'Supervisor',
  }

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
            className="btn-primary flex items-center gap-2 opacity-50 cursor-not-allowed grayscale"
            disabled={true}
            title="Creación de usuarios deshabilitada temporalmente"
          >
            <Plus size={20} />
            Nuevo Usuario
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
          {filteredUsers.map(user => (
            <div
              key={user.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-all"
            >
              {/* Header con rol */}
              <div className={`bg-gradient-to-r ${roleColors[user.role]} rounded-xl p-4 -m-6 mb-4`}>
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.username} className="w-12 h-12 rounded-full object-cover border-2 border-white/30 shadow-sm" />
                    ) : (
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <Shield size={24} />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-lg">{user.username}</h3>
                      <p className="text-xs opacity-90">{roleLabels[user.role]}</p>
                    </div>
                  </div>

                  {/* Status badge */}
                  {user.active ? (
                    <CheckCircle size={24} />
                  ) : (
                    <XCircle size={24} className="opacity-60" />
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Estado:</span>
                  <span className={`font-bold ${user.active ? 'text-green-600' : 'text-red-600'}`}>
                    {user.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Dispositivos:</span>
                  <span className="font-bold text-gray-900">
                    {user.devices?.length || 0}
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
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateUserModal
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

// Modal para crear usuario
function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    username: '',
    pin: '',
    role: 'capitan' as UserRole,
    avatar_url: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.pin.length !== 4) {
      alert('El PIN debe tener 4 dígitos')
      return
    }

    if (!/^\d+$/.test(formData.pin)) {
      alert('El PIN solo debe contener números')
      return
    }

    setLoading(true)
    try {
      // Crear usuario directamente en Supabase (PIN en texto plano v3.7.2)
      await supabaseService.createUser({
        username: formData.username,
        pin: formData.pin,
        role: formData.role,
        active: true,
        avatar_url: formData.avatar_url
      } as any)

      alert('✅ Usuario creado exitosamente')
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error creating user:', error)
      if (error.code === 'PGRST204' || error.message?.includes('duplicate')) {
        alert('❌ El nombre de usuario ya existe')
      } else {
        alert('❌ Error al crear usuario: ' + (error.message || 'Error desconocido'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scaleIn">
        <h2 className="text-2xl font-bold mb-4">Crear Nuevo Usuario</h2>

        <div className="mb-6 flex justify-center">
          <AvatarUpload
            userId="temp-new-user"
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
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              PIN (4 dígitos)
            </label>
            <input
              type="password"
              value={formData.pin}
              onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
              className="input-field"
              maxLength={4}
              pattern="[0-9]{4}"
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
              <option value="mesero">Mesero</option>
              <option value="capitan">Capitán</option>
              <option value="cocina">Cocina</option>
              <option value="bar">Bar</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Administrador</option>
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
              className="flex-1 btn-success"
              disabled={loading}
            >
              {loading ? 'Creando...' : 'Crear Usuario'}
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
              <option value="mesero">Mesero</option>
              <option value="capitan">Capitán</option>
              <option value="cocina">Cocina</option>
              <option value="bar">Bar</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Administrador</option>
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
