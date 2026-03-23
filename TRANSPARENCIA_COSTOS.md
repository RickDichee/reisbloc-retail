# 📊 TRANSPARENCIA DE COSTOS PARA USUARIOS

**Última actualización:** Marzo 2026  
**Versión:** 1.0

---

## 🎯 OBJETIVO DE ESTE DOCUMENTO

Ser 100% transparentes sobre:
1. Qué cuesta usar Reisbloc
2. Cómo funcionan los tokens
3. Qué pasa si te quedas sin tokens
4. Cómo optimizamos costos para ofrecerte el mejor precio

---

## 💰 Desglose de Costos Reales

### ¿Cuánto nos cuesta a nosotros?

```
╔══════════════════════════════════════════════════════════════════╗
║                    COSTOS REALES DE REISBLOC                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  🔧 INFRAESTRUCTURA (por usuario/mes)                          ║
║  ───────────────────────────────────────────────────────────    ║
║  • Supabase (DB + Auth + Realtime): $8 USD                     ║
║  • Storage (imágenes): $2 USD                                 ║
║  • Edge Functions: $1 USD                                      ║
║  • Hosting (Vercel): $1 USD                                  ║
║  • Dominio + SSL: $0.50 USD                                   ║
║  ───────────────────────────────────────────────────────────    ║
║  SUBTOTAL: $12.50 USD/mes                                      ║
║                                                                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  🤖 INTELIGENCIA ARTIFICIAL (por query)                        ║
║  ───────────────────────────────────────────────────────────    ║
║  • 1 Chat con Reisbloc Agent: $0.003 USD ($0.05 MXN)           ║
║  • 1 Post de Marketing: $0.004 USD ($0.07 MXN)                 ║
║  • 1 Análisis de Insights: $0.005 USD ($0.08 MXN)              ║
║  ───────────────────────────────────────────────────────────    ║
║                                                                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  💳 PROCESADORA DE PAGOS                                       ║
║  ───────────────────────────────────────────────────────────    ║
║  • Stripe/PayPal: 3.5% + $2 MXN por transacción               ║
║  • Esto lo absorbe Reisbloc, no el usuario                      ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝
```

### ¿Cuánto te costamos?

