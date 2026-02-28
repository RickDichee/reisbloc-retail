import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-200">
            <div className="max-w-3xl mx-auto px-6 py-12">
                <Link to="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-bold mb-8 transition-colors">
                    <ArrowLeft size={20} />
                    Volver al Inicio
                </Link>

                <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-100">
                    <div className="mb-10">
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-4 uppercase">Política de Privacidad</h1>
                        <p className="text-slate-500 font-medium">Última actualización: Febrero 2026</p>
                    </div>

                    <div className="space-y-8 text-base leading-relaxed text-slate-600">
                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Información que recopilamos</h2>
                            <p>
                                En Reisbloc POS, recopilamos la información mínima necesaria para brindarte nuestro servicio de punto de venta en la nube. Cuando te registras usando tu cuenta de Google o correo electrónico, recopilamos:
                            </p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Tu nombre y apellidos (para la configuración de tu perfil).</li>
                                <li>Tu dirección de correo electrónico (utilizado como método de acceso y comunicación).</li>
                                <li>La foto de perfil asociada a tu cuenta (para identificación visual en el sistema).</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Cómo usamos tu información</h2>
                            <p>
                                La información recopilada se utiliza de las siguientes maneras:
                            </p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Para autenticar tu acceso seguro a la plataforma.</li>
                                <li>Para proporcionar, operar y mantener nuestro sistema POS.</li>
                                <li>Para notificarte sobre actualizaciones críticas de seguridad o cambios en nuestros servicios.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">3. Compartir tu información</h2>
                            <p>
                                <strong>Nunca venderemos tu información personal a terceros.</strong> Solo compartiremos información con proveedores de servicios de confianza (como proveedores de alojamiento en la nube, ej. Supabase) que son necesarios para operar Reisbloc POS.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Seguridad de los datos</h2>
                            <p>
                                Implementamos medidas de seguridad de clase mundial, incluyendo encriptación en tránsito y en reposo (Row Level Security), para proteger tu información contra acceso no autorizado, alteración o destrucción. Tu inicio de sesión con Google utiliza protocolos OAuth 2.0 estándar y seguros.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Tus Derechos</h2>
                            <p>
                                Tienes el derecho de acceder, corregir o eliminar tu información personal en cualquier momento. Puedes eliminar tu cuenta directamente desde el menú de Configuración dentro de la aplicación o contactándonos.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Contacto</h2>
                            <p>
                                Si tienes preguntas sobre esta Política de Privacidad, por favor contáctanos en: <strong>soporte@reisbloc.com</strong>
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    )
}
