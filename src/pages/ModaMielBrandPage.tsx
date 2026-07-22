import { ArrowLeft, Shield, Scale, HelpCircle, ShoppingBag, Shirt, Heart, QrCode, Store, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ModaMielBrandPage() {
    return (
        <div className="min-h-screen bg-[#FFF5F7] text-slate-900 font-sans selection:bg-pink-200">
            {/* Top Navigation Bar */}
            <div className="bg-white/80 backdrop-blur-md border-b border-pink-100 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/" className="inline-flex items-center gap-2 text-[#E62E6B] hover:text-[#C41E53] font-bold text-sm transition-colors">
                        <ArrowLeft size={18} />
                        Volver a Reisbloc POS
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link to="/login?brand=modamiel" className="bg-[#E62E6B] hover:bg-[#C41E53] text-white font-bold px-4 py-2 rounded-xl text-sm transition-all shadow-sm flex items-center gap-2">
                            <Store size={16} />
                            Iniciar POS Moda Miel
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-10 space-y-12">
                {/* 🌸 BRAND FLYER HERO SECTION (Matching Image Design) */}
                <div className="relative bg-white rounded-3xl p-8 sm:p-14 shadow-xl border-4 border-pink-100 text-center overflow-hidden">
                    {/* Decorative Background Accents */}
                    <div className="absolute -top-12 -left-12 w-40 h-40 bg-pink-100/60 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-pink-200/50 rounded-full blur-2xl pointer-events-none" />

                    {/* Powered by Badge */}
                    <div className="inline-flex items-center gap-2 bg-pink-50 text-[#E62E6B] border border-pink-200 px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase mb-6 shadow-xs">
                        <Sparkles size={14} className="animate-spin text-[#E62E6B]" style={{ animationDuration: '4s' }} />
                        POWERED BY REISBLOC SAAS · MULTI-TENANT POS
                    </div>

                    {/* Main Brand Header Typography */}
                    <div className="relative inline-block mb-4">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                            <span className="font-['Playfair_Display',Georgia,serif] text-5xl sm:text-7xl font-extrabold text-slate-900 tracking-tight">
                                Moda
                            </span>
                            <div className="relative flex items-center">
                                <span className="font-['Dancing_Script',cursive] text-6xl sm:text-8xl font-bold text-[#E62E6B] leading-none drop-shadow-xs">
                                    Miel
                                </span>
                                {/* Floating Bee Icon 🐝 */}
                                <div className="ml-2 sm:ml-3 transform -rotate-12 bg-amber-100 border border-amber-300 p-2 rounded-full shadow-sm animate-bounce" style={{ animationDuration: '3s' }}>
                                    <span className="text-2xl sm:text-3xl" role="img" aria-label="Abeja Moda Miel">🐝</span>
                                </div>
                            </div>
                        </div>

                        {/* Subtitle Hearts MX */}
                        <div className="flex items-center justify-center gap-2 mt-2 text-[#E62E6B] font-black text-xl tracking-widest uppercase">
                            <Heart size={18} fill="#E62E6B" />
                            <span>M X</span>
                            <Heart size={18} fill="#E62E6B" />
                        </div>
                    </div>

                    {/* Ribbon Banner: TODO POR PAQUETE */}
                    <div className="my-6 max-w-md mx-auto">
                        <div className="bg-[#E62E6B] text-white font-extrabold text-lg sm:text-xl py-2.5 px-6 rounded-2xl shadow-md border-2 border-white tracking-wider uppercase flex items-center justify-between">
                            <span className="text-pink-200 text-sm">❮❮</span>
                            <span>TODO POR PAQUETE</span>
                            <span className="text-pink-200 text-sm">❯❯</span>
                        </div>
                    </div>

                    {/* Main Location Badge (PASILLO 3 LOCAL 230) */}
                    <div className="my-8 max-w-lg mx-auto">
                        <div className="bg-[#1A1A1A] text-white p-5 sm:p-7 rounded-[2.5rem] border-4 border-[#E62E6B] shadow-2xl transition-transform hover:scale-[1.02] duration-300">
                            <div className="font-['Outfit',sans-serif] text-3xl sm:text-5xl font-black tracking-tight text-white uppercase drop-shadow-sm">
                                PASILLO 3
                            </div>
                            <div className="font-['Outfit',sans-serif] text-4xl sm:text-6xl font-black tracking-tight text-[#E62E6B] uppercase drop-shadow-md mt-1">
                                LOCAL 230
                            </div>
                        </div>
                    </div>

                    {/* Feature Pills (Hacemos Envíos · Contacto · Marcas de Moda) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 max-w-3xl mx-auto items-center">
                        {/* Pill 1: Hacemos Envíos */}
                        <div className="bg-pink-50 border border-pink-200 p-5 rounded-2xl flex flex-col items-center justify-center gap-2 text-center hover:shadow-md transition-shadow">
                            <div className="w-14 h-14 bg-[#E62E6B] text-white rounded-full flex items-center justify-center shadow-md">
                                <ShoppingBag size={26} />
                            </div>
                            <span className="font-black text-slate-900 tracking-wide uppercase text-sm mt-1">HACEMOS ENVÍOS</span>
                        </div>

                        {/* Pill 2: Contacto WhatsApp / QR */}
                        <div className="bg-white border-2 border-pink-200 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center shadow-sm hover:shadow-md transition-shadow">
                            <span className="font-['Dancing_Script',cursive] text-2xl font-bold text-slate-800">Contáctanos</span>
                            <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl">
                                <QrCode size={64} className="text-slate-900" />
                            </div>
                            <span className="text-xs font-bold text-slate-500">Tienda de Importación Mx</span>
                        </div>

                        {/* Pill 3: Marcas de Moda */}
                        <div className="bg-pink-50 border border-pink-200 p-5 rounded-2xl flex flex-col items-center justify-center gap-2 text-center hover:shadow-md transition-shadow">
                            <div className="w-14 h-14 bg-[#1A1A1A] text-white rounded-full flex items-center justify-center shadow-md">
                                <Shirt size={26} />
                            </div>
                            <span className="font-black text-slate-900 tracking-wide uppercase text-sm mt-1">MARCAS DE MODA</span>
                        </div>
                    </div>
                </div>

                {/* 📜 GOOGLE OAUTH VERIFICATION & LEGAL DISCLOSURES SECTION */}
                <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-pink-100 space-y-10">
                    <div className="border-b border-slate-100 pb-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-center md:text-left">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Reisbloc Store · Moda Miel MX</h2>
                            <p className="text-slate-500 font-medium mt-1">Página de Verificación de Integración de Marca y Políticas de Servicio</p>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-[#E62E6B] text-white font-black text-xs flex items-center justify-center text-center">
                                MM
                            </div>
                            <div className="text-xs font-bold text-slate-400">POWERED BY<br/><span className="text-pink-600 text-sm font-black">REISBLOC</span></div>
                        </div>
                    </div>

                    {/* Google API Disclosure */}
                    <section className="bg-pink-50/50 rounded-2xl p-6 border border-pink-100">
                        <div className="flex gap-4">
                            <Shield className="text-[#E62E6B] shrink-0 mt-1" size={24} />
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Declaración de Uso Limitado de Datos de Google (Google API Disclosure)</h3>
                                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                                    El uso y la transferencia de la información recibida de las APIs de Google por parte de esta aplicación a cualquier otra aplicación se adherirán a la 
                                    <a 
                                        href="https://developers.google.com/terms/api-services-user-data-policy#key-requirements" 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-[#E62E6B] underline font-semibold ml-1"
                                    >
                                        Política de Datos del Usuario de los Servicios de API de Google
                                    </a>, incluidos los requisitos de Uso Limitado (Limited Use).
                                </p>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Nuestra aplicación únicamente solicita y accede a la información del perfil del usuario (nombre, correo electrónico y foto de perfil) a través de la autenticación de Google (OAuth 2.0) con el único fin de permitir el inicio de sesión seguro y personalizar la interfaz del empleado dentro del punto de venta de <strong>Moda Miel MX</strong>. No compartimos, vendemos, ni transferimos estos datos a terceros bajo ninguna circunstancia.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Política de Privacidad */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Scale className="text-slate-400" size={22} />
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Política de Privacidad para Moda Miel MX</h3>
                        </div>
                        
                        <div className="space-y-3 text-slate-600 text-sm leading-relaxed">
                            <p>
                                En <strong>Moda Miel MX</strong> (gestionado bajo la plataforma tecnológica Reisbloc Store SaaS), respetamos tu privacidad y nos comprometemos a proteger tus datos personales. Esta política detalla cómo recopilamos y manejamos la información cuando utilizas el sistema de punto de venta.
                            </p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Datos de Sesión:</strong> Correo electrónico y nombre para identificar al usuario y registrar la autoría en ventas y cortes de caja.</li>
                                <li><strong>Uso Interno:</strong> La información no se comparte fuera de la organización ni con redes de anuncios.</li>
                                <li><strong>Retención:</strong> Los datos se retienen mientras el usuario permanezca como empleado activo de Moda Miel MX.</li>
                            </ul>
                        </div>
                    </section>

                    {/* Contacto & Verificación */}
                    <section className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex items-center gap-4">
                        <HelpCircle className="text-slate-500 shrink-0" size={24} />
                        <div className="text-xs md:text-sm text-slate-600">
                            <strong>¿Consultas de verificación o soporte técnico de marca?</strong><br/>
                            Para cualquier inquietud relacionada con la personalización de la aplicación o verificación de Google Cloud Trust & Safety, escríbenos directamente a <strong>soporte@reisbloc.com</strong>.
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}