```
╔══════════════════════════════════════════════════════════════════╗
║                 ¿CÓMO TE LO COBRAMOS?                         ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  📦 PLAN FREE                                                  ║
║  ───────────────────────────────────────────────────────────    ║
║  ✓ Costo para ti: $0 MXN                                       ║
║  ✓ Costo para nosotros: $12.50 USD (subsidiado)               ║
║  ✓ 20 queries AI/día (límite blando)                         ║
║  ✓ Ideal para: Probar, negocio pequeño, aprendizaje            ║
║                                                                   ║
║  📦 PLAN STARTER ($149/mes)                                    ║
║  ───────────────────────────────────────────────────────────    ║
║  ✓ Costo para ti: $149 MXN                                    ║
║  ✓ Costo para nosotros: $12.50 + $25 USD (AI) = $37.50 USD   ║
║  ✓ Margen: ~65%                                               ║
║  ✓ 1,500 tokens/mes                                           ║
║  ✓ Ideal para: Negocio pequeño con IA ocasional                ║
║                                                                   ║
║  📦 PLAN GROWTH ($399/mes)                                     ║
║  ───────────────────────────────────────────────────────────    ║
║  ✓ Costo para ti: $399 MXN                                    ║
║  ✓ Costo para nosotros: $12.50 + $85 USD = $97.50 USD         ║
║  ✓ Margen: ~55%                                               ║
║  ✓ 5,000 tokens/mes                                           ║
║  ✓ Ideal para: Negocio con uso regular de IA                  ║
║                                                                   ║
║  📦 PLAN SCALE ($799/mes)                                      ║
║  ───────────────────────────────────────────────────────────    ║
║  ✓ Costo para ti: $799 MXN                                    ║
║  ✓ Costo para nosotros: $12.50 + $250 USD = $262.50 USD       ║
║  ✓ Margen: ~50%                                               ║
║  ✓ 15,000 tokens/mes                                          ║
║  ✓ Ideal para: Negocio mediano con IA frecuente                ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 🎫 Cómo Funcionan los Tokens

### Diagrama Simple

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   $149 MXN                    1,500 tokens               │
│   ┌─────────┐                ┌─────────────┐             │
│   │ PAGAS  │ ────────────▶  │ RECIBES    │             │
│   └─────────┘                └─────────────┘             │
│                                   │                        │
│                                   ▼                        │
│   ┌─────────────────────────────────────────────┐        │
│   │             USAS TOKENS                     │        │
│   ├─────────────────────────────────────────────┤        │
│   │  1 Chat IA     = 1 token                   │        │
│   │  1 Post        = 5 tokens                  │        │
│   │  1 Insight     = 3 tokens                  │        │
│   └─────────────────────────────────────────────┘        │
│                                   │                        │
│                                   ▼                        │
│   ┌─────────────────────────────────────────────┐        │
│   │         ¿SE ACABARON?                      │        │
│   ├─────────────────────────────────────────────┤        │
│   │  Opción 1: Comprar más (desde $49)         │        │
│   │  Opción 2: Esperar límite diario (20)       │        │
│   │  Opción 3: Hacer upgrade de plan            │        │
│   │  Opción 4: Usar versión FREE               │        │
│   └─────────────────────────────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tabla de Costos por Feature

```
╔════════════════════════════════════════════════════════════════════╗
║                 COSTO POR FEATURE PREMIUM                       ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  FEATURE                    │ TOKENS │ COSTO MXN │ CUANDO LO USAS  ║
║  ─────────────────────────────────────────────────────────────────  ║
║  🗣️ Chat con Reisbloc     │    1   │  $0.10    │ Cuando preguntas  ║
║     Agent                                              │            ║
║                                                                     ║
║  📱 Generar Post           │    5   │  $0.50    │ Cuando creas     ║
║     Marketing                                          │ post       ║
║                                                                     ║
║  📊 AI Insights            │    3   │  $0.30    │ Cuando ves        ║
║     Avanzados                                         │ dashboard  ║
║                                                                     ║
║  📄 Reporte Premium PDF    │   10   │  $1.00    │ Cuando exportas   ║
║                                                                     ║
║  📥 Export Masivo          │    2   │  $0.20    │ Por cada export   ║
║     (CSV/Excel)                                                        ║
║                                                                     ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  EJEMPLO PRÁCTICO:                                                  ║
║                                                                     ║
║  Ferretería "El Clóset" usa:                                       ║
║  • 30 chats con IA = 30 tokens ($3 MXN)                           ║
║  • 5 posts generados = 25 tokens ($2.50 MXN)                       ║
║  • 10 análisis de insights = 30 tokens ($3 MXN)                   ║
║  • 2 reportes premium = 20 tokens ($2 MXN)                        ║
║  ───────────────────────────────────────────                        ║
║  TOTAL: 105 tokens = $10.50 MXN                                   ║
║                                                                     ║
║  Con plan Starter (1,500 tokens): Pueden hacer esto ~14 veces/mes  ║
║                                                                     ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## 🔄 ¿Qué Pasa Si Me Quedo Sin Tokens?

### Escenario: Teacabaste los tokens

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   😱 ¡SE ACABARON TUS TOKENS!                                   ║
║                                                                   ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   TUS DATOS ESTÁN 100% SEGUROS:                                ║
║   ✅ 1,000 productos siguen ahí                                 ║
║   ✅ 5 empleados no se borran                                    ║
║   ✅ 3 cajas siguen registradas                                  ║
║   ✅ Historial de ventas intacto                                 ║
║   ✅ Configuración guardada                                      ║
║                                                                   ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   OPCIONES:                                                      ║
║                                                                   ║
║   1️⃣ COMPRAR MÁS TOKENS (instantáneo)                          ║
║      └─ Desde $49 MXN por 200 tokens                            ║
║      └─ Disponible de inmediato                                 ║
║      └─ Sin límite de compra                                    ║
║                                                                   ║
║   2️⃣ ESPERAR RESET DIARIO (gratis)                              ║
║      └─ 20 queries gratuitas cada 24 horas                      ║
║      └─ Se renueva automáticamente                             ║
║      └─ Para uso ocasional                                      ║
║                                                                   ║
║   3️⃣ HACER UPGRADE DE PLAN                                      ║
║      └─ Más tokens por menos precio                             ║
║      └─ Upgrade instantáneo                                     ║
║      └─ Prorrateo del mes actual                                ║
║                                                                   ║
║   4️⃣ QUEDARTE EN PLAN FREE                                      ║
║      └─ POS completo sigue funcionando                           ║
║      └─ Solo features premium pausadas                           ║
║      └─ $0 MXN/mes                                              ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

