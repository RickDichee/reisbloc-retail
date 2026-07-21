import { ArrowLeft, Shield, Scale, HelpCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ModaMielBrandPage() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-pink-200">
            <div className="max-w-4xl mx-auto px-6 py-12">
                <Link to="/" className="inline-flex items-center gap-2 text-pink-600 hover:text-pink-800 font-bold mb-8 transition-colors">
                    <ArrowLeft size={20} />
                    Volver a Reisbloc
                </Link>

                <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-100 space-y-12">
                    {/* Header */}
                    <div className="border-b border-slate-100 pb-8 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-center md:text-left">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reisbloc Store · Moda Miel MX</h1>
                            <p className="text-slate-500 font-medium mt-1">Página de Verificación y Políticas de Servicio para Google OAuth</p>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 shrink-0">
                            <img src="/images/moda-miel-mx-logo.jpeg" alt="Moda Miel MX" className="w-12 h-12 rounded-xl object-cover" />
                            <div className="text-xs font-bold text-slate-400">POWERED BY<br/><span className="text-indigo-600 text-sm font-black">REISBLOC</span></div>
                        </div>
                    </div>

                    {/* Sección 1: Divulgación de APIs de Google (Google API Disclosure) */}
                    <section className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
                        <div className="flex gap-4">
                            <Shield className="text-blue-600 shrink-0 mt-1" size={24} />
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 mb-2">Declaración de Uso Limitado de Datos de Google (Google API Disclosure)</h2>
                                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                                    El uso y la transferencia de la información recibida de las APIs de Google por parte de esta aplicación a cualquier otra aplicación se adherirán a la 
                                    <a 
                                        href="https://developers.google.com/terms/api-services-user-data-policy#key-requirements" 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-blue-600 underline font-semibold ml-1"
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

                    {/* Sección 2: Política de Privacidad */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Scale className="text-slate-400" size={22} />
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Política de Privacidad para Moda Miel MX</h2>
                        </div>
                        
                        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                            <p>
                                En <strong>Moda Miel MX</strong> (gestionado bajo la plataforma tecnológica Reisbloc Store), respetamos tu privacidad y nos comprometemos a proteger tus datos personales. Esta política detalla cómo recopilamos y manejamos la información cuando utilizas el sistema de punto de venta.
                            </p>
                            
                            <div>
                                <h3 className="font-bold text-slate-800">1. Datos que recopilamos mediante Google OAuth</h3>
                                <p>Al iniciar sesión en la plataforma usando tu cuenta de Google, accedemos a:</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li><strong>Correo electrónico:</strong> Para identificar tu cuenta de usuario e iniciar sesión de forma segura.</li>
                                    <li><strong>Nombre y apellido:</strong> Para mostrar tu nombre en el panel y tickets de venta en caja.</li>
                                    <li><strong>Avatar / Foto de perfil:</strong> Para personalización estética de tu cuenta dentro de la app.</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-slate-800">2. Uso de la Información</h3>
                                <p>La información recopilada se utiliza estrictamente para:</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>Autenticar y validar la identidad del cajero, gerente o administrador.</li>
                                    <li>Registrar qué empleado realizó cada venta y cierre de caja en la bitácora del negocio.</li>
                                    <li>Proporcionar soporte técnico personalizado al usuario.</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-slate-800">3. Retención y Eliminación de Datos</h3>
                                <p>
                                    Los datos se retienen mientras la cuenta del empleado permanezca activa en la organización de <strong>Moda Miel MX</strong>. Si deseas revocar el acceso de la aplicación a tus datos de Google o solicitar la eliminación total de tu perfil de usuario de nuestra base de datos, puedes solicitarlo escribiendo a <strong>soporte@reisbloc.com</strong> o desde los ajustes del sistema.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Sección 3: Términos de Servicio */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Scale className="text-slate-400" size={22} />
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Términos de Servicio</h2>
                        </div>
                        
                        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                            <p>
                                Al acceder y utilizar la aplicación de punto de venta personalizada para <strong>Moda Miel MX</strong>, aceptas cumplir con los siguientes términos:
                            </p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>Uso Autorizado:</strong> El acceso a esta plataforma está reservado únicamente para el personal contratado y autorizado por Moda Miel MX.</li>
                                <li><strong>Seguridad de la Cuenta:</strong> Cada usuario es responsable de mantener la confidencialidad de sus accesos y de cerrar su sesión al terminar sus labores.</li>
                                <li><strong>Propiedad Intelectual:</strong> El software, diseño y tecnología son propiedad de Reisbloc. Los logotipos, marcas y existencias registradas son propiedad de Moda Miel MX.</li>
                            </ul>
                        </div>
                    </section>

                    {/* Sección 4: Contacto */}
                    <section className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex items-center gap-4">
                        <HelpCircle className="text-slate-500 shrink-0" size={24} />
                        <div className="text-xs md:text-sm text-slate-600">
                            <strong>¿Preguntas o dudas de verificación?</strong><br/>
                            Si representas al equipo de revisión de Google Cloud Trust & Safety y requieres información adicional o acceso de prueba para validar la aplicación, por favor escríbenos directamente a <strong>soporte@reisbloc.com</strong>. Estamos a tu total disposición.
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
