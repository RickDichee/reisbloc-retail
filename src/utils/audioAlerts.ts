/**
 * Reisbloc POS - Utilidad de Alertas Auditivas
 * 100% Offline, Sintetizado en Tiempo Real vía Web Audio API.
 * 
 * Ventajas:
 * 1. Cero peticiones de red externas (elimina descargas de CDNs como Mixkit).
 * 2. 100% compatible con Content Security Policy (CSP) sin violaciones de media-src.
 * 3. Funciona en modo offline sin conexión a internet.
 * 4. Latencia cero e instantáneo.
 */

let sharedAudioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioContext && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        sharedAudioContext = new AudioCtx()
      }
    }
    if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {})
    }
    return sharedAudioContext
  } catch (e) {
    return null
  }
}

/**
 * Campana de notificación (Chime suave y nítido para nuevas alertas/pedidos)
 */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, now) // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12) // A5

    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(880, now + 0.12)

    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc1.stop(now + 0.25)
    osc2.start(now + 0.12)
    osc2.stop(now + 0.5)
  } catch (e) {
    // Ignorar si el navegador bloquea autoplay hasta interacción
  }
}

/**
 * Sonido de Caja Registradora / Cobro Exitoso (Doble chime armónico brillante)
 */
export function playCashRegisterSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // Tono 1: agudo positivo
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(987.77, now) // B5
    osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08) // E6

    gain1.gain.setValueAtTime(0.15, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.35)

    // Tono 2: campana brillante de confirmación
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1318.51, now + 0.08)
    osc2.frequency.exponentialRampToValueAtTime(1975.53, now + 0.18) // B6

    gain2.gain.setValueAtTime(0.12, now + 0.08)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6)

    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.08)
    osc2.stop(now + 0.6)
  } catch (e) {
    // Ignorar
  }
}