### Cosas que SIGUEN FUNCIONANDO sin tokens:

```
┌─────────────────────────────────────────────────────────────┐
│ ✅ FUNCIONA PERFECTAMENTE SIN TOKENS                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CAJA/POS                                                   │
│  ├─ Registrar ventas                                        │
│  ├─ Cobrar en efectivo                                     │
│  ├─ Cobrar con tarjeta (físico)                           │
│  └─ Hacer descuentos                                       │
│                                                             │
│  INVENTARIO                                                │
│  ├─ Agregar productos                                      │
│  ├─ Actualizar stock                                       │
│  ├─ Ver productos                                          │
│  └─ Buscar por código de barras                            │
│                                                             │
│  EMPLEADOS                                                 │
│  ├─ Registrar entradas/salidas                            │
│  ├─ Ver horarios                                           │
│  └─ Manage turnos                                          │
│                                                             │
│  REPORTES                                                  │
│  ├─ Ventas del día                                        │
│  ├─ Corte de caja                                         │
│  └─ Reportes básicos (sin IA)                             │
│                                                             │
│  E-COMMERCE                                                │
│  ├─ Ver catálogo online                                   │
│  ├─ Gestionar órdenes                                     │
│  └─ Configurar tienda                                      │
│                                                             │
│  TIENDA ONLINE                                             │
│  └─ Seguir vendiendo 24/7                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Cosas que REQUIEREN tokens:

```
┌─────────────────────────────────────────────────────────────┐
│ 🔒 REQUIERE TOKENS                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  AI CHAT (Reisbloc Agent)                                 │
│  └─ "Dame ideas para incrementar ventas"                  │
│  └─ "Analiza mi inventario"                               │
│  └─ "Recomiéndame productos"                              │
│                                                             │
│  MARKETING AI                                             │
│  └─ Generar posts para redes sociales                     │
│  └─ Crear campañas publicitarias                           │
│                                                             │
│  INSIGHTS AVANZADOS                                       │
│  └─ Análisis profundo de métricas                         │
│  └─ Predicciones de ventas                                │
│  └─ Recomendaciones personalizadas                        │
│                                                             │
│  REPORTES PREMIUM                                          │
│  └─ PDF con diseño profesional                            │
│  └─ Análisis mensual con IA                               │
│                                                             │
│  EXPORTACIONES MASIVAS                                    │
│  └─ Exportar todo el inventario a Excel                  │
│  └─ Exportar historial completo                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 💡 Cómo Optimizar el Uso de Tokens

### Consejos para Negocio Inteligente

```
╔═══════════════════════════════════════════════════════════════════╗
║                   OPTIMIZA TUS TOKENS                           ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ✅ HAZ:                                                       ║
║  ─────────────────────────────────────────────────────────────    ║
║  1. Usa el chat para preguntas específicas                      ║
║     ❌ "Dame советы"                                          ║
║     ✅ "Cuáles 3 productos tienen menor rotación esta semana?" ║
║                                                                   ║
║  2. Planifica tu contenido de marketing                         ║
║     ✅ Genera 5 posts en una sesión                            ║
║     ❌ Un post cada día (desperdicio de contexto)              ║
║                                                                   ║
║  3. Usa el límite diario de 20 queries                          ║
║     ✅ Úsalo antes de pagar más                                ║
║     ✅ Se renueva cada 24 horas                                 ║
║                                                                   ║
║  4. Comparte tu plan con tu equipo                             ║
║     ✅ 1,500 tokens ÷ 5 empleados = 300/persona/mes            ║
║                                                                   ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ❌ NO HAGAS:                                                   ║
║  ─────────────────────────────────────────────────────────────    ║
║  1. No pidas lo mismo múltiples veces                          ║
║     ❌ "Análisis de ventas" x 5 veces                           ║
║                                                                   ║
║  2. No uses IA para cosas simples                               ║
║     ❌ "¿Cuánto es 2+2?"                                       ║
║     ✅ Pregunta solo cosas que requieran IA                      ║
║                                                                   ║
║  3. No generes contenido sin propósito                          ║
║     ❌ 50 posts de una vez                                      ║
║     ✅ Solo genera lo que vas a publicar                        ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## 📊 Estimación de Uso Real

### Ejemplo: Ferretería "El Clóset" (1,000 productos, 3 cajas)

```
╔═══════════════════════════════════════════════════════════════════╗
║             CASO REAL: FERRETERÍA EL CLÓSET                    ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  PERFIL:                                                        ║
║  • 1,000 productos                                             ║
║  • 5 empleados (3 cajas + gerente + bodeguero)                ║
║  • 50-100 ventas/día                                           ║
║  • Marketing activo en Instagram                               ║
║                                                                   ║
║  USO ESTIMADO DE AI (por mes):                                  ║
║  ─────────────────────────────────────────────────────────────    ║
║  • Reisbloc Agent: 30 sesiones × 5 preguntas = 150 tokens      ║
║  • Marketing: 20 posts (4/mes) = 100 tokens                    ║
║  • Insights: 10 análisis = 30 tokens                            ║
║  • Reportes: 4 premium = 40 tokens                              ║
║  ─────────────────────────────────────────────────────────────    ║
║  TOTAL: 320 tokens/mes                                         ║
║                                                                   ║
║  PLAN RECOMENDADO:                                              ║
║  ─────────────────────────────────────────────────────────────    ║
║  🎯 STARTER ($149/mes) - Sobrante de 1,180 tokens              ║
║                                                                   ║
║  ¿Y si necesita más?                                            ║
║  • Recarga Mini ($49) = 200 tokens extra                        ║
║  • Upgrade a Growth = 5,000 tokens ($399/mes)                  ║
║                                                                   ║
║  COSTO TOTAL ESTIMADO: $149 - $200 MXN/mes                     ║
║  EQUIVALENTE: Menos de $7 MXN/día                             ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

