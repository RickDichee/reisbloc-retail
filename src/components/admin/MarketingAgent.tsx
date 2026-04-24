import { useState, useEffect } from 'react'
import { Megaphone, Sparkles, Loader2, Twitter, Linkedin, Facebook, Instagram, Copy, Check, History, Calendar, MessageCircle } from 'lucide-react'
import { supabase, getAuthToken, forceAuthHeader } from '@/config/supabase'
import { useAppStore } from '@/store/appStore'

interface Post {
  id: string
  created_at: string
  topic: string
  content: string
  platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'whatsapp'
  status: 'draft' | 'published' | 'failed' | 'scheduled'
  scheduled_for?: string | null
  ai_model_used: string
}

export default function MarketingAgent() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [topic, setTopic] = useState('')
  const [platform, setPlatform] = useState<'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'whatsapp'>('twitter')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  const { currentUser } = useAppStore()

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const token = await getAuthToken()
      if (token) forceAuthHeader(token)
      
      const orgId = currentUser?.organizationId
      if (!orgId) {
        setPosts([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching marketing posts:', error)
        return
      }
      setPosts(data || [])
    } catch (err) {
      console.error('Error fetching marketing posts:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!topic.trim() || !currentUser) return

    setGenerating(true)
    try {
      const token = await getAuthToken()
      const { data, error } = await supabase.functions.invoke('social-agent', {
        body: { 
          topic, 
          platform,
          auto_schedule: false
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)
      
      setTopic('')
      await fetchPosts()
    } catch (err: any) {
      console.error('Error generating post:', err.message)
      alert('Error al generar el post: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handlePublish = async (post: Post) => {
    const encodedContent = encodeURIComponent(post.content)
    
    if (post.platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodedContent}`, '_blank')
    } else if (post.platform === 'linkedin') {
      window.open(`https://www.linkedin.com/feed/?shareActive=true&shareText=${encodedContent}`, '_blank')
    } else if (post.platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedContent}`, '_blank')
    } else if (post.platform === 'instagram') {
      navigator.clipboard.writeText(post.content)
      window.open('https://instagram.com/', '_blank')
    } else if (post.platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodedContent}`, '_blank')
    }

    setTimeout(async () => {
      try {
        const token = await getAuthToken()
        if (token) forceAuthHeader(token)
        
        await supabase
          .from('marketing_posts')
          .update({ status: 'published', published_at: new Date().toISOString() })
          .eq('id', post.id)
        
        setPosts(posts.map(p => p.id === post.id ? { ...p, status: 'published' } : p))
      } catch (err) {
        console.error('Error updating status:', err)
      }
    }, 2000)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published': return 'bg-emerald-100 text-emerald-700'
      case 'scheduled': return 'bg-purple-100 text-purple-700'
      case 'draft': return 'bg-amber-100 text-amber-700'
      case 'failed': return 'bg-red-100 text-red-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Generador */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg shadow-indigo-200">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase">Generador de Contenido IA</h2>
              <p className="text-sm font-medium text-slate-500">Crea posts optimizados para el nicho Pyme/Retail.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">Tema del Post</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ej. La importancia de controlar el inventario..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">Plataforma</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPlatform('twitter')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-bold transition-all ${
                    platform === 'twitter' 
                      ? 'bg-[#1DA1F2] text-white border-transparent shadow-md' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Twitter size={16} /> X
                </button>
                <button
                  onClick={() => setPlatform('linkedin')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-bold transition-all ${
                    platform === 'linkedin' 
                      ? 'bg-[#0A66C2] text-white border-transparent shadow-md' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Linkedin size={16} /> LinkedIn
                </button>
                <button
                  onClick={() => setPlatform('facebook')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-bold transition-all ${
                    platform === 'facebook' 
                      ? 'bg-[#1877F2] text-white border-transparent shadow-md' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Facebook size={16} /> Facebook
                </button>
                <button
                  onClick={() => setPlatform('instagram')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-bold transition-all ${
                    platform === 'instagram' 
                      ? 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white border-transparent shadow-md' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Instagram size={16} /> Instagram
                </button>
              </div>
              <button
                onClick={() => setPlatform('whatsapp')}
                className={`w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-bold transition-all ${
                  platform === 'whatsapp' 
                    ? 'bg-[#25D366] text-white border-transparent shadow-md' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <MessageCircle size={16} /> WhatsApp
              </button>
              <p className="text-[10px] text-slate-400 mt-2">
                ⚠️ Nopublica directamente. Copia el texto del historial y pégalo en la app.
              </p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || !topic.trim()}
              className="w-full py-4 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {generating ? <Loader2 size={20} className="animate-spin" /> : <Megaphone size={20} />}
              {generating ? 'Redactando con IA...' : 'Generar Post Individual'}
            </button>

            
          </div>
        </div>

        {/* Info lateral */}
        <div className="lg:w-80 bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-2xl rounded-full"></div>
          <div className="relative z-10">
            <h3 className="text-lg font-black uppercase mb-2 text-indigo-300">Brand Voice Activa</h3>
            <p className="text-sm font-medium text-slate-300 mb-4 leading-relaxed">
              El agente está programado para escribir con un tono <strong>profesional, directo y aspiracional</strong>. Ideal para negocios B2B y dueños de PYMES retail en México.
            </p>
            <div className="text-xs bg-black/30 p-3 rounded-lg border border-white/10 text-slate-400 font-mono">
              Model: Gemini 2.5 Flash<br/>
              Max tokens: 2000<br/>
              <span className="text-amber-400">⚠️ Copia y pega manualmente</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de Posts */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 uppercase mb-4 flex items-center gap-2">
          <History size={20} className="text-slate-400" />
          Historial de Publicaciones
          <span className="ml-auto text-sm font-medium text-slate-400">{posts.length} posts</span>
        </h3>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-300" size={32} /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-medium">No hay posts generados aún.</div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div key={post.id} className="border border-slate-100 rounded-2xl p-4 hover:border-indigo-100 transition-colors bg-slate-50/50">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {post.platform === 'twitter' ? <Twitter size={16} className="text-[#1DA1F2]" /> : post.platform === 'linkedin' ? <Linkedin size={16} className="text-[#0A66C2]" /> : post.platform === 'facebook' ? <Facebook size={16} className="text-[#1877F2]" /> : post.platform === 'instagram' ? <Instagram size={16} className="text-[#E4405F]" /> : <MessageCircle size={16} className="text-[#25D366]" />}
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${getStatusBadge(post.status)}`}>
                      {post.status}
                    </span>
                    {post.scheduled_for && (
                      <span className="text-[10px] font-medium text-purple-600 flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(post.scheduled_for).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {(post.status === 'draft' || post.status === 'scheduled') && (
                      <button 
                        onClick={() => handlePublish(post)} 
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                          post.platform === 'twitter' 
                            ? 'bg-[#1DA1F2] text-white hover:bg-[#1a91da]' 
                            : post.platform === 'linkedin'
                            ? 'bg-[#0A66C2] text-white hover:bg-[#095a9f]'
                            : post.platform === 'facebook'
                            ? 'bg-[#1877F2] text-white hover:bg-[#1664c0]'
                            : post.platform === 'instagram'
                            ? 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white hover:opacity-90'
                            : 'bg-[#25D366] text-white hover:bg-[#1ebe5d]'
                        }`}
                      >
                        {post.platform === 'twitter' ? <Twitter size={12} /> : post.platform === 'linkedin' ? <Linkedin size={12} /> : post.platform === 'facebook' ? <Facebook size={12} /> : post.platform === 'instagram' ? <Instagram size={12} /> : <MessageCircle size={12} />}
                        Publicar
                      </button>
                    )}
                    <button 
                      onClick={() => handleCopy(post.id, post.content)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Copiar texto"
                    >
                      {copiedId === post.id ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">{post.content}</p>
                <div className="mt-3 pt-3 border-t border-slate-200 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                  Tema: {post.topic}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
