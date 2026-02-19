import DashboardLayout from '@/components/layout/DashboardLayout'
import {
    LifeBuoy,
    MessageCircle,
    Mail,
    ExternalLink,
    BookOpen,
    Search,
    ChevronRight
} from 'lucide-react'

export default function Help() {
    const supports = [
        { title: 'Chat Soporte', icon: MessageCircle, desc: 'Habla con un asesor en WhatsApp', link: 'https://wa.me/message/...' },
        { title: 'Correo Soporte', icon: Mail, desc: 'soporte@reisbloc.com', link: 'mailto:soporte@reisbloc.com' },
        { title: 'Documentación', icon: BookOpen, desc: 'Guías de uso y tutoriales', link: '#' },
    ]

    const faqs = [
        { q: '¿Cómo hago el cierre de caja?', a: 'Ve a la sección "Cierre de Caja" en la barra lateral y sigue los pasos para conciliar el efectivo.' },
        { q: '¿Cómo agrego un nuevo producto?', a: 'Desde Administración > Inventario puedes crear registros con código de barras y stock.' },
        { q: '¿Cómo funcionan las invitaciones?', a: 'Invita a tu staff por correo desde Administración > Empleados. Ellos recibirán un link para crear su contraseña.' },
    ]

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto py-8">
                <div className="text-center mb-12">
                    <div className="inline-flex p-3 bg-emerald-100 rounded-2xl text-emerald-600 mb-4">
                        <LifeBuoy size={40} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Centro de Ayuda</h1>
                    <p className="text-slate-500 font-medium mt-2">¿En qué podemos ayudarte hoy?</p>

                    <div className="mt-8 relative max-w-xl mx-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Busca guías, errores o tutoriales..."
                            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm font-medium"
                        />
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mb-12">
                    {supports.map((item, idx) => (
                        <a
                            key={idx}
                            href={item.link}
                            target="_blank"
                            rel="noreferrer"
                            className="p-6 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 transition-all group"
                        >
                            <item.icon className="text-emerald-500 mb-4 group-hover:scale-110 transition-transform" size={32} />
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                {item.title}
                                <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
                        </a>
                    ))}
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="font-black text-slate-900 flex items-center gap-2">
                            Preguntas Frecuentes
                        </h2>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {faqs.map((faq, idx) => (
                            <details key={idx} className="group">
                                <summary className="flex items-center justify-between p-6 cursor-pointer list-none hover:bg-slate-50 transition-colors">
                                    <span className="font-bold text-slate-800 pr-4">{faq.q}</span>
                                    <ChevronRight size={18} className="text-slate-400 group-open:rotate-90 transition-transform" />
                                </summary>
                                <div className="px-6 pb-6 text-slate-600 text-sm leading-relaxed">
                                    {faq.a}
                                </div>
                            </details>
                        ))}
                    </div>
                </div>

                <div className="mt-12 text-center text-sm text-slate-400 font-medium">
                    Reisbloc POS v4.1 · Enterprise Edition
                </div>
            </div>
        </DashboardLayout>
    )
}
