# 🚨 SISTEMA DE ALERTAS Y MÉTRICAS

## Propósito

Monitorear el crecimiento de Reisbloc y alertarte cuando llegues a umbrales que requieren acción.

---

## 📊 Dashboard de Métricas (Admin)

Voy a crear un panel en el Admin que muestra:

```
┌─────────────────────────────────────────────────────────────┐
│  📊 REISBLOC ANALYTICS - Status: ✅ SALUDABLE            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👥 ORGANIZACIONES                                         │
│  ├─ Total: 47 / 50 ⚠️                                     │
│  ├─ Activas: 42                                           │
│  ├─ Inactivas: 5 (sin uso en 30 días)                   │
│  └─ [Ver detalle]                                         │
│                                                             │
│  💰 REVENUE                                                │
│  ├─ Paying: 8 organizaciones                              │
│  ├─ MRR: $1,196 MXN                                       │
│  ├─ ARPU: $149 MXN                                        │
│  └─ [Ver breakdown]                                        │
│                                                             │
│  🔐 LÍMITES DE COSTOS                                      │
│  ├─ Supabase: $23 / $25 ⚠️ (92%)                         │
│  ├─ Storage: 850MB / 1GB                                 │
│  ├─ DB: 450MB / 500MB                                     │
│  └─ [Configurar alertas]                                   │
│                                                             │
│  🤖 AI USAGE                                               │
│  ├─ Queries hoy: 234                                       │
│  ├─ Queries mes: 4,521                                    │
│  └─ Costo estimado: $226 MXN                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Umbrales de Alerta

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                         UMbrales de Alerta                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  🔴 CRÍTICO (Actúa AHORA)                                              ║
║  ─────────────────────────────────────────────────────────────────    ║
║  • Organizaciones: 50 (límite free tier)                               ║
║  • Supabase: >$25/mes (excediste free tier)                         ║
║  • Storage: >1GB                                                     ║
║  • DB: >500MB                                                        ║
║                                                                           ║
║  → ACCIÓN: Plan de monetización obligatorio                           ║
║                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  🟠 WARNING (Prepárate)                                               ║
║  ─────────────────────────────────────────────────────────────────    ║
║  • Organizaciones: 40-49 (80-99% del límite)                         ║
║  • Supabase: $20-25/mes (80-100%)                                    ║
║  • Storage: 800MB-1GB (80-100%)                                      ║
║  • DB: 400-500MB (80-100%)                                          ║
║                                                                           ║
║  → ACCIÓN: Evaluar transición a plan pago + iniciar outreach          ║
║                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  🟡 NOTICE (Monitorea)                                                ║
║  ─────────────────────────────────────────────────────────────────    ║
║  • Organizaciones: 30-39 (60-79%)                                    ║
║  • Paying customers: <5                                               ║
║  • Conversion rate: <10%                                              ║
║                                                                           ║
║  → ACCIÓN: Revisar funnel de conversión                               ║
║                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  ✅ SALUDABLE (Todo bien)                                             ║
║  ─────────────────────────────────────────────────────────────────    ║
║  • Organizaciones: <30                                                ║
║  • Costs: <80% de free tier                                         ║
║  • Conversion: >10%                                                   ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## 📧 Canales de Alerta

### Configuración de Notificaciones

```
ALERTAS POR EMAIL:
┌─────────────────────────────────────────────────────────────┐
│ Email: tu@email.com                                        │
│                                                             │
│ [✓] Alertas críticas (inmediato)                         │
│ [✓] Reporte semanal (cada lunes 9am)                     │
│ [✓] Reporte mensual (1er día)                            │
│                                                             │
│ FRECUENCIA DE REPORTES:                                    │
│ ○ Diario                                                   │
│ ○ Semanal (recomendado)                                  │
│ ○ Mensual                                                 │
└─────────────────────────────────────────────────────────────┘

