# 🔴 Testing Offline Mode

Guía completa para testear la funcionalidad offline-first de Reisbloc POS.

## 📋 Prerrequisitos

- Proyecto en desarrollo (`npm run dev`)
- Browser moderno con Service Workers y IndexedDB
- DevTools abiertos (F12 / Cmd+Opt+I)

## 🧪 Test Suite

### 1. Service Worker Registration

**Verificar que el SW está registrado:**

1. Abre DevTools → Application tab
2. Verifica que aparezca en "Service Workers"
3. Estado debe ser: ✅ Active and Running

```
✓ sw.js registered
✓ Caching static assets
✓ Cache version: v1
```

### 2. Offline Storage

**Verificar IndexedDB creada:**

1. DevTools → Application → IndexedDB
2. Busca base de datos: `ReisblocPOS`
3. Debes ver 5 object stores:
   - orders
   - sales
   - products
   - users
   - sync_queue

```
✓ ReisblocPOS database
  ├─ orders
  ├─ sales
  ├─ products
  ├─ users
  └─ sync_queue
```

### 3. Simular Offline (Sin Internet)

#### Opción A: DevTools Network (Recomendado)

1. DevTools → Network tab
2. Click en dropdown (Online)
3. Selecciona "Offline"
4. La UI debería mostrar indicador: 🔴 OFFLINE

#### Opción B: Throttling completo

1. DevTools → Network
2. Selecciona "Offline" en el dropdown
3. Actualiza la página

#### Opción C: Desactivar WiFi/LTE

- Desactiva la conexión física del dispositivo
- Más realista para testing en producción

### 4. Test: Crear Orden Offline

**Pasos:**

1. Ir a sección POS
2. Agregar productos al carrito
3. **Cambiar a OFFLINE** (DevTools Network → Offline)
4. Hacer click en "Completar Orden"
5. **Verificar:**
   - ✓ La orden se guarda localmente
   - ✓ Mostrar alerta: "Guardado localmente"
   - ✓ IndexedDB tiene la orden en `orders` store
   - ✓ Cola de sync muestra 1 item pendiente

**Console logs esperados:**

```
✅ IndexedDB initialized
📝 Orden guardada localmente: order-123
📤 Item added to sync queue: orders order-123
```

### 5. Test: Ver Órdenes Offline

**Pasos:**

1. Crear 2-3 órdenes mientras estás OFFLINE
2. Navegar a "Mis Órdenes"
3. **Verificar:**
   - ✓ Las órdenes aparecen (desde IndexedDB)
   - ✓ Indicador 🔴 OFFLINE visible
   - ✓ Botón "Sincronizar" disponible

### 6. Test: Sincronizar al Reconectar

**Pasos:**

1. Tener 3 órdenes OFFLINE sin sincronizar
2. **Cambiar a ONLINE** (DevTools Network → Online)
3. La app debería:
   - ✓ Detectar automáticamente conexión
   - ✓ Mostrar "Sincronizando..." 
   - ✓ Enviar órdenes a Firebase
   - ✓ Marcar como "Sincronizado"
   - ✓ Limpiar IndexedDB

**Console logs esperados:**

```
🟢 ONLINE - Sincronizando cambios...
🔄 Sincronizando 3 elementos...
✅ Synced orders order-123
✅ Synced orders order-124
✅ Synced orders order-125
✅ Sync complete: 3 OK, 0 FAILED
```

### 7. Test: Manejo de Conflictos

**Scenario:**

1. Crear orden A en Dispositivo 1 (OFFLINE)
2. Crear orden B en Dispositivo 2 (ONLINE)
3. Reconectar Dispositivo 1
4. **Verificar:**
   - ✓ Ambas órdenes se sincronizan
   - ✓ No hay duplicados
   - ✓ Timestamps correctos

### 8. Test: Cache de Assets

**Pasos:**

1. Ir a OFFLINE
2. Actualizar página (F5)
3. **Verificar:**
   - ✓ HTML carga desde cache
   - ✓ CSS/JS carga desde cache
   - ✓ Imágenes cargan desde cache
   - ✓ App es totalmente funcional

**DevTools → Network → Type = cached**

### 9. Test: Storage Size

**Verificar límites:**

1. Console:
   ```javascript
   const size = await indexedDBService.getStorageSize()
   console.log(size)
   // { used: 1245632, quota: 52428800 }
   ```

2. **Esperado:**
   - used: < 50MB (en desarrollo)
   - quota: ~50MB total

### 10. Test: Limpiar Datos Antiguos

**Verificar cleanup automático:**

1. Console:
   ```javascript
   // Limpiar datos > 7 días
   await offlineSyncService.clearOldData(7)
   ```

2. **Verificar:**
   - ✓ IndexedDB se reduce
   - ✓ Log: "🗑️ Cleared data older than 7 days"

## 🔧 Debugging Console Commands

```javascript
// Ver status de sincronización
offlineSyncService.getStatus()
// { isSyncing: false, pending: 3, lastSync: 1704000000000 }

// Forzar sincronización manual
await offlineSyncService.syncQueue()

// Ver cola de sincronización
const queue = await indexedDBService.getSyncQueue()
console.table(queue)

// Limpiar queue
await offlineSyncService.clearSyncQueue()

// Ver tamaño de storage
const storage = await indexedDBService.getStorageSize()
console.log(`Usando ${storage.used} de ${storage.quota} bytes`)

// Limpiar todo
await indexedDBService.clear('sync_queue')
await indexedDBService.clear('orders')
await indexedDBService.clear('sales')
```

## 📊 Checklist Completo

- [ ] Service Worker registrado
- [ ] IndexedDB creada correctamente
- [ ] Crear orden OFFLINE funciona
- [ ] Órdenes guardadas en IndexedDB
- [ ] Indicador OFFLINE visible
- [ ] Sincronización automática al reconectar
- [ ] Console logs correctos
- [ ] No hay duplicados
- [ ] Assets cargan desde cache
- [ ] Storage size es razonable

## 🐛 Common Issues

| Problema | Solución |
|----------|----------|
| SW no se registra | Ctrl+Shift+Delete → Clear site data → Recargar |
| IndexedDB vacía | Verificar que no hay errores en console |
| No sincroniza | Verificar conexión, revisar console |
| Cache inválido | Hard refresh: Ctrl+Shift+R |
| Storage lleno | `indexedDBService.clearOldData(1)` |

## 📈 Performance Expectations

- **Offline**: ~50-100ms por operación (desde IndexedDB)
- **Sync**: ~2-5s por 10 órdenes (depende de conexión)
- **Storage**: ~10-20KB por orden

