import { useState, useEffect, useCallback } from 'react'
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
  Eye,
  Printer
} from 'lucide-react'
import ProductModal from './ProductModal'
import printService from '@/services/printService'

export default function InventoryManagement() {
  const { products, setProducts, currentUser } = useAppStore()
  const { canManageInventory, isReadOnly } = usePermissions()
  const [loading, setLoading] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'low-stock'>('all')

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const loadedProducts = await supabaseService.getAllRetailProducts()
      setProducts(loadedProducts)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }, [setProducts])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const handleToggleActive = async (product: Product) => {
    if (isReadOnly) return

    try {
      await supabaseService.updateRetailProduct(product.id, { active: !product.active })
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
      await supabaseService.deleteRetailProduct(product.id)
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
      await supabaseService.updateRetailProduct(product.id, { currentStock: newStock })
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

  const handlePrintLabel = async (product: Product) => {
    try {
      if (!product.barcode) {
        alert('Este producto no tiene un Código de Barras / EAN configurado.');
        return;
      }

      // We use bwip-js external API for raw SVG/PNG generation within a static HTML string
      const barcodeImgUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(product.barcode)}&scale=3&height=12&includetext`;

      const htmlContent = `
        <div style="text-align: center; width: 58mm; padding: 2px; font-family: monospace;">
          <h2 style="font-size: 14px; margin: 0 0 5px 0; text-transform: uppercase; word-wrap: break-word; font-weight: 900;">
            ${product.name}
          </h2>
          <p style="font-size: 18px; font-weight: bold; margin: 0 0 5px 0;">
            $${product.price.toFixed(2)}
          </p>
          <div style="display: flex; justify-content: center; width: 100%;">
            <img src="${barcodeImgUrl}" style="max-width: 100%; height: auto;" alt="barcode">
          </div>
          <p style="font-size: 9px; margin-top: 5px; color: #555;">REISBLOC RETAIL</p>
        </div>
      `;

      await printService.printHTML(htmlContent, { width: 58, title: `Label-${product.barcode}` });

    } catch (error) {
      console.error('Error printing label:', error);
      alert('Error al mandar impresión de etiqueta térmica.');
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
                        onClick={() => handlePrintLabel(product)}
                        title="Imprimir Etiqueta"
                        className="p-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg transition-all"
                      >
                        <Printer size={18} />
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
