import { useState, useEffect } from 'react'
import { Percent, Tag, Clock, Trash2, Edit2, Plus, X, Check, Zap, Calendar } from 'lucide-react'
import supabaseService from '@/services/supabaseService'

const PROMOTION_TYPES = [
  { value: 'percentage', label: 'Porcentaje (%)' },
  { value: 'fixed', label: 'Monto Fijo ($)' },
  { value: 'buy_x_get_y', label: 'Buy X Get Y' },
  { value: 'happy_hour', label: 'Happy Hour' },
]

const TARGET_TYPES = [
  { value: 'all', label: 'Todos los productos' },
  { value: 'category', label: 'Categoría específica' },
]

export default function PromotionsManager() {
  const [activeTab, setActiveTab] = useState<'promotions' | 'coupons'>('promotions')
  const [promotions, setPromotions] = useState<any[]>([])
  const [coupons, setCoupons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [promoData, couponData] = await Promise.all([
        supabaseService.getPromotions(),
        supabaseService.getCoupons()
      ])
      setPromotions(promoData || [])
      setCoupons(couponData || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleToggle = async (type: 'promotion' | 'coupon', id: string, active: boolean) => {
    try {
      if (type === 'promotion') {
        await supabaseService.updatePromotion(id, { is_active: !active })
        setPromotions(p => p.map(x => x.id === id ? { ...x, is_active: !active } : x))
      } else {
        await supabaseService.updateCoupon(id, { is_active: !active })
        setCoupons(p => p.map(x => x.id === id ? { ...x, is_active: !active } : x))
      }
    } catch (e) { console.error(e) }
  }

  const handleDelete = async (type: 'promotion' | 'coupon', id: string) => {
    if (!confirm('¿Eliminar?')) return
    try {
      if (type === 'promotion') {
        await supabaseService.deletePromotion(id)
        setPromotions(p => p.filter(x => x.id !== id))
      } else {
        await supabaseService.deleteCoupon(id)
        setCoupons(p => p.filter(x => x.id !== id))
      }
    } catch (e) { console.error(e) }
  }

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  const isActivePromo = (p: any) => {
    if (!p.is_active) return false
    const now = new Date()
    const start = new Date(p.start_date)
    const end = p.end_date ? new Date(p.end_date) : null
    return start <= now && (!end || end >= now)
  }

  if (loading) return <div className="py-20 text-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-slate-200 pb-4">
        <button onClick={() => setActiveTab('promotions')} className={`px-4 py-2 rounded-xl font-bold text-sm ${activeTab === 'promotions' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
          <Percent size={16} className="inline mr-2" />Promociones ({promotions.length})
        </button>
        <button onClick={() => setActiveTab('coupons')} className={`px-4 py-2 rounded-xl font-bold text-sm ${activeTab === 'coupons' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
          <Tag size={16} className="inline mr-2" />Cupones ({coupons.length})
        </button>
      </div>

      <div className="flex justify-end">
        <button onClick={() => { setEditingItem(null); setShowForm(true) }} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2">
          <Plus size={20} />Nueva {activeTab === 'promotions' ? 'Promoción' : 'Cupon'}
        </button>
      </div>

      {activeTab === 'promotions' ? (
        <div className="grid gap-4">
          {promotions.length === 0 ? (
            <div className="text-center py-12 text-slate-400"><Percent size={48} className="mx-auto mb-4 opacity-30" /><p>No hay promociones</p></div>
          ) : promotions.map(p => (
            <div key={p.id} className={`bg-white border rounded-2xl p-5 ${isActivePromo(p) ? 'border-emerald-300' : 'border-slate-200 opacity-60'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-black text-lg">{p.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isActivePromo(p) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>
                      {isActivePromo(p) ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="font-bold text-indigo-600">{p.type === 'percentage' ? `${p.discount_percentage}%` : `$${p.discount_value}`} OFF</span>
                    <span className="text-slate-500 flex items-center gap-1"><Clock size={14} />{fmtDate(p.start_date)} - {p.end_date ? fmtDate(p.end_date) : 'Sin fecha'}</span>
                    {p.max_uses && <span className="text-slate-400">Usos: {p.current_uses || 0}/{p.max_uses}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleToggle('promotion', p.id, p.is_active)} className={`p-2 rounded-lg ${p.is_active ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {p.is_active ? <Zap size={18} /> : <Check size={18} />}
                  </button>
                  <button onClick={() => { setEditingItem(p); setShowForm(true) }} className="p-2 bg-slate-100 rounded-lg"><Edit2 size={18} /></button>
                  <button onClick={() => handleDelete('promotion', p.id)} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={18} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {coupons.length === 0 ? (
            <div className="text-center py-12 text-slate-400"><Tag size={48} className="mx-auto mb-4 opacity-30" /><p>No hay cupones</p></div>
          ) : coupons.map(c => (
            <div key={c.id} className={`bg-white border rounded-2xl p-5 ${c.is_active ? 'border-indigo-300' : 'border-slate-200 opacity-60'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg font-mono font-bold">{c.code}</span>
                    <h3 className="font-black text-lg">{c.name}</h3>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="font-bold text-emerald-600">{c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${c.discount_value}`} OFF</span>
                    <span className="text-slate-500 flex items-center gap-1"><Calendar size={14} />{fmtDate(c.valid_from)} - {c.valid_until ? fmtDate(c.valid_until) : 'Sin fecha'}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleToggle('coupon', c.id, c.is_active)} className={`p-2 rounded-lg ${c.is_active ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {c.is_active ? <Zap size={18} /> : <Check size={18} />}
                  </button>
                  <button onClick={() => { setEditingItem(c); setShowForm(true) }} className="p-2 bg-slate-100 rounded-lg"><Edit2 size={18} /></button>
                  <button onClick={() => handleDelete('coupon', c.id)} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={18} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <PromoFormModal type={activeTab} editingItem={editingItem} onClose={() => { setShowForm(false); setEditingItem(null) }} onSuccess={() => { setShowForm(false); setEditingItem(null); loadData() }} />}
    </div>
  )
}

function PromoFormModal({ type, editingItem, onClose, onSuccess }: { type: string; editingItem: any; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: editingItem?.name || '',
    description: editingItem?.description || '',
    type: editingItem?.type || 'percentage',
    discount_value: editingItem?.discount_value || 0,
    discount_percentage: editingItem?.discount_percentage || 0,
    applies_to: editingItem?.applies_to || 'all',
    target_category: editingItem?.target_category || '',
    start_date: editingItem?.start_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    end_date: editingItem?.end_date?.split('T')[0] || '',
    max_uses: editingItem?.max_uses || '',
    code: editingItem?.code || '',
    valid_from: editingItem?.valid_from?.split('T')[0] || new Date().toISOString().split('T')[0],
    valid_until: editingItem?.valid_until?.split('T')[0] || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: any = {
        name: form.name,
        description: form.description,
        is_active: true,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      }

      if (type === 'promotions') {
        Object.assign(payload, {
          type: form.type,
          discount_value: parseFloat(form.discount_value as any) || 0,
          discount_percentage: form.type === 'percentage' ? parseFloat(form.discount_percentage as any) || 0 : null,
          applies_to: form.applies_to,
          target_category: form.applies_to === 'category' ? form.target_category : null,
          start_date: new Date(form.start_date).toISOString(),
          end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        })
      } else {
        Object.assign(payload, {
          code: form.code.toUpperCase(),
          discount_type: form.type,
          discount_value: parseFloat(form.discount_value as any) || 0,
          valid_from: new Date(form.valid_from).toISOString(),
          valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
        })
      }

      if (editingItem?.id) {
        type === 'promotions' ? await supabaseService.updatePromotion(editingItem.id, payload) : await supabaseService.updateCoupon(editingItem.id, payload)
      } else {
        type === 'promotions' ? await supabaseService.createPromotion(payload) : await supabaseService.createCoupon(payload)
      }
      onSuccess()
    } catch (e) { console.error(e); alert('Error al guardar') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-black">{editingItem ? 'Editar' : 'Nueva'} {type === 'promotions' ? 'Promoción' : 'Cupon'}</h2>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="block text-sm font-bold mb-1">Nombre</label><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl" /></div>
          {type === 'coupons' && <div><label className="block text-sm font-bold mb-1">Código</label><input required value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-mono" placeholder="EJ: SUMMER25" /></div>}
          {type === 'promotions' && <div><label className="block text-sm font-bold mb-1">Tipo</label><select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl">{PROMOTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-bold mb-1">Descuento %</label><input type="number" min="0" max="100" value={form.type === 'percentage' || type === 'coupons' ? form.discount_percentage : form.discount_value} onChange={e => type === 'coupons' ? setForm({...form, discount_value: e.target.value}) : setForm({...form, discount_percentage: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl" /></div>
            <div><label className="block text-sm font-bold mb-1">Límite usos</label><input type="number" value={form.max_uses} onChange={e => setForm({...form, max_uses: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl" placeholder="Ilimitado" /></div>
          </div>
          {type === 'promotions' && <div><label className="block text-sm font-bold mb-1">Aplicar a</label><select value={form.applies_to} onChange={e => setForm({...form, applies_to: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl">{TARGET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-bold mb-1">Inicio</label><input type="date" required value={type === 'coupons' ? form.valid_from : form.start_date} onChange={e => type === 'coupons' ? setForm({...form, valid_from: e.target.value}) : setForm({...form, start_date: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl" /></div>
            <div><label className="block text-sm font-bold mb-1">Fin</label><input type="date" value={type === 'coupons' ? form.valid_until : form.end_date} onChange={e => type === 'coupons' ? setForm({...form, valid_until: e.target.value}) : setForm({...form, end_date: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl" /></div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 font-bold rounded-xl">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}