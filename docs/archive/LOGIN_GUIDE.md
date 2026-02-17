# Guía Rápida: Login y Credenciales

## 🔑 Credenciales de Prueba

### Emuladores (Desarrollo Local) - Por defecto
```
Usuario: admin      | PIN: 1234
Usuario: capitan    | PIN: 2222  ← ACTUALIZADO
Usuario: supervisor | PIN: 5678
```

### Firebase Cloud (Producción)
```
Usuario: admin      | PIN: 1234
Usuario: capitan    | PIN: 2222  ← Corregido con script
Usuario: supervisor | PIN: 5678
```

---

## 🎯 Solución al problema "No puedo entrar"

### Síntoma:
- Usuario "capitan" con PIN 2222 no funciona
- Error: "PIN incorrecto"

### Causa:
App conectada a **emuladores** pero usuario creado en **producción**

### Solución aplicada:
✅ Actualizado `seed-emulators.js` → PIN del capitán es ahora 2222

---

## 🔄 Cambiar entre Emuladores y Producción

### ⚡ MÉTODO RÁPIDO (Recomendado):
```bash
# Un solo comando que hace todo:
./start-dev.sh

# Esto hace automáticamente:
# ✅ Limpia procesos viejos
# ✅ Compila Cloud Functions
# ✅ Inicia emuladores
# ✅ Carga datos de prueba (admin/1234, capitan/2222, supervisor/5678)
# ✅ Inicia app en http://localhost:5173/
```

### Usar EMULADORES (paso por paso):
```bash
# 1. Compilar Cloud Functions (IMPORTANTE - hazlo siempre)
cd functions && npm run build && cd ..

# 2. Iniciar emuladores
firebase emulators:start --only functions,auth,firestore

# 3. En otra terminal: Cargar datos de prueba
node seed-emulators.js

# 4. En otra terminal: Iniciar app
npm run dev

# 5. Login: capitan / 2222
```

### Usar PRODUCCIÓN (Firebase Cloud):
```bash
# Crear archivo .env.local con:
echo "VITE_USE_EMULATORS=false" > .env.local

# Reiniciar app
npm run dev

# Login: capitan / 2222 (ya corregido en producción)
```

---

## 🛠️ Scripts útiles

| Script | Función | Cuándo usar |
|--------|---------|-------------|
| `seed-emulators.js` | Carga datos en emuladores | Cada vez que reinicies emuladores |
| `fix-unhashed-pins-production.js` | Hashea PINs en producción | Solo una vez (ya ejecutado) |
| `verify-data.js` | Verifica usuarios en producción | Para debugging |

---

## ✅ Validación

**Si estás usando EMULADORES:**
- Consola debe mostrar: `🔧 Emuladores conectados: Auth (9099), Firestore (8080), Functions (5001)`
- Login: `capitan` / `2222` ✅

**Si estás usando PRODUCCIÓN:**
- Consola debe mostrar: `🌐 Conectado a Firebase Cloud (Producción)`
- Login: `capitan` / `2222` ✅

---

## 📝 Sobre los PINs de 4 dígitos

**¿Están bien los PINs de 4 dígitos?**
- ✅ SÍ, están perfectos para tu caso de uso (restaurant POS)
- ✅ Se almacenan hasheados con bcrypt (seguro)
- ✅ Fáciles de recordar para el personal
- ✅ No son contraseñas públicas (solo acceso interno)

**Alternativas si quieres más seguridad:**
- Usar PINs de 6 dígitos
- Agregar usuario + PIN (ya tenemos esto)
- Autenticación biométrica (más complejo)

**Recomendación:** Mantener PINs de 4 dígitos. El problema era técnico (emuladores vs producción), no de seguridad.

---

## 🚀 Siguiente paso

**Ahora mismo:**
1. Recarga http://localhost:5173/
2. Login con: `capitan` / PIN: `2222`
3. ¡Debería funcionar! 🎉

**Si no funciona:**
- ✅ **IMPORTANTE:** Compila primero: `cd functions && npm run build && cd ..`
- Verifica la consola → debe decir "🔧 Emuladores conectados"
- Verifica emuladores están corriendo: `lsof -ti:8080,9099,5001`
- Recarga datos: `node seed-emulators.js`
- Si todo falla, usa el script: `./start-dev.sh`
