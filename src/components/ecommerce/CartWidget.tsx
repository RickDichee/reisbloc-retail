import { useState, useMemo } from 'react'
import { ShoppingCart, X, Plus, Minus, Trash2 } from 'lucide-react'
import { CartItem } from '@/types'

interface CartWidgetProps {
  onCheckout?: () => void
}

export default function CartWidget({ onCheckout }: CartWidgetProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  }, [cart])

  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }, [cart])

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(0, item.quantity + delta)
        return newQty === 0 ? item : { ...item, quantity: newQty }
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId))
  }

  const clearCart = () => setCart([])

  if (cartCount === 0) return null

  return (
    <>
      {/* Cart Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-purple-600 text-white p-4 rounded-full shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all hover:scale-110 z-50"
      >
        <ShoppingCart size={24} />
        <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
          {cartCount}
        </span>
      </button>

      {/* Cart Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
          
          <div className="relative bg-white w-full max-w-md h-[80vh] flex flex-col rounded-t-3xl shadow-2xl animate-slideUp">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <ShoppingCart size={24} className="text-purple-600" />
                <div>
                  <h2 className="font-black text-slate-900">Carrito</h2>
                  <p className="text-xs text-slate-500">{cartCount} producto{cartCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                <X size={20} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map(item => (
                <div key={item.productId} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                  <img 
                    src={item.product.image || '/placeholder.png'} 
                    alt={item.product.name}
                    className="w-16 h-16 rounded-lg object-cover bg-white"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-sm line-clamp-2">{item.product.name}</p>
                    <p className="text-purple-600 font-black">${item.product.price.toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 bg-white rounded-lg border">
                      <button 
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="p-2 hover:bg-slate-100 rounded-l-lg"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-bold w-8 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="p-2 hover:bg-slate-100 rounded-r-lg"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.productId)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 space-y-4 shrink-0">
              <div className="flex justify-between text-lg">
                <span className="font-bold text-slate-600">Total</span>
                <span className="font-black text-purple-600">${cartTotal.toFixed(2)}</span>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={clearCart}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Limpiar
                </button>
                <button 
                  onClick={() => {
                    setIsOpen(false)
                    onCheckout?.()
                  }}
                  className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700"
                >
                  Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Export addToCart for use in other components
export const addToCart = (cart: CartItem[], product: any, quantity = 1): CartItem[] => {
  const existing = cart.find(item => item.productId === product.id)
  if (existing) {
    return cart.map(item => 
      item.productId === product.id 
        ? { ...item, quantity: item.quantity + quantity }
        : item
    )
  }
  return [...cart, { productId: product.id, product, quantity }]
}