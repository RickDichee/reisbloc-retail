import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    Package,
    Search,
    ChevronRight,
    Phone,
    Instagram,
    MessageSquare,
    ShoppingBag
} from 'lucide-react'
import supabaseService from '@/services/supabaseService'
import { Product } from '@/types'
import logger from '@/utils/logger'

export default function StoreFront() {
    const { slug } = useParams<{ slug: string }>()
    const navigate = useNavigate()

    const [organization, setOrganization] = useState<any>(null)
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('Todos')
    const [isScrolled, setIsScrolled] = useState(false)

    const loadData = useCallback(async () => {
        if (!slug) return
        setLoading(true)
        try {
            const org = await supabaseService.getOrganizationBySlug(slug)
            if (!org) {
                navigate('/404')
                return
            }
            setOrganization(org)

            const prods = await supabaseService.getPublicProducts(org.id)
            setProducts(prods)
        } catch (e) {
            logger.error('storefront', 'Error loading public store data', e as any)
        } finally {
            setLoading(false)
        }
    }, [slug, navigate])

    useEffect(() => {
        loadData()
    }, [loadData])

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category || 'General')))]

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory
        return matchesSearch && matchesCategory
    })

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Cargando Tienda...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
            {/* Dynamic Header */}
            <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${isScrolled ? 'bg-white/80 backdrop-blur-xl border-b border-slate-100 py-4 shadow-sm' : 'bg-transparent py-6'}`}>
                <div className="container mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {organization?.logo_url ? (
                            <img src={organization.logo_url} alt={organization.name} className="h-10 w-10 rounded-full object-cover shadow-lg border-2 border-white" />
                        ) : (
                            <div className="h-10 w-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-lg shadow-lg">
                                {organization?.name?.charAt(0)}
                            </div>
                        )}
                        <span className={`text-xl font-black tracking-tighter uppercase transition-colors text-slate-900`}>
                            {organization?.name}
                        </span>
                    </div>
                    <button className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-black text-xs tracking-widest flex items-center gap-2 hover:scale-105 transition-transform">
                        CONTACTAR <ChevronRight size={14} />
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-16 px-6 overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-50 -skew-x-12 translate-x-1/4 -z-10"></div>
                <div className="container mx-auto">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-black tracking-[0.2em] uppercase mb-6 animate-fadeIn">
                            Catálogo Oficial
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] text-slate-900 mb-8 uppercase animate-slideIn">
                            Bienvenido a <span className="text-slate-400">{organization?.name}</span>
                        </h1>
                        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-xl animate-fadeIn opacity-0 [animation-delay:400ms] [animation-fill-mode:forwards]">
                            Descubre nuestra selección exclusiva de productos y servicios. Calidad garantizada directamente de nuestra tienda a tus manos.
                        </p>
                    </div>
                </div>
            </section>

            {/* Search & Categories Bar - Sticky */}
            <div className="sticky top-[73px] z-40 bg-white/10 backdrop-blur-md pb-4 pt-2">
                <div className="container mx-auto px-6">
                    <div className="bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/50 p-2 flex flex-col md:flex-row items-center gap-2">
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="¿Qué estás buscando hoy?"
                                className="w-full pl-14 pr-6 py-4 bg-slate-50/50 rounded-2xl border-none focus:ring-0 outline-none font-bold text-slate-900 placeholder:text-slate-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar py-2 px-2 md:py-0">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-6 py-4 rounded-2xl whitespace-nowrap text-xs font-black tracking-widest transition-all ${selectedCategory === cat
                                            ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 scale-95'
                                            : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'
                                        }`}
                                >
                                    {cat.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Product Grid */}
            <section className="container mx-auto px-6 py-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
                    {filteredProducts.map((product, idx) => (
                        <div
                            key={product.id}
                            className="group animate-fadeIn flex flex-col h-full"
                            style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'forwards' }}
                        >
                            <div className="relative aspect-[4/5] bg-slate-100 rounded-[2.5rem] overflow-hidden mb-6 shadow-sm group-hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-2">
                                {product.image ? (
                                    <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                                        <Package size={64} strokeWidth={1} />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="absolute top-6 left-6 flex flex-col gap-2">
                                    <div className="bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.1em] uppercase shadow-sm">
                                        {product.category}
                                    </div>
                                </div>
                                <button className="absolute bottom-6 right-6 h-12 w-12 bg-white text-slate-900 rounded-2xl shadow-xl flex items-center justify-center translate-y-20 group-hover:translate-y-0 transition-transform duration-500 hover:bg-slate-900 hover:text-white">
                                    <ShoppingBag size={20} />
                                </button>
                            </div>

                            <div className="flex-1 px-2 space-y-2">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight line-clamp-2 leading-none">
                                        {product.name}
                                    </h3>
                                    <div className="text-2xl font-black text-slate-900 tracking-tighter">
                                        ${Number(product.price).toFixed(2)}
                                    </div>
                                </div>
                                {product.description && (
                                    <p className="text-sm text-slate-400 font-medium line-clamp-2 leading-relaxed">
                                        {product.description}
                                    </p>
                                )}
                                {product.sku && (
                                    <div className="text-[10px] font-black text-slate-400 bg-slate-50 inline-block px-2 py-0.5 rounded border border-slate-100 uppercase tracking-widest mt-2">
                                        SKU: {product.sku}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {filteredProducts.length === 0 && (
                    <div className="py-24 text-center space-y-6">
                        <div className="p-8 bg-slate-50 w-32 h-32 rounded-[2.5rem] flex items-center justify-center mx-auto text-slate-200">
                            <Search size={48} strokeWidth={1} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">Sin coincidencias</h3>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Prueba con otros términos de búsqueda</p>
                        </div>
                        <button
                            onClick={() => { setSearchTerm(''); setSelectedCategory('Todos') }}
                            className="text-slate-900 font-black text-xs tracking-[0.2em] uppercase border-b-2 border-slate-900 pb-1"
                        >
                            Ver todo el catálogo
                        </button>
                    </div>
                )}
            </section>

            {/* Footer / Social */}
            <footer className="bg-slate-50 pt-24 pb-12 mt-20">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
                        <div className="col-span-1 lg:col-span-2 space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-xl shadow-slate-900/20">
                                    {organization?.name?.charAt(0)}
                                </div>
                                <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">
                                    {organization?.name}
                                </h2>
                            </div>
                            <p className="text-slate-500 font-medium max-w-md leading-relaxed">
                                Somos una empresa dedicada a brindarte la mejor experiencia de compra. Explora nuestro catálogo y contáctanos si necesitas asistencia.
                            </p>
                            <div className="flex gap-4">
                                {[Instagram, MessageSquare, Phone].map((Icon, idx) => (
                                    <button key={idx} className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 shadow-sm hover:shadow-xl hover:scale-110 transition-all">
                                        <Icon size={20} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h4 className="font-black text-[10px] tracking-[0.3em] uppercase text-slate-400">Información</h4>
                            <ul className="space-y-4 font-bold text-slate-900 uppercase tracking-tighter text-sm">
                                <li className="hover:text-slate-400 cursor-pointer transition-colors">Ubicación</li>
                                <li className="hover:text-slate-400 cursor-pointer transition-colors">Horarios</li>
                                <li className="hover:text-slate-400 cursor-pointer transition-colors">Preguntas Frecuentes</li>
                            </ul>
                        </div>

                        <div className="space-y-6">
                            <h4 className="font-black text-[10px] tracking-[0.3em] uppercase text-slate-400">Legal</h4>
                            <ul className="space-y-4 font-bold text-slate-900 uppercase tracking-tighter text-sm">
                                <li className="hover:text-slate-400 cursor-pointer transition-colors">Términos de Servicio</li>
                                <li className="hover:text-slate-400 cursor-pointer transition-colors">Política de Privacidad</li>
                                <li className="hover:text-slate-400 cursor-pointer transition-colors">Cookies</li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-12 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            © 2026 {organization?.name}. Todos los derechos reservados.
                        </p>
                        <div className="flex items-center gap-2 opacity-40">
                            <p className="text-[10px] font-black uppercase tracking-widest">Powered by</p>
                            <div className="bg-slate-900 text-white px-2 py-0.5 rounded text-[8px] font-black tracking-widest">REISBLOC</div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
