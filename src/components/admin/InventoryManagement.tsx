import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import supabaseService from '@/services/supabaseService'
import { Product } from '@/types/index'
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Eye
} from 'lucide-react'

export default function InventoryManagement() {
  const { products, setProducts, currentUser } = useAppStore()
  const { canManageInventory, isReadOnly } = usePermissions()
  const [loading, setLoading] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'low-stock'>('all')

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const loadedProducts = await supabaseService.getAllProducts()
      setProducts(loadedProducts)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (product: Product) => {
    if (isReadOnly) return

    try {
      await supabaseService.updateProduct(product.id, { active: !product.active })
      await supabaseService.createAuditLog({
        userId: currentUser?.id || 'unknown',
        action: 'PRODUCT_UPDATED',
        entityType: 'PRODUCT',
        entityId: product.id,
        oldValue: { active: product.active },
        newValue: { active: !product.active }
      })
      await loadProducts()
    } catch (error) {
      console.error('Error toggling product:', error)
      alert('Error al actualizar producto')
    }
  }

  const handleDeleteProduct = async (product: Product) => {
    if (isReadOnly) return

    if (!confirm(`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      await supabaseService.deleteProduct(product.id)
      await supabaseService.createAuditLog({
        userId: currentUser?.id || 'unknown',
        action: 'PRODUCT_DELETED',
        entityType: 'PRODUCT',
        entityId: product.id,
        oldValue: { name: product.name }
      })
      await loadProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Error al eliminar producto')
    }
  }

  const handleAdjustStock = async (product: Product, adjustment: number) => {
    if (isReadOnly || !product.hasInventory) return

    const newStock = (product.currentStock || 0) + adjustment
    if (newStock < 0) {
      alert('El stock no puede ser negativo')
      return
    }

    try {
      await supabaseService.updateProduct(product.id, { currentStock: newStock })
      await supabaseService.createAuditLog({
        userId: currentUser?.id || 'unknown',
        action: 'INVENTORY_CHANGE',
        entityType: 'PRODUCT',
        entityId: product.id,
        oldValue: { stock: product.currentStock },
        newValue: { stock: newStock, adjustment }
      })
      await loadProducts()
    } catch (error) {
      console.error('Error adjusting stock:', error)
      alert('Error al ajustar inventario')
    }
  }

  const filteredProducts = products.filter(p => {
    if (filter === 'active') return p.active
    if (filter === 'low-stock') {
      return p.hasInventory && (p.currentStock || 0) <= (p.minimumStock || 0)
    }
    return true
  })

  const stats = {
    total: products.length,
    active: products.filter(p => p.active).length,
    withInventory: products.filter(p => p.hasInventory).length,
    lowStock: products.filter(p => p.hasInventory && (p.currentStock || 0) <= (p.minimumStock || 0)).length,
  }

  const categoryColors: Record<string, string> = {
    'Comida': 'from-orange-500 to-red-600',
    'Bebidas': 'from-blue-500 to-cyan-600',
    'Postres': 'from-pink-500 to-purple-600',
    'Otros': 'from-gray-500 to-gray-700',
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Productos"
          value={stats.total}
          icon={Package}
          color="from-blue-500 to-cyan-600"
        />
        <StatCard
          title="Activos"
          value={stats.active}
          icon={CheckCircle}
          color="from-green-500 to-emerald-600"
        />
        <StatCard
          title="Con Inventario"
          value={stats.withInventory}
          icon={TrendingUp}
          color="from-purple-500 to-indigo-600"
        />
        <StatCard
          title="Stock Bajo"
          value={stats.lowStock}
          icon={AlertTriangle}
          color="from-red-500 to-rose-600"
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Inventario</h2>
          <p className="text-gray-600 mt-1">
            {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''}
          </p>
        </div>

        {canManageInventory && !isReadOnly && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Nuevo Producto
          </button>
        )}
      </div>

      {/* Read-only warning */}
      {isReadOnly && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Eye className="text-blue-600" size={24} />
          <div>
            <p className="font-bold text-blue-900">Modo Solo Lectura</p>
            <p className="text-sm text-blue-700">No puedes modificar el inventario</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${filter === 'all'
            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${filter === 'active'
            ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          Activos
        </button>
        <button
          onClick={() => setFilter('low-stock')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${filter === 'low-stock'
            ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          Stock Bajo
        </button>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="spinner mx-auto mb-4" />
          <p className="text-gray-600">Cargando productos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => {
            const isLowStock = product.hasInventory && (product.currentStock || 0) <= (product.minimumStock || 0)

            return (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-all"
              >
                {/* Header */}
                <div className={`bg-gradient-to-r ${categoryColors[product.category] || categoryColors['Otros']} rounded-xl p-4 -m-6 mb-4`}>
                  <div className="flex items-center justify-between text-white">
                    <div>
                      <h3 className="font-bold text-lg">{product.name}</h3>
                      <p className="text-xs opacity-90">{product.category}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">${product.price}</div>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="space-y-3">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Estado:</span>
                    <span className={`badge ${product.active ? 'badge-success' : 'bg-gray-300 text-gray-700'}`}>
                      {product.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  {/* Inventory */}
                  {product.hasInventory ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Stock actual:</span>
                        <span className={`font-bold text-lg ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                          {product.currentStock || 0}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Stock mínimo:</span>
                        <span className="font-semibold text-gray-900">
                          {product.minimumStock || 0}
                        </span>
                      </div>

                      {isLowStock && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-2">
                          <AlertTriangle size={16} className="text-red-600" />
                          <span className="text-xs font-bold text-red-700">Stock bajo</span>
                        </div>
                      )}

                      {/* Stock adjustment controls */}
                      {canManageInventory && !isReadOnly && (
                        <div className="flex gap-2 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => handleAdjustStock(product, -1)}
                            className="flex-1 p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-bold transition-all"
                          >
                            <TrendingDown size={20} className="mx-auto" />
                          </button>
                          <button
                            onClick={() => handleAdjustStock(product, 1)}
                            className="flex-1 p-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg font-bold transition-all"
                          >
                            <TrendingUp size={20} className="mx-auto" />
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-gray-500 italic text-center py-2">
                      Sin control de inventario
                    </div>
                  )}

                  {/* Actions */}
                  {canManageInventory && !isReadOnly && (
                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => handleToggleActive(product)}
                        className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${product.active
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                      >
                        {product.active ? 'Desactivar' : 'Activar'}
                      </button>

                      <button
                        onClick={() => setEditingProduct(product)}
                        className="p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-all"
                      >
                        <Edit2 size={18} />
                      </button>

                      <button
                        onClick={() => handleDeleteProduct(product)}
                        className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
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
        <ProductModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadProducts}
        />
      )}

      {editingProduct && (
        <ProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={loadProducts}
        />
      )}
    </div>
  )
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  color
}: {
  title: string
  value: number
  icon: any
  color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-all">
      <div className={`p-3 bg-gradient-to-br ${color} rounded-xl text-white w-fit mb-3`}>
        <Icon size={24} />
      </div>
      <p className="text-sm text-gray-600 font-semibold">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}

