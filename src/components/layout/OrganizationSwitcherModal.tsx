import { useState, useEffect } from 'react'
import { supabase } from '@/config/supabase'
import { useAppStore } from '@/store/appStore'
import { Building2, Check, Loader2, X, Sparkles, ArrowRight } from 'lucide-react'

interface OrgItem {
  id: string
  name: string
  slug: string
  plan?: string
  status?: string
}

interface OrganizationSwitcherModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function OrganizationSwitcherModal({ isOpen, onClose }: OrganizationSwitcherModalProps) {
  const { currentUser, setCurrentUser } = useAppStore()
  const [organizations, setOrganizations] = useState<OrgItem[]>([])
  const [loading, setLoading] = useState(true)
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    let isMounted = true

    async function loadOrgs() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, slug, plan, status')
          .eq('active', true)
          .order('name', { ascending: true })

        if (!error && data && isMounted) {
          setOrganizations(data)
        }
      } catch (e) {
        console.error('Error fetching organizations for switcher:', e)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadOrgs()
    return () => { isMounted = false }
  }, [isOpen])

  if (!isOpen) return null

  const handleSelectOrg = async (targetOrg: OrgItem) => {
    if (!currentUser || targetOrg.id === currentUser.organizationId) {
      onClose()
      return
    }

    try {
      setSwitchingId(targetOrg.id)
      
      // 1. Actualizar fila de usuario en Supabase
      const { error } = await supabase
        .from('users')
        .update({ organization_id: targetOrg.id, updated_at: new Date().toISOString() })
        .eq('id', currentUser.id)

      if (error) {
        console.warn('Advertencia actualizando organization_id en DB:', error.message)
      }

      // 2. Actualizar currentUser en store global (dispara purga de drafts/productos anteriores)
      const updatedUser = {
        ...currentUser,
        organizationId: targetOrg.id,
        businessName: targetOrg.name
      }
      setCurrentUser(updatedUser)

      // 3. Limpiar tema y recargar contexto para aplicar configuraciones frescas
      setTimeout(() => {
        window.location.href = '/pos'
      }, 400)
    } catch (err: any) {
      console.error('Error switching organization:', err)
      alert('Error al cambiar de negocio: ' + (err.message || 'Error desconocido'))
      setSwitchingId(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[120] flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-[#0B0F19] text-white border border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh] animate-scaleIn">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">Cambiar Negocio / Cliente</h2>
              <p className="text-[11px] text-slate-400">Selecciona la organización activa</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1 custom-scrollbar">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
              <p className="text-xs font-mono uppercase tracking-wider">Cargando organizaciones...</p>
            </div>
          ) : organizations.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">No hay organizaciones disponibles.</p>
          ) : (
            organizations.map((org) => {
              const isCurrent = org.id === currentUser?.organizationId
              const isSwitching = org.id === switchingId

              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => handleSelectOrg(org)}
                  disabled={switchingId !== null}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between group ${
                    isCurrent
                      ? 'bg-amber-500/10 border-amber-500/40 text-white'
                      : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 font-black text-xs border ${
                      isCurrent
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                        : 'bg-slate-800 text-slate-300 border-slate-700 group-hover:border-slate-600'
                    }`}>
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs sm:text-sm truncate block">{org.name}</span>
                        {org.plan && (
                          <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                            {org.plan}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 truncate block">slug: {org.slug}</span>
                    </div>
                  </div>

                  <div className="shrink-0 ml-2">
                    {isSwitching ? (
                      <Loader2 size={16} className="animate-spin text-amber-400" />
                    ) : isCurrent ? (
                      <span className="flex items-center gap-1 text-[10px] font-black font-mono uppercase bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded border border-amber-400/30">
                        <Check size={12} />
                        <span>Actual</span>
                      </span>
                    ) : (
                      <ArrowRight size={15} className="text-slate-600 group-hover:text-white transition-colors" />
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer Note */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 text-center">
          <p className="text-[10px] text-slate-500 font-mono">
            💡 Cambiar de cliente carga de inmediato sus productos, apartados e inventario en POS.
          </p>
        </div>

      </div>
    </div>
  )
}
