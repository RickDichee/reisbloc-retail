# 🎭 Guía de Demostración Segura para Clientes

**Cómo mostrar el sistema sin comprometer seguridad**

---

## ✅ QUÉ MOSTRAR

### 1. **Funcionamiento en Vivo** ✨
```bash
# Iniciar demo desde scripts/
./start-production.sh
```

**Mostrar**:
- ✅ Login con PIN (usar PIN demo: 1111)
- ✅ Interfaz POS completa
- ✅ Creación de orden paso a paso
- ✅ Envío a cocina/bar
- ✅ Vista de cocina recibiendo orden
- ✅ Marcar orden como lista
- ✅ Vista de mesero viendo orden lista
- ✅ Cobro y registro de propina
- ✅ Panel de admin (reportes básicos)

### 2. **Características Visuales**
- ✅ Diseño moderno y profesional
- ✅ Filtros de productos (Alimentos/Bebidas)
- ✅ Notificaciones en tiempo real
- ✅ Indicadores de stock
- ✅ Badges de categorías con colores

### 3. **Flujo Completo**
```
Mesero toma orden → Envía → Cocina recibe → 
Prepara → Marca lista → Mesero sirve → Cobra
```

### 4. **Reportes y Transparencia**
- ✅ Cierre de caja con desglose
- ✅ División de propinas
- ✅ Ventas por empleado
- ✅ Productos más vendidos

---

## 🚫 QUÉ NO MOSTRAR

### ❌ Código Fuente
- No abrir carpeta `src/`
- No mostrar archivos `.ts` o `.tsx`
- No enseñar estructura de carpetas técnicas

### ❌ Credenciales y Configuración
- **NUNCA** abrir `.env.local`
- **NUNCA** enseñar claves API de MercadoPago

### ❌ Base de Datos
- No mostrar el Dashboard de Supabase
- No enseñar estructura de tablas SQL

### ❌ Archivos Sensibles
```
❌ .env.local
❌ supabase-service-role-key (si existiera)
❌ .firebaserc
❌ package-lock.json
❌ node_modules/
❌ functions/lib/
❌ cualquier archivo de backup
```

---

## 📋 Checklist Pre-Demo

### Preparación (30 minutos antes)
- [ ] Cerrar todos los editores de código
- [ ] Cerrar Supabase Dashboard
- [ ] Limpiar historial de terminal
- [ ] Verificar que `.env.local` no esté abierto
- [ ] Crear usuarios demo con PINs simples (1111, 2222, etc.)
- [ ] Cargar productos de ejemplo (tacos, bebidas, etc.)
- [ ] Probar flujo completo una vez

### Setup de Demo
```bash
# 1. Ir a la carpeta del proyecto
cd ~/reisbloc-pos

# 2. Iniciar sistema
./scripts/start-production.sh

# 3. Esperar mensaje de "Sistema Iniciado"

# 4. Abrir navegador en modo incógnito
# Chrome: Ctrl+Shift+N
# Firefox: Ctrl+Shift+P
```

### Durante la Demo
- [ ] Usar solo la interfaz del navegador
- [ ] No alternar entre ventanas
- [ ] Usar solo usuarios demo
- [ ] Tener scripts preparados (orden pre-armada)
- [ ] Grabar pantalla si es remoto (solo navegador)

---

## 🎬 Script de Demostración (15 minutos)

### Minuto 0-2: Introducción
```
"Este es Reisbloc POS, un sistema POS diseñado específicamente 
para restaurantes. Vamos a ver cómo funciona desde la perspectiva 
de diferentes roles."
```

### Minuto 2-5: Login y Rol Mesero
```
1. Abrir http://localhost:4173
2. Login con PIN: 1111 (Usuario: Demo Mesero)
3. Mostrar selector de mesas
4. Seleccionar Mesa 5
5. Mostrar filtros: Todos / Alimentos / Bebidas
6. Agregar productos al carrito
7. Mostrar subtotal actualizándose
8. Enviar a Cocina/Bar
9. Confirmar "Orden enviada"
```

### Minuto 5-8: Vista de Cocina
```
1. Logout (esquina superior derecha)
2. Login con PIN: 2222 (Usuario: Demo Cocina)
3. Mostrar orden recién llegada
4. Mostrar tiempo transcurrido
5. Marcar orden como "Lista"
6. Confirmar notificación enviada
```

### Minuto 8-11: Órdenes Listas para Servir
```
1. Logout
2. Login con PIN: 1111 (volver a Mesero)
3. Ir a página "Listas" 
4. Mostrar orden lista para servir
5. Ver detalles de la orden
6. Marcar como "Servida"
```

### Minuto 11-13: Cobro y Propinas
```
1. Demostrar proceso de cobro (simulado)
2. Mostrar opciones: Efectivo/Tarjeta/Transferencia
3. Mostrar sistema de propinas (10%, 15%, 20%, Otro)
4. Confirmar venta registrada
```

### Minuto 13-15: Panel de Admin
```
1. Logout
2. Login con PIN: 9999 (Usuario: Admin)
3. Mostrar dashboard con estadísticas
4. Ir a "Cierre de Caja"
5. Mostrar desglose de ventas
6. Mostrar distribución de propinas
7. Explicar transparencia del sistema
```

---

## 🎥 Tips para Demo Remota

### Preparación
```bash
# 1. Limpiar terminal antes de compartir pantalla
clear

# 2. Hacer terminal más legible
export PS1="\[\033[01;32m\]Reisbloc Demo\[\033[00m\]$ "

# 3. Iniciar sistema
./scripts/start-production.sh

# 4. Esperar a que esté listo
```