// Product Modal (Create/Edit)
function ProductModal({
  product,
  onClose,
  onSuccess
}: {
  product?: Product
  onClose: () => void
  onSuccess: () => void
}) {
  const { currentUser } = useAppStore()
  const [formData, setFormData] = useState({
    name: product?.name || '',
    price: product?.price || 0,
    category: product?.category || 'Comida',
    hasInventory: product?.hasInventory || false,
    currentStock: product?.currentStock || 0,
    minimumStock: product?.minimumStock || 10,
    active: product?.active ?? true,
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    try {
      if (product) {
        await supabaseService.updateProduct(product.id, formData)
        await supabaseService.createAuditLog({
          userId: currentUser?.id || 'unknown',
          action: 'PRODUCT_UPDATED',
          entityType: 'PRODUCT',
          entityId: product.id,
          newValue: formData
        })
      } else {
        const newId = await supabaseService.createProduct({
          ...formData,
          createdAt: new Date(),
        })

        await supabaseService.createAuditLog({
          userId: currentUser?.id || 'unknown',
          action: 'PRODUCT_CREATED',
          entityType: 'PRODUCT',
          entityId: newId,
          newValue: formData
        })
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Error al guardar producto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scaleIn max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">
          {product ? 'Editar Producto' : 'Crear Producto'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Nombre
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Precio
            </label>
            <input
              type="number"
              value={formData.price || ''}
              onChange={(e) => setFormData({ ...formData, price: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
              className="input-field"
              step="0.01"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Categoría
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="input-field"
            >
              <option value="Comida">Comida</option>
              <option value="Bebidas">Bebidas</option>
              <option value="Postres">Postres</option>
              <option value="Otros">Otros</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="hasInventory"
              checked={formData.hasInventory}
              onChange={(e) => setFormData({ ...formData, hasInventory: e.target.checked })}
              className="w-5 h-5"
            />
            <label htmlFor="hasInventory" className="text-sm font-bold text-gray-700">
              Controlar inventario
            </label>
          </div>

          {formData.hasInventory && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Stock actual
                </label>
                <input
                  type="number"
                  value={formData.currentStock || ''}
                  onChange={(e) => setFormData({ ...formData, currentStock: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                  className="input-field"
                  min="0"
                  required />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Stock mínimo
                </label>
                <input
                  type="number"
                  value={formData.minimumStock || ''}
                  onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                  className="input-field"
                  min="0"
                  required
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-5 h-5"
            />
            <label htmlFor="active" className="text-sm font-bold text-gray-700">
              Producto activo
            </label>
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
              {loading ? 'Guardando...' : product ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