ALERTAS ADICIONALES:
[✓] WhatsApp (para alertas críticas)
[ ] Slack (webhook)
[ ] Discord (webhook)
[ ] SMS (para emergencia)
```

### Plantilla de Email de Alerta

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ASUNTO: 🚨 [REISBLOC] Alerta: Organizaciones cerca del límite

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hola,

Esta es una alerta automática de tu dashboard de Reisbloc.

╔════════════════════════════════════════════════════╗
║  ⚠️ ALERTA: 45/50 organizaciones (90%)         ║
╚════════════════════════════════════════════════════╝

Resumen:
• Organizaciones activas: 45
• Límite free tier: 50
• Ocupación: 90%

ACCIONES RECOMENDADAS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. [ ] Revisar conversión de usuarios free → paid
2. [ ] Contactar usuarios inactivos para reactivarlos
3. [ ] Preparar comunicación de upgrade obligatorio
4. [ ] Evaluar costo-beneficio de plan Supabase Pro

PRÓXIMOS PASOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cuando llegues a 50:
→ Nuevo registro: Mostrar paywall
→ Usuarios existentes: Continúan gratis
→ Activar trial de 7 días para nuevos features

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dashboard: https://reisbloc.store/admin/analytics
Configurar alertas: https://reisbloc.store/admin/alerts

Este email fue enviado automáticamente.
¿Demasiados emails? Ajusta tu configuración en el dashboard.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📋 Plan de Respuesta por Escenario

### ESCENARIO 1: Llegando a 50 organizaciones

```
╔═══════════════════════════════════════════════════════════════════════════╗
║              ACCIÓN: 50 ORGANIZACIONES (LÍMITE FREE)              ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  DÍA 0 (Alerta crítica):                                               ║
║  ─────────────────────────────────────────────────────────────────    ║
║  □ Enviar email a todos los admins explicando situación                  ║
║  □ Revisar: ¿Cuántos son paying?                                      ║
║  □ Calcular: ¿Es suficiente el revenue para Supabase Pro?              ║
║                                                                           ║
║  DÍA 1-7:                                                            ║
║  ─────────────────────────────────────────────────────────────────    ║
║  □ Contactar TOP 10 organizaciones (las más activas)                   ║
║  □ Ofrecer: 1 mes gratis de Starter si upgrade hoy                     ║
║  □ Enviar email masivo a todas las orgs:                              ║
║    "Reisbloc está creciendo. Ayúdanos a seguir siendo gratis."        ║
║                                                                           ║
║  DÍA 7-14:                                                          ║
║  ─────────────────────────────────────────────────────────────────    ║
║  □ Si <5 paying: Implementar trial de 30 días para features premium    ║
║  □ Lanzar campaña: "Invite 3 amigos = 1 mes gratis"                   ║
║  □ Evaluar: ¿Hacemos waitlist?                                       ║
║                                                                           ║
║  DÍA 14+:                                                            ║
║  ─────────────────────────────────────────────────────────────────    ║
║  □ Si <10 paying: Nueva orgs ven paywall con upgrade                  ║
║  □ Org existentes: Continúan con acceso completo                      ║
║  □ Nota: NO cobrar retroactivo, solo nuevos registros                 ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### ESCENARIO 2: Costo Supabase > $25/mes