### Durante Videollamada
- ✅ Compartir SOLO la ventana del navegador (no pantalla completa)
- ✅ Usar modo incógnito (sin extensiones, sin historial)
- ✅ Cerrar otras pestañas del navegador
- ✅ Desactivar notificaciones del sistema
- ✅ Poner celular en silencio

### Herramientas Recomendadas
- **Zoom**: Compartir ventana específica
- **Google Meet**: Compartir pestaña de Chrome
- **Teams**: Compartir ventana de aplicación

---

## 📊 Datos Demo Pre-Cargados

### Usuarios Demo
```javascript
// PINs simplificados para demo
{
  admin: "9999",
  mesero1: "1111", 
  mesero2: "2222",
  cocina: "3333",
  bar: "4444"
}
```

### Productos Demo
```javascript
// Categorías con precios redondeados
Alimentos:
- Tacos al Pastor (3 pzas)  - $85
- Quesadillas (2 pzas)      - $70
- Alitas BBQ (10 pzas)      - $120
- Arrachera                 - $180

Bebidas:
- Refresco                  - $30
- Cerveza                   - $45
- Agua                      - $20
- Michelada                 - $55
```

### Ventas Demo (para reportes)
```javascript
// Pre-cargar algunas ventas del "día"
Total del día: $2,450
Número de órdenes: 18
Propinas totales: $245
Personal activo: 4
```

---

## 🔒 Checklist de Seguridad Post-Demo

### Inmediatamente Después
- [ ] Cerrar navegador del cliente
- [ ] Detener sistema (Ctrl+C en terminal)
- [ ] Limpiar historial de bash
  ```bash
  history -c && history -w
  ```
- [ ] Verificar que no haya screenshots en ~/Pictures

### Al Finalizar el Día
- [ ] Cambiar PINs demo por unos nuevos
- [ ] Limpiar datos demo de la base de datos
- [ ] Revisar logs por accesos no autorizados
  ```bash
  tail -n 100 /tmp/tpv-*.log
  ```

### Si Compartiste Pantalla Remota
- [ ] Revisar grabaciones locales (Zoom, etc.)
- [ ] Verificar que no se grabó información sensible
- [ ] Eliminar grabaciones temporales

---

## 🆘 Qué Hacer Si...

### Se te olvidó cerrar algo sensible
1. **Durante videollamada**: "Un momento, voy a optimizar la vista"
2. Compartir pantalla en negro temporalmente
3. Cerrar ventanas/archivos sensibles
4. Volver a compartir solo navegador

### El cliente pide ver "el código"
**Respuesta**:
```
"Por políticas de seguridad y propiedad intelectual, 
el código fuente es confidencial. Lo que sí puedo 
mostrarle es toda la funcionalidad en vivo y 
documentación de uso completa."
```

### El cliente quiere "probar" en su computadora
**Respuesta**:
```
"Perfecto, puedo hacer una instalación de prueba 
en su servidor/laptop en sitio. Necesitaré acceso 
físico para configurar todo de forma segura con 
sus credenciales propias."
```

### Error durante la demo
1. Mantener la calma
2. "Esto es parte de la demo de prueba, déjeme reiniciar"
3. Ctrl+C → ./scripts/start-production.sh
4. Continuar donde quedaste

---

## 📄 Documentos para Compartir

### ✅ Sí Compartir
- `docs/CLIENT_PRESENTATION.md` (este archivo)
- Screenshots de interfaces (sin datos reales)
- Manual de usuario básico
- Lista de características

### ❌ NO Compartir
- Cualquier archivo de `src/`
- Cualquier archivo de `functions/`
- Scripts de setup
- Documentación técnica (ARCHITECTURE.md, etc.)
- Archivos de configuración

---

## 🎁 Material de Seguimiento

### Después de la Demo
**Enviar por email**:
1. PDF de CLIENT_PRESENTATION.md
2. Screenshots seleccionados (previamente revisados)
3. Cotización formal
4. Próximos pasos

**NO enviar**:
- Acceso al repositorio
- Links a Supabase Dashboard
- Credenciales de prueba
- Código fuente

---

## 📞 Preguntas del Cliente - Respuestas Preparadas

**Q: "¿Puedo ver el código?"**
```
A: "El código es propiedad intelectual. Lo que garantizo 
es funcionalidad completa, soporte y mantenimiento. 
Puedo mostrarle toda la funcionalidad en vivo."
```

**Q: "¿Cómo sé que es seguro?"**
```
A: "El sistema tiene:
- Autenticación por PIN
- Control de dispositivos
- Auditoría completa
- Backups automáticos
- Firewall de base de datos
Todo esto lo puedo demostrar funcionando."
```

**Q: "¿Qué pasa si dejas de dar soporte?"**
```
A: "El sistema funciona de forma autónoma en su red local.
Si en algún momento lo requiere, puedo transferirle 
todo con documentación completa (con costo adicional)."
```

**Q: "¿Puedo modificarlo yo mismo?"**
```
A: "Las modificaciones específicas a su negocio 
las puedo hacer yo como parte del mantenimiento. 
Si requiere transferencia de código, es una 
negociación separada por propiedad intelectual."
```

---

**Resumen**: Muestra TODO lo que hace, pero NUNCA el cómo lo hace. 🎭

---

*Guía actualizada: 24 de enero de 2026*