### Otro Ejemplo: Tienda de Ropa (200 productos)

```
╔═══════════════════════════════════════════════════════════════════╗
║             CASO: TIENDA DE ROPA "MODA FÁCIL"                 ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  PERFIL:                                                        ║
║  • 200 productos                                               ║
║  • 2 empleados                                                 ║
║  • 20-30 ventas/día                                            ║
║  • Marketing muy activo (diario)                               ║
║                                                                   ║
║  USO ESTIMADO DE AI (por mes):                                  ║
║  ─────────────────────────────────────────────────────────────    ║
║  • Reisbloc Agent: 15 sesiones x 3 preg = 45 tokens            ║
║  • Marketing: 60 posts (15/mes) = 300 tokens                   ║
║  • Insights: 5 análisis = 15 tokens                             ║
║  • Reportes: 2 premium = 20 tokens                              ║
║  ─────────────────────────────────────────────────────────────    ║
║  TOTAL: 380 tokens/mes                                         ║
║                                                                   ║
║  PLAN RECOMENDADO:                                              ║
║  ─────────────────────────────────────────────────────────────    ║
║  🎯 STARTER ($149/mes) - Apenas, considerar Growth             ║
║  o: STARTER + Mini Pack ($198/mes)                             ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## 🔒 Seguridad y Confianza

### Cómo Protegemos tu Inversión

```
┌─────────────────────────────────────────────────────────────┐
│                 SEGURIDAD DE TUS TOKENS                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔐 ENCRIPTACIÓN                                           │
│  ├─ Tokens almacenados encriptados                        │
│  └─ Acceso solo con credenciales válidas                   │
│                                                             │
│  📊 BITÁCORA                                               │
│  ├─ Cada uso de tokens queda registrado                    │
│  ├─ Puedes ver tu historial completo                        │
│  └─ Transparencia total                                     │
│                                                             │
│  ⚠️ ALERTAS                                                │
│  ├─ Notificación al 80% de tokens usados                   │
│  ├─ Notificación al 95% de tokens usados                   │
│  └─ Recordatorio de renovación                             │
│                                                             │
│  🔄 BACKUPS                                                │
│  ├─ Tus tokens respaldados diariamente                     │
│  └─ Recuperación ante desastres                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📞 ¿Preguntas?

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║  💬 CONTACTANOS                                                  ║
║                                                                   ║
║  Email: soporte@reisbloc.store                                   ║
║  WhatsApp: +52 55 XXXX XXXX                                     ║
║  Horario: Lun-Vie 9am-6pm (CDMX)                                ║
║                                                                   ║
║  También puedes preguntar en el chat de la app!                  ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

*Documento creado: Marzo 2026*  
*Versión: 1.0*  
*¿Viste algo incorrecto? Reporta a: legal@reisbloc.store*
