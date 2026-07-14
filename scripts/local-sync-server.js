/**
 * Reisbloc POS - Servidor de Sincronización Local Offline
 * Ejecútalo en el dispositivo del Administrador cuando no haya internet.
 * Permite que todos los dispositivos en la misma red local compartan borradores de venta.
 */

import express from 'express'

const app = express()
const PORT = process.env.PORT || 3001

// Almacenamiento en memoria para los borradores de venta (drafts)
// key = ticketNumber / tableNumber, value = items[]
let localDrafts = {}

// Middleware para habilitar CORS (Cross-Origin Resource Sharing)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200)
    }
    next()
})

app.use(express.json())

// Logs de peticiones simples
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`)
    next()
})

// Endpoints API
app.get('/api/drafts', (req, res) => {
    res.json(localDrafts)
})

app.post('/api/drafts', (req, res) => {
    const { ticketNumber, items } = req.body
    if (!ticketNumber) {
        return res.status(400).json({ error: 'ticketNumber es requerido' })
    }
    localDrafts[ticketNumber.toString()] = items || []
    console.log(`🛒 Caja ${ticketNumber} actualizada con ${localDrafts[ticketNumber.toString()].length} productos.`)
    res.json({ success: true, drafts: localDrafts })
})

app.delete('/api/drafts/:ticketNumber', (req, res) => {
    const { ticketNumber } = req.params
    if (localDrafts[ticketNumber]) {
        delete localDrafts[ticketNumber]
        console.log(`🧹 Borrador de Caja ${ticketNumber} eliminado/cobrado.`)
        res.json({ success: true, message: `Caja ${ticketNumber} vaciada` })
    } else {
        res.status(404).json({ error: `No se encontró borrador para la Caja ${ticketNumber}` })
    }
})

// Endpoint para vaciar todos los datos (Corte local)
app.post('/api/clear-all', (req, res) => {
    localDrafts = {}
    console.log('🧹 Todos los borradores locales han sido eliminados.')
    res.json({ success: true })
})

app.listen(PORT, '0.0.0.0', () => {
    console.log('\n======================================================')
    console.log('📶 SERVIDOR DE SINCRONIZACIÓN LOCAL REISBLOC')
    console.log(`🚀 Corriendo en: http://localhost:${PORT}`)
    console.log('👥 Permite que otros dispositivos se conecten vía WiFi.')
    console.log('======================================================\n')
})
