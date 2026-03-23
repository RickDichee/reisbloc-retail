# 📋 PLAYBOOK DE RESPUESTA RÁPIDA

## Cuando Llega una Alerta

### Paso 1: Identificar el Tipo

```
🔴 CRÍTICO → Actúa HOY
🟠 WARNING → Actúa ESTA SEMANA  
🟡 NOTICE → Revisa ESTE MES
```

### Paso 2: Ejecutar el Plan Correspondiente

---

## 🚨 ESCENARIO A: Organizaciones = 50 (Límite)

### Inmediato (0-24 horas)

```
□ Revisar dashboard: ¿Cuántos son paying customers?
□ Si ≥3 paying: No hacer nada, monitorear
□ Si <3 paying: Alta prioridad de conversión
□ Enviar email a todos los admins de orgs
```

### Email para Usuarios (Plantilla)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ASUNTO: 🚀 Reisbloc está creciendo - Ayúdanos a seguir

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hola [NOMBRE],

¡Reisbloc ha alcanzado las 50 organizaciones! 🎉

Esto significa que hemos sido elegidos por negocios 
como el tuyo para digitalizar sus operaciones.

PARA SEGUIR CRECIENDO Y MANTENER EL PLAN FREE 
PARA TODOS, NECESITAMOS TU AYUDA:

🎁 OFERTA ESPECIAL PARA TI:
- 1 mes GRATIS de Starter ($149 valor)
- Solo por hacer upgrade hoy

👉 ¿Qué obtienes con Starter?
- 1,000 productos (vs 100 en free)
- 10 empleados (vs 3 en free)
- 3 cajas (vs 1 en free)
- 1,500 queries de IA/mes

🔗 [HACER UPGRADE AHORA - 1 clic]

¿No puedes hacer upgrade ahora? 
No te preocupes, puedes seguir usando Reisbloc 
gratis sin cambios. Solo queríamos que supieras 
de la oferta.

¡Gracias por confiar en nosotros!

El equipo de Reisbloc

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Seguimiento (Días 2-7)

```
□ Si <3 upgrades: Contactar personalmente (WhatsApp)
□ Si 3-5 upgrades: Success, monitorear
□ Si >5 upgrades: Revenue positivo,很开心
```

### Si Seguimos Creciendo (Día 8+)

```
□ Implementar waitlist para nuevos registros
□ Email a waitlist: "Estamos volviendo a abrir"
□ Evaluar: ¿Cobrar a nuevos registros?
```

---

## 🚨 ESCENARIO B: Supabase > $25/mes

### Inmediato (0-48 horas)

```
□ Identificar el consumo:
  - ¿Storage? (imágenes)
  - ¿Database? (muchos registros)
  - ¿MAU? (muchos usuarios)

□ Revisar optimización:
  - ¿Imágenes comprimidas?
  - ¿Queries lentas?
  - ¿Datos sin cleanup?
```

### Optimización Rápida

```
□ Comprimir imágenes >500KB
□ Eliminar organizaciones inactivas (>90 días)
□ Limpiar tablas de audit_log (>6 meses)
□ Implementar pagination en queries pesadas
□ Revisar índices faltantes
```

### Email para Usuarios (Plantilla)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ASUNTO: 📊 Actualización de precios - Starter $149 → $179

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hola [NOMBRE],

Para seguir ofreciendo la mejor experiencia POS 
para negocios mexicanos, estamos ajustando precios.

CAMBIOS A PARTIR DEL [FECHA + 30 DÍAS]:

┌────────────────────────────────────────┐
│  Plan Starter: $149 → $179/mes       │
│  (20% más contenido)                  │
│                                        │
│  + Productos: 1,000 → 1,500          │
│  + Empleados: 10 → 15                 │
│  + Almacenamiento: 1GB → 2GB         │
└────────────────────────────────────────┘

¿TU PRECIO ACTUAL?
Bloqueado por 6 meses si actúas HOY.

