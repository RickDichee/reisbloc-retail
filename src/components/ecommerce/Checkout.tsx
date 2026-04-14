import { useState } from 'react'
import { CreditCard, Truck, MapPin, Check } from 'lucide-react'
import { CartItem, Address, ShippingMethod } from '@/types'

interface CheckoutProps {
  cart: CartItem[]
  total: number
  onComplete: (order: any) => void
  onCancel: () => void
}

export default function Checkout({ cart, total, onComplete, onCancel }: CheckoutProps) {
  const [step, setStep] = useState<'shipping' | 'payment' | 'confirm'>('shipping')
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('pickup')
  const [address, setAddress] = useState<Address | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'mercadopago' | 'cash' | 'transferencia'>('mercadopago')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const shippingCost = shippingMethod === 'pickup' ? 0 : shippingMethod === 'local' ? 20 : 50
  const tax = total * 0.16
  const grandTotal = total + shippingCost + tax

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Create order logic here
      const order = {
        items: cart,
        subtotal: total,
        shippingCost,
        tax,
        total: grandTotal,
        shippingMethod,
        address,
        paymentMethod,
        notes
      }
      onComplete(order)
    } catch (error) {
      console.error('Error creating order:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Steps */}
      <div className="flex gap-2 mb-8">
        {['shipping', 'payment', 'confirm'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              step === s ? 'bg-purple-600 text-white' : 
              ['shipping', 'payment', 'confirm'].indexOf(step) > i ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {['shipping', 'payment', 'confirm'].indexOf(step) > i ? <Check size={16} /> : i + 1}
            </div>
            <span className={`text-sm font-bold capitalize ${step === s ? 'text-purple-600' : 'text-slate-400'}`}>
              {s === 'shipping' ? 'Envío' : s === 'payment' ? 'Pago' : 'Confirmar'}
            </span>
            {i < 2 && <div className="w-8 h-px bg-slate-200" />}
          </div>
        ))}
      </div>

      {/* Shipping Step */}
      {step === 'shipping' && (
        <div className="space-y-4">
          <h2 className="text-xl font-black">Método de Entrega</h2>
          
          <div className="grid grid-cols-2 gap-3">
            {(['pickup', 'local', 'delivery'] as ShippingMethod[]).map(method => (
              <button
                key={method}
                onClick={() => setShippingMethod(method)}
                className={`p-4 rounded-xl border-2 text-left ${
                  shippingMethod === method 
                    ? 'border-purple-600 bg-purple-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Truck size={24} className={shippingMethod === method ? 'text-purple-600' : 'text-slate-400'} />
                <p className="font-bold mt-2">
                  {method === 'pickup' ? 'Recoger en tienda' : 
                   method === 'local' ? 'Entrega local ($20)' : 
                   method === 'delivery' ? 'Envío a domicilio ($50)' : method}
                </p>
              </button>
            ))}
          </div>

          {shippingMethod !== 'pickup' && (
            <div className="space-y-3">
              <h3 className="font-bold">Dirección de entrega</h3>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <MapPin size={20} className="text-slate-400" />
                <p className="text-sm text-slate-500">Agrega tu dirección en el siguiente paso</p>
              </div>
            </div>
          )}

          <button 
            onClick={() => setStep('payment')}
            className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700"
          >
            Continuar al Pago
          </button>
        </div>
      )}

      {/* Payment Step */}
      {step === 'payment' && (
        <div className="space-y-4">
          <h2 className="text-xl font-black">Método de Pago</h2>
          
          <div className="grid grid-cols-3 gap-3">
            {(['mercadopago', 'cash', 'transferencia'] as const).map(method => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`p-4 rounded-xl border-2 text-center ${
                  paymentMethod === method 
                    ? 'border-purple-600 bg-purple-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <CreditCard size={24} className={paymentMethod === method ? 'text-purple-600' : 'text-slate-400'} />
                <p className="font-bold text-sm mt-2">
                  {method === 'mercadopago' ? 'MercadoPago' : 
                   method === 'cash' ? 'Efectivo' : 'Transferencia'}
                </p>
              </button>
            ))}
          </div>

          <div>
            <label className="font-bold text-sm">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrucciones especiales..."
              className="w-full p-3 border border-slate-200 rounded-xl mt-2"
              rows={3}
            />
          </div>

          <button 
            onClick={() => setStep('confirm')}
            className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700"
          >
            Revisar Pedido
          </button>
        </div>
      )}

      {/* Confirm Step */}
      {step === 'confirm' && (
        <div className="space-y-4">
          <h2 className="text-xl font-black">Confirmar Pedido</h2>
          
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-bold">${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Envío</span>
              <span className="font-bold">${shippingCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Impuesto (16%)</span>
              <span className="font-bold">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-black">Total</span>
              <span className="font-black text-purple-600">${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setStep('payment')}
              className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold"
            >
              Atrás
            </button>
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Procesando...' : 'Confirmar Pedido'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}