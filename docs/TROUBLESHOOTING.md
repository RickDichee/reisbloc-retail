# 🚨 SOLUCIÓN RÁPIDA: Error "internal" en Login

## ❌ Síntoma
```
❌ Login error: FirebaseError: internal
🔐 Verificando PIN con Cloud Function...
```

## ✅ Solución en 3 pasos

### 1️⃣ Compilar Cloud Functions
```bash
cd functions && npm run build && cd ..
```
**¿Por qué?** Las funciones están en TypeScript y necesitan compilarse a JavaScript.

### 2️⃣ Reiniciar emuladores
```bash
# Matar procesos viejos
killall -9 firebase node

# Esperar 2 segundos
sleep 2

# Iniciar emuladores
firebase emulators:start --only functions,auth,firestore
```

### 3️⃣ Cargar datos
```bash
# En otra terminal
node seed-emulators.js
```

---

## ⚡ MÉTODO ULTRA RÁPIDO

Un solo comando hace TODO lo anterior:

```bash
./start-dev.sh
```

Esto abrirá la app en http://localhost:5173/

**Credenciales:**
- `admin` / `1234`
- `capitan` / `2222` ← Tu usuario
- `supervisor` / `5678`

---

## 🔍 Verificación paso a paso

### ¿Emuladores corriendo?
```bash
lsof -ti:8080,9099,5001
```
**Debe mostrar:** 2 números (PIDs)  
**Si no:** Inicia emuladores con `firebase emulators:start --only functions,auth,firestore`

### ¿Datos cargados?
```bash
node seed-emulators.js
```
**Debe mostrar:** "✓ Usuario capitán creado"

### ¿App corriendo?
```bash
npm run dev
```
**Debe mostrar:** "Local: http://localhost:5173/"

### ¿Consola del navegador?
Abre http://localhost:5173/ y mira la consola (F12)  
**Debe mostrar:** `🔧 Emuladores conectados: Auth (9099), Firestore (8080), Functions (5001)`  
**Si no:** Recarga la página (Ctrl+Shift+R)

---

## 🐛 Errores comunes

### "PIN incorrecto"
**Causa:** Datos no cargados en emuladores  
**Solución:** `node seed-emulators.js`

### "internal"
**Causa:** Functions no compiladas o emuladores usando código viejo  
**Solución:** `cd functions && npm run build && cd ..` y reinicia emuladores

### "Could not reach Cloud Firestore backend"
**Causa:** Emuladores no están corriendo  
**Solución:** `firebase emulators:start --only functions,auth,firestore`

### "Port 5173 is in use"
**Causa:** Vite ya está corriendo  
**Solución:** `killall -9 node && npm run dev`

---

## 📝 Checklist completo

Antes de intentar login, verifica:

- [ ] ✅ Cloud Functions compiladas: `cd functions && npm run build`
- [ ] ✅ Emuladores corriendo: `lsof -ti:8080,9099,5001` muestra 2 números
- [ ] ✅ Datos cargados: `node seed-emulators.js` ejecutado
- [ ] ✅ App corriendo: `npm run dev` muestra puerto 5173
- [ ] ✅ Consola navegador: Dice "🔧 Emuladores conectados"
- [ ] ✅ Credenciales: `capitan` / `2222`

Si TODO lo anterior está ✅ y sigue sin funcionar → avísame, hay algo más profundo.

---

## 🎯 Lo más importante

**El error "internal" casi SIEMPRE es porque:**
1. No compilaste las Cloud Functions → `cd functions && npm run build`
2. Los emuladores están usando código viejo → Reinícialos

**Solución definitiva:** Usa `./start-dev.sh` siempre que inicies el proyecto.