🔗 [BLOQUEAR PRECIO LEGACY]

Gracias por tu confianza,
El equipo de Reisbloc

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🚨 ESCENARIO C: Conversión < 10%

### Diagnóstico (Semana 1)

```
□ Hablar con 5 usuarios free que NO han upgraded
□ Preguntar: "¿Qué falta para que pagues?"
□ Escuchar y documentar objeciones
□ Revisar onboarding: ¿Explica bien el valor?
```

### Objeciones Comunes y Respuestas

```
OBJECIÓN: "No tengo dinero"
→ Respuesta: "El plan free tiene TODO lo básico. 
  Starter es $5/día. ¿Cuánto pierdes por no saber 
  qué vender más?"

OBJECIÓN: "No lo necesito"
→ Respuesta: "¿Cuánto tiempo te toma hacer 
  inventario cada semana? Con IA, 5 minutos."

OBJECIÓN: "Es muy caro"
→ Respuesta: "¿Cuánto pagas mensualmente por 
  hojas, tinta, errores de inventario? 
  Starter se paga solo."

OBJECIÓN: "Voy a pensarlo"
→ Respuesta: "¿Qué te gustaría ver para tomar 
  la decisión?"
```

### A/B Tests

```
TEST A: "Upgrade a Premium"
TEST B: "Hazte Pro"
TEST C: "Desbloquea Full Power"

→ Medir click-through rate en 1 semana
→ Implementar winner
```

### Campaña de Conversión

```
SEMANA 1: Email a todos free users
SEMANA 2: Recordatorio + offer especial  
SEMANA 3: Last chance + scarcity
SEMANA 4: Análisis de resultados
```

---

## 🚨 ESCENARIO D: 1 Org Consume 50% de Recursos

### Identificar

```
□ Revisar métricas por organización
□ Dashboard → Top consumidores
□ Típico: Ferreterías con 5,000+ productos
```

### Soluciones

```
OPCION 1: Conversación directa
→ "Tu negocio ha crecido mucho. 
  Necesitamos ajustar tu plan a Enterprise."
→ Ofrecer: 20% off por referral

OPCION 2: Límites por-org
→ "Tu organización excede límites de free tier.
  Upgrade para continuar."

OPCION 3: Descuento por largo plazo
→ "Si compras año completo, $149/mes → $129/mes"
```

### Email para Org Específica

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ASUNTO: 🌟 Tu negocio merece un plan más grande

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hola [GERENTE DE FERRETERÍA],

Hemos notado que tu organización es una de las 
más activas en Reisbloc. ¡Felicidades por el 
crecimiento!

Con [5,000] productos y [10] empleados activos, 
has excedido los límites del plan Starter.

TE OFRECEMOS:

┌────────────────────────────────────────┐
│  Plan SCALE: $799/mes                 │
│                                        │
│  • Productos ilimitados                │
│  • Empleados ilimitados               │
│  • Multi-tienda (3 stores)            │
│  • API access                         │
│  • Prioridad en soporte               │
│                                        │
│  🎁 PRECIO ESPECIAL: $599/mes        │
│  (Solo para ti, 6 meses)             │
└────────────────────────────────────────┘

¿Hablamos 15 minutos esta semana?

🔗 [AGENDAR LLAMADA]

Gracias,
El equipo de Reisbloc

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📞 Contactos de Emergencia

```
SITUACIÓN                      → PERSONA DE CONTACTO
─────────────────────────────────────────────────────
Alerta crítica de sistema     → Tu email + logs
Problema de billing           → Tu email
Bug crítico en producción     → Tu email
Prensa/Medios                → N/A por ahora
Inversionistas                → N/A por ahora
```

---

## ✅ Checklist de Cada Domingo

```
□ Revisar métricas semanales
□ Identificar alertas pendientes
□ Acciones completadas esta semana
□ Acciones para próxima semana
□ Email de status a ti mismo
```

---

*Documento creado: Marzo 2026*
*Versión: 1.0*
