import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-teal-200 py-12 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto">
                <Link to="/" className="inline-flex items-center gap-2 text-teal-700 hover:text-teal-900 font-bold mb-8 transition-colors">
                    <ArrowLeft size={20} />
                    Volver al Inicio
                </Link>

                <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200">
                    <div className="mb-8">
                        <span className="inline-block bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1 rounded-md mb-3">
                            Privacidad y Protección de Datos
                        </span>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 mb-2">
                            Política de Privacidad de Reisbloc Store
                        </h1>
                        <p className="text-slate-500 text-sm font-medium">Última actualización: 18 de Septiembre de 2026</p>
                    </div>

                    <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-5 mb-8 text-sm text-slate-700 leading-relaxed">
                        <strong className="text-teal-950 font-bold block mb-1">Propósito de la Plataforma:</strong>
                        Reisbloc Store (com.reisbloclabs.pos) es una plataforma SaaS de punto de venta (POS) para comercios, tiendas y negocios con múltiples cajas o sucursales. Permite administrar ventas, inventario, clientes, productos, empleados y operaciones comerciales desde una sola aplicación web y móvil.
                    </div>

                    <div className="space-y-8 text-sm sm:text-base leading-relaxed text-slate-600">
                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">1. Información que recopilamos</h2>
                            <p>
                                En Reisbloc Store recopilamos únicamente la información necesaria para proporcionar nuestros servicios de punto de venta, inventario y facturación:
                            </p>
                            <ul className="list-disc pl-5 mt-2 space-y-1.5">
                                <li><strong>Datos de cuenta y perfil:</strong> Nombre, correo electrónico comercial, teléfono y rol dentro de la organización comercial.</li>
                                <li><strong>Datos comerciales y de inventario:</strong> Catálogo de artículos, SKU, códigos de barras, existencias y movimientos.</li>
                                <li><strong>Datos de ventas y facturación:</strong> Tickets, transacciones, registros de pago y datos fiscales para comprobantes CFDI 4.0 ante el SAT.</li>
                            </ul>
                        </section>

                        <section className="bg-slate-50 border-l-4 border-blue-600 p-5 rounded-r-xl">
                            <h2 className="text-xl font-bold text-slate-900 mb-2">2. Uso de Datos de Google (Google OAuth)</h2>
                            <p className="mb-2">
                                Cuando inicia sesión con Google en Reisbloc Store, solicitamos acceso a su correo electrónico (<code>.../auth/userinfo.email</code>) y a su perfil básico (<code>.../auth/userinfo.profile</code>, <code>openid</code>).
                            </p>
                            <ul className="list-disc pl-5 space-y-1.5 text-sm">
                                <li>Utilizamos estos datos exclusivamente para autenticar su acceso seguro y asociarlo a su organización comercial.</li>
                                <li><strong>NO</strong> solicitamos acceso a sus correos de Gmail, Google Drive ni contactos.</li>
                                <li><strong>NO</strong> vendemos ni compartimos sus datos obtenidos de Google con terceros.</li>
                                <li><strong>NO</strong> usamos sus datos de Google para publicidad, marketing ni para entrenar modelos de IA.</li>
                            </ul>
                            <p className="mt-3 text-xs text-slate-500 italic">
                                El uso y la transferencia a cualquier otra aplicación de la información recibida de las API de Google por parte de Reisbloc Store cumplirán estrictamente con la Política de Datos del Usuario de los Servicios de las API de Google, incluidos los requisitos de Uso Limitado (Limited Use requirements).
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">3. Seguridad y Almacenamiento</h2>
                            <p>
                                Sus datos se encuentran protegidos mediante cifrado SSL/TLS en tránsito y políticas estrictas de aislamiento multi-inquilino (Row Level Security en Supabase / PostgreSQL). Cumplimos con estándares de seguridad PCI-DSS y buenas prácticas OWASP.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">4. Sus Derechos y Eliminación de Datos</h2>
                            <p>
                                Puede revocar los permisos de Google en cualquier momento desde <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline font-medium">myaccount.google.com/permissions</a>. 
                                Asimismo, puede solicitar la eliminación total de sus datos y de su cuenta escribiendo a <a href="mailto:privacidad@reisbloc.com" className="text-teal-600 underline font-medium">privacidad@reisbloc.com</a>.
                            </p>
                        </section>

                        <section className="pt-4 border-t border-slate-200">
                            <h2 className="text-lg font-bold text-slate-900 mb-1">Contacto y Asistencia</h2>
                            <p className="text-sm">
                                Reisbloc Store &middot; Reisbloc Lab<br />
                                Correo de Asistencia al Usuario: <a href="mailto:hunab.arredondo@gmail.com" className="text-teal-600 font-medium">hunab.arredondo@gmail.com</a><br />
                                Privacidad y Legal: <a href="mailto:privacidad@reisbloc.com" className="text-teal-600 font-medium">privacidad@reisbloc.com</a><br />
                                Moroleón, Guanajuato, México
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    )
}
