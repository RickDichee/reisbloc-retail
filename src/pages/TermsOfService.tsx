import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-200">
            <div className="max-w-3xl mx-auto px-6 py-12">
                <Link to="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-bold mb-8 transition-colors">
                    <ArrowLeft size={20} />
                    Volver al Inicio
                </Link>

                <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-100">
                    <div className="mb-10">
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-4 uppercase">Términos de Servicio</h1>
                        <p className="text-slate-500 font-medium">Última actualización: Febrero 2026</p>
                    </div>

                    <div className="space-y-8 text-base leading-relaxed text-slate-600">
                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Aceptación de los Términos</h2>
                            <p>
                                Al acceder y utilizar Reisbloc POS ("el Servicio"), usted acepta estar sujeto a estos Términos de Servicio. Si no está de acuerdo con alguna parte del acuerdo, entonces no podrá acceder al Servicio.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Uso del Servicio</h2>
                            <p>
                                Reisbloc POS es una plataforma de software en la nube para la gestión de puntos de venta y retail. Usted acepta usar el Servicio solo para propósitos legales y de acuerdo con estos Términos. Es su responsabilidad mantener la confidencialidad de su cuenta y contraseña.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">3. Cuentas de Usuario</h2>
                            <p>
                                Para utilizar ciertas funciones, debe registrarse para obtener una cuenta. Al utilizar la autenticación de Google u otros medios, usted garantiza que la información proporcionada es precisa y completa. Nos reservamos el derecho de rechazar el servicio, cancelar cuentas o eliminar y editar contenido a nuestra entera discreción.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Propiedad Intelectual</h2>
                            <p>
                                El Servicio y su contenido original, características y funcionalidad son propiedad exclusiva de Reisbloc y están protegidos por las leyes internacionales de derechos de autor, marcas registradas y otras leyes de propiedad intelectual.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Limitación de Responsabilidad</h2>
                            <p>
                                En ningún caso Reisbloc, ni sus directores, empleados, socios, agentes o proveedores, serán responsables de los daños indirectos, incidentales, especiales, consecuentes o punitivos, incluyendo, sin limitación, la pérdida de beneficios, datos, uso o fondo de comercio, que resulten de:
                            </p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Su acceso o uso o la incapacidad de acceder o usar el Servicio.</li>
                                <li>Cualquier conducta o contenido de cualquier tercero en el Servicio.</li>
                                <li>El acceso, uso o alteración no autorizados de sus transmisiones o contenidos.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Modificaciones</h2>
                            <p>
                                Nos reservamos el derecho, a nuestra sola discreción, de modificar o reemplazar estos Términos en cualquier momento. Lo que constituya un cambio material será determinado a nuestra entera discreción.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    )
}
