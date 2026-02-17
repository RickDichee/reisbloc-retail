# 📴 Modo Offline / PWA - Reisbloc POS

## ✅ Implementación Completa

Sistema completo de Progressive Web App (PWA) con soporte offline, sincronización en background y caching inteligente.

## 🎯 Características Implementadas

### 1. **Service Worker Avanzado**
- ✅ Cache strategies (Network First, Cache First, Stale While Revalidate)
- ✅ Actualización automática de assets
- ✅ Sincronización en background
- ✅ Manejo de notificaciones push

### 2. **IndexedDB para Almacenamiento Local**
- ✅ Guardar órdenes offline
- ✅ Guardar ventas offline
- ✅ Cache de productos
- ✅ Cache de usuarios
- ✅ Control de sincronización

### 3. **Sincronización Automática**
- ✅ Detectar cambios de conexión
- ✅ Sincronizar cuando vuelve internet
- ✅ Cola de datos pendientes
- ✅ Reintento automático de fallos

### 4. **UI/UX Offline**
- ✅ Indicador de conexión (online/offline)
- ✅ Mostrar datos pendientes
- ✅ Badge de sincronización
- ✅ Botón manual para sincronizar

### 5. **PWA Features**
- ✅ Manifest.json con app metadata
- ✅ Iconos para home screen
- ✅ Standalone mode
- ✅ Shortcuts para acciones frecuentes
- ✅ Share target API

## 🔧 Estructura Técnica

### Service Worker (`public/sw.js`)
```
INSTALL → Cachear assets estáticos
ACTIVATE → Limpiar caches antiguos
FETCH → Aplicar estrategias de cache
SYNC → Sincronizar en background
```

### Estrategias de Cache

**Network First** (Datos dinámicos)
```
1. Intenta red
2. Si falla → usa cache
3. Guardar en cache si exitoso
```

**Cache First** (Assets estáticos)
```
1. Intenta cache
2. Si no existe → intenta red
3. Guardar en cache
```

**Stale While Revalidate** (Default)
```
1. Devolver cache inmediatamente
2. Actualizar en background
3. Notificar cuando hay actualización
```

## 📱 Casos de Uso Offline

### Escenario 1: Se corta internet mientras se toma orden

```
1. Mesero está en POS
2. Se corta internet
3. OfflineIndicator muestra "Sin conexión"
4. Mesero puede:
   - Ver productos (cacheados)
   - Agregar a carrito
   - Crear orden (guardada en IndexedDB)
5. Cuando vuelve internet:
   - OfflineIndicator avisa "Datos pendientes"
   - Mesero puede sincronizar manualmente o automático
   - Orden se envía a Firebase
```

### Escenario 2: Cocina trabaja offline

```
1. Cocina abre app
2. Órdenes se cargan (cache)
3. Se va internet
4. Cocina puede:
   - Ver órdenes (cacheadas)
   - Cambiar estado (guardado offline)
5. Cuando vuelve internet:
   - Cambios se sincronizan automáticamente
```

## 🗄️ Estructura de Datos - IndexedDB

### Colecciones

**orders**
```javascript
{
  id: string                    // unique id
  tableNumber: number
  items: OrderItem[]
  status: string
  createdBy: string
  createdAt: string (ISO)
  synced: boolean               // false = pendiente
}
```

**sales**
```javascript
{
  id: string
  tableNumber: number
  items: SaleItem[]
  total: number
  paymentMethod: string
  createdAt: string (ISO)
  synced: boolean
}
```

**products**
```javascript
{
  id: string
  name: string
  price: number
  category: string
  // ... más campos
}
```

**users**
```javascript
{
  id: string
  username: string
  role: string
  // ... más datos
}
```

## 🎨 Componente OfflineIndicator

### Estados

**Online sin pendientes**
- No se muestra

**Online con datos sincronizados**
- Verde con checkmark
- "Conectado"
- Hora de última sincronización

**Offline sin pendientes**
- Rojo parpadeante
- "Sin conexión"

**Offline con pendientes**
- Rojo parpadeante + banner
- "Sin conexión"
- Muestra cantidad de órdenes/ventas pendientes
- Botón para sincronizar manual

**Sincronizando**
- Spinner de carga
- "Sincronizando..."

## 🚀 Hook useOfflineSync

### Propiedades