```
╔═══════════════════════════════════════════════════════════════════════════╗
║              ACCIÓN: COSTOS SUPABASE EXCEDEN FREE TIER               ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  INMEDIATO:                                                            ║
║  ─────────────────────────────────────────────────────────────────    ║
║  □ Calcular costo real por organización                                ║
║  □ Identificar: ¿Storage, DB, o MAU?                                 ║
║  □ Si Storage: Revisar optimización de imágenes (compress)              ║
║  □ Si DB: ¿Hay queries muy pesadas? (optimizar índices)                ║
║                                                                           ║
║  0-30 DÍAS:                                                          ║
║  ─────────────────────────────────────────────────────────────────    ║
║  □ Añadir costos de Supabase Pro a tu modelo                           ║
║  □ Subir precio Starter: $149 → $199/mes (cubrir costo + margen)      ║
║  □ Launch: Paquetes de tokens con más valor                            ║
║  □ Email a paying customers: "Precio especial de lanzamiento"          ║
║                                                                           ║
║  30+ DÍAS:                                                           ║
║  ─────────────────────────────────────────────────────────────────    ║
║  □ Si revenue < costo: Considerar pausa de nuevos registros             ║
║  □ Evaluar: ¿Marketplace de templates?                                 ║
║  □ Evaluar: ¿Integraciones pagadas?                                   ║
║  □ Evaluar: ¿Freemium con ads?                                        ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### ESCENARIO 3: Conversion < 10%

```
╔═══════════════════════════════════════════════════════════════════════════╗
║              ACCIÓN: CONVERSIÓN BAJA (<10%)                          ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  SEMANA 1-2:                                                          ║
║  ─────────────────────────────────────────────────────────────────    ║
║  □ Hablar con 5 usuarios free que NO han upgraded                      ║
║  □ Preguntar: ¿Qué falta para que paguen?                            ║
║  □ Revisar: ¿Los límites son muy generosos?                           ║
║  □ Revisar: ¿El onboarding explica bien los beneficios?               ║
║                                                                           ║
║  SEMANA 2-4:                                                          ║
║  ─────────────────────────────────────────────────────────────────    ║
║  □ Ajustar límites: 100 productos → 50 productos (más dolor)          ║
║  □ Añadir feature exclusivo: Reportes avanzados SOLO para paid         ║
║  □ Test A/B: "Upgrade" vs "Hazte Premium"                            ║
║  □ Crear: Video de 2 min mostrando valor de features paid             ║
║                                                                           ║
║  MES 2+:                                                              ║
║  ─────────────────────────────────────────────────────────────────    ║
║  □ Si sigue bajo: Reducir límite de productos a 30                    ║
║  □ Si sigue bajo: Versión free SOLO para 1 usuario (no multi-device) ║
║  □ Última opción: Cobrar $49/mes versión free (cubre costos)          ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## 🔧 Implementación Técnica

### Edge Function: metrics-collector

```typescript
// supabase/functions/metrics-collector/index.ts

const DAY = 60 * 60 * 24;

async function collectAndAlert() {
    const metrics = await getMetrics();
    
    const alerts = [];
    
    // Check organizations
    if (metrics.totalOrgs >= 40) {
        alerts.push({
            level: metrics.totalOrgs >= 50 ? 'critical' : 'warning',
            metric: 'organizations',
            value: metrics.totalOrgs,
            limit: 50,
            percentage: (metrics.totalOrgs / 50) * 100
        });
    }
    
    // Check Supabase costs
    if (metrics.supabaseCost >= 20) {
        alerts.push({
            level: metrics.supabaseCost >= 25 ? 'critical' : 'warning',
            metric: 'supabase_cost',
            value: metrics.supabaseCost,
            limit: 25
        });
    }
    
    // Check paying customers
    if (metrics.payingCustomers < 5 && metrics.totalOrgs > 20) {
        alerts.push({
            level: 'warning',
            metric: 'conversion',
            value: metrics.conversionRate,
            message: 'Conversión muy baja'
        });
    }
    
    // Send alerts
    for (const alert of alerts) {
        await sendAlert(alert);
    }
    
    return { alerts, metrics };
}

// Run every hour
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }
    
    // Called by cron every hour
    const { alerts, metrics } = await collectAndAlert();
    
    return Response.json({ success: true, alerts, metrics });
});
```

### Cron Job Configuration

```json
// supabase/functions/metrics-collector/_schema.yaml
version: 2
functions:
  metrics-collector:
    verify_jwt: false
    schedule: "0 * * * *"  // Every hour
```

---

## 📱 Notificaciones Móviles

### Configuración WhatsApp (Opcional)