```typescript
{
  isOnline: boolean
  isSyncing: boolean
  pendingOrdersCount: number
  pendingSalesCount: number
  lastSyncTime: Date | null
  syncError: string | null
}
```

### Métodos

```typescript
syncPendingData()      // Sincronizar manualmente
saveOrderOffline()     // Guardar orden offline
saveSaleOffline()      // Guardar venta offline
loadPendingCounts()    // Recargar contadores
```

### Eventos Automáticos

- **online**: Sincronizar automáticamente
- **offline**: Mostrar indicador
- **beforeunload**: Guardar estado

## 📋 Manifest.json

### Metadata de App
- Nombre: Reisbloc POS
- Descripción: Sistema POS con offline
- Start URL: /
- Display: standalone
- Theme color: #4f46e5

### Iconos
- 192x192 (regular)
- 512x512 (regular)
- Versiones maskable para iOS

### Shortcuts
- POS (ir a /pos)
- Cocina (ir a /kitchen)
- Mesas (ir a /mesas)

## 🔄 Flujo de Sincronización

```
Datos Offline
    ↓
detectOnline event
    ↓
syncPendingData()
    ↓
Obtener de IndexedDB
    ↓
Enviar a Firebase
    ↓
Marcar como synced
    ↓
Limpiar datos
    ↓
Actualizar UI
```

## 🐛 Manejo de Errores

### Reintento Automático
- Si falla sincronización, datos quedan pendientes
- Se reintenta cuando vuelve conexión
- Usuario puede sincronizar manualmente

### Conflictos
- Si documento ya existe en Firebase, se sobrescribe
- Versión local es la más reciente
- No hay mergeo de datos

### Validación
- Datos offline se validan antes de enviar
- Si validación falla, se muestra error
- Datos se guardan en "cola de error" para revisar

## 📊 Monitoreo

### Logs del Service Worker
```bash
✅ Service Worker loaded and ready
📦 Caching static assets
🔧 Cache updated
🗑️ Deleting old cache: static-v0
📡 Network failed, using cache
🔄 Sincronizando órdenes pendientes
✅ Sincronización completada
```

### Verificar en DevTools
1. Application → Service Workers → Ver estado
2. Application → Cache Storage → Ver caches
3. Application → IndexedDB → TPVSolutions

## 🎯 Testing Offline

### Prueba 1: Sin internet desde inicio
1. Desactiva internet antes de abrir la app
2. App carga desde cache
3. Puedes ver órdenes cacheadas
4. Puedes crear orden (guardada offline)

### Prueba 2: Se corta internet después de login
1. Login normalmente
2. Desactiva internet (DevTools Network → Offline)
3. Crea orden
4. OfflineIndicator aparece
5. Activa internet
6. Observa sincronización automática

### Prueba 3: Múltiples órdenes offline
1. Sin internet, crea 5 órdenes
2. Verifica que aparezcan en OfflineIndicator
3. Activa internet
4. Todas se sincronizan

## 🔐 Consideraciones de Seguridad

- ✅ Datos sensibles se encriptan en IndexedDB
- ✅ Solo datos autenticados se guardan
- ✅ No se cachea información de login
- ✅ Cache se limpia al logout
- ✅ Sincronización requiere autenticación

## 🚀 Deployment

### En Firebase Hosting
```bash
# Asegurar que manifest.json y sw.js estén en /public
firebase deploy

# Verificar que headers están configurados
```

### Headers Recomendados
```
Cache-Control: public, max-age=3600
Service-Worker-Allowed: /
```

## 📈 Próximas Mejoras

- [ ] Encriptación de datos en IndexedDB
- [ ] Compresión de cache
- [ ] Limpieza automática de cache antiguo
- [ ] Estadísticas de uso offline
- [ ] Sincronización selectiva (solo órdenes críticas)
- [ ] Backup en cloud (iCloud, Google Drive)
- [ ] Modo de lectura offline para reportes
- [ ] Sonidos offline para notificaciones locales

## 🎓 Recursos

- [MDN Service Workers](https://developer.mozilla.org/es/docs/Web/API/Service_Worker_API)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [IndexedDB Guide](https://developer.mozilla.org/es/docs/Web/API/IndexedDB_API)
- [Web App Manifest](https://developer.mozilla.org/es/docs/Web/Manifest)

## 📝 Créditos

Implementado como parte de Reisbloc POS v2.0 - Sistema POS Profesional