```
Para alertas críticas instantáneas:

1. Configura Twilio o Meta Business API
2. Conecta número de WhatsApp business
3. Recibe alertas tipo:

┌─────────────────────────────────────────────────────┐
│  🤖 REISBLOC ALERT                                │
│                                                     │
│  ⚠️ CRÍTICO                                      │
│                                                     │
│  Organizaciones: 49/50 (98%)                      │
│  Paying: 3                                          │
│                                                     │
│  Acción requerida: Revisar dashboard               │
│  Link: reisbloc.store/admin/analytics              │
│                                                     │
│  Respondiste STOP para cancelar                    │
└─────────────────────────────────────────────────────┘
```

---

## 📈 Reportes Automatizados

### Reporte Semanal (Cada Lunes)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 REPORTE SEMANAL REISBLOC
Semana: 10-16 Marzo 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 CRECIMIENTO
├─ Organizaciones: 42 → 47 (+5 esta semana)
├─ Organizaciones activas: 38 → 42
└─ Crecimiento semanal: +12%

💰 REVENUE
├─ Paying customers: 7 → 8
├─ MRR: $1,046 → $1,196 MXN
└─ ARPU: $149 MXN

🎯 CONVERSIÓN
├─ Tasa: 17% (meta: 20%)
├─ Mejor canal: Referencias
└─ Peor canal: Redes sociales

⚠️ ALERTAS
├─ [WARNING] Organizaciones: 47/50 (94%)
├─ [NOTICE] Storage: 850MB/1GB (85%)
└─ [OK] DB: 450MB/500MB (90%)

📅 PRÓXIMA SEMANA
├─ [ ] Contactar 5 orgs inactivas
├─ [ ] Preparar campaña de conversión
└─ [ ] Revisar onboarding

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ✅ Checklist de Monitoreo

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    CHECKLIST SEMANAL DE MONITOREO                   ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  LUNES                                                             ║
║  ─────────────────────────────────────────────────────────────────    ║
║  □ Revisar reporte semanal automático                                 ║
║  □ Identificar alertas pendientes                                    ║
║  □ Definir acciones de la semana                                     ║
║                                                                           ║
║  MIÉRCOLES                                                         ║
║  ─────────────────────────────────────────────────────────────────    ║
║  □ Revisar métricas en dashboard                                     ║
║  □ Contactar 2-3 usuarios con problemas                              ║
║  □ Evaluar progreso de conversión                                    ║
║                                                                           ║
║  VIERNES                                                           ║
║  ─────────────────────────────────────────────────────────────────    ║
║  □ Preparar comunicaciones de fin de semana                         ║
║  □ Revisar feedback de usuarios                                     ║
║  □ Planificar acciones para próxima semana                          ║
║                                                                           ║
║  MENSUAL                                                           ║
║  ─────────────────────────────────────────────────────────────────    ║
║  □ Revisar reporte mensual completo                                 ║
║  □ Evaluar: ¿Modelo de negocio sostenible?                         ║
║  □ Ajustar estrategia si es necesario                               ║
║  □ Preparar investor update (si aplica)                             ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## 🎯 Métricas Clave (KPIs)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                         KPIs DE REISBLOC                             ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  GROWTH                                                           ║
║  ├─ MAU (Monthly Active Users): Meta > 10% growth/mo              ║
║  ├─ NRR (New Registration Rate): Meta > 20 orgs/mes               ║
║  └─ Churn: Meta < 5% mensual                                       ║
║                                                                           ║
║  REVENUE                                                          ║
║  ├─ MRR (Monthly Recurring Revenue): Meta $1,000+/mes              ║
║  ├─ ARPU: Meta > $150 MXN                                         ║
║  └─ LTV: Meta > $1,800 (12 meses × ARPU)                          ║
║                                                                           ║
║  EFFICIENCY                                                       ║
║  ├─ CAC: Meta < $500 MXN                                          ║
║  ├─ LTV/CAC: Meta > 3                                            ║
║  └─ Payback Period: Meta < 4 meses                                 ║
║                                                                           ║
║  PRODUCT                                                           ║
║  ├─ NPS: Meta > 50                                                ║
║  ├─ DAU/MAU: Meta > 0.3                                           ║
║  └─ Feature Adoption: > 60% usan AI features                       ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

*Documento creado: Marzo 2026*
*Versión: 1.0*
