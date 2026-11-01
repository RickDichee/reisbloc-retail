# GEMINI.md — Guía de Desarrollo para Agentes y Asistentes

Este archivo sirve como referencia principal de contexto técnico, arquitectónico y operativo para cualquier modelo, asistente o desarrollador que trabaje en el repositorio **`reisbloc-retail`**.

---

## 1. RESUMEN DEL PROYECTO

- **Nombre:** Reisbloc Retail POS & SaaS Multi-Tenant
- **Descripción:** Plataforma de Punto de Venta, inventario, reportes, proyecciones analíticas y catálogo en línea para comercios minoristas y mayoristas.
- **Modelo:** Base de código única (monolito frontend) que atiende a múltiples clientes (Moda Miel MX, Los Chunches de Cons, Juguetes San Judas Tadeo, y Reisbloc Store estándar) con personalización de identidad, temas, y funcionalidades aisladas.

---

## 2. STACK TECNOLÓGICO

- **Frontend Core:** React 19, TypeScript, Vite 8
- **Estilos:** Tailwind CSS 3 con variables CSS dinámicas (`globals.css`)
- **Estado Global:** Zustand (`src/store/appStore.ts`) con persistencia en `localStorage`
- **Backend / BaaS:** Supabase (PostgreSQL, Supabase Auth, Realtime, Storage, Edge Functions)
- **Librerías Clave:** `lucide-react` (iconos), `recharts` (gráficas), `jspdf` (impresión/tickets), `i18next` (internacionalización)
- **Deploy:** Vercel (múltiples proyectos y dominios apuntando a la misma base de código)

---

## 3. AMBIENTES Y BASES DE DATOS

| Ambiente | Proyecto Supabase ID | URL de Servicio | Regla de Oro |
|---|---|---|---|
| **DEV (Desarrollo)** | `jnyyaclrelqcqzjummwe` | `https://jnyyaclrelqcqzjummwe.supabase.co` | **Permitido:** Todas las pruebas, seeds, migraciones y altas de prueba. |
| **PROD (Producción)** | `nmovxyaibnixvxtepbod` | `https://nmovxyaibnixvxtepbod.supabase.co` | ⛔ **PROHIBIDO TOCAR DIRECTAMENTE:** Solo se actualiza tras aprobación explícita y merge a `main`. |

> 📌 **Nota sobre Hostnames:** Si el hostname contiene `store.reisbloc.com` o no contiene "dev", `src/config/supabase.ts` enrutará a PROD. Para pruebas locales siempre usar `localhost:5173`.

---

## 4. MULTI-TENANT Y BRANDING

### Aislamiento de Características (`src/config/tenantFeatures.ts`)
Toda funcionalidad que no sea universal para todos los clientes se controla mediante el archivo `src/config/tenantFeatures.ts`:
- **Filosofía:** *Deny-by-default* (todo flag es `false` salvo que se active explícitamente para el ID de organización del cliente).
- **Flags actuales:**
  - `unitCost`: Costo unitario privado (solo visible para `admin`).
  - `webReference`: Botón para búsqueda comparativa en MercadoLibre.
  - `packLabel`: Muestra "Pqte" en lugar de "Precio" (ej. Moda Miel).
  - `onlineStoreModule`: Habilita la tienda en línea y catálogo web.
  - `aiModules`: Activa los módulos de Marketing IA y Agente Copiloto.
- **Uso en componentes:**
  ```tsx
  import { tenantHasFeature } from '@/config/tenantFeatures'
  
  if (tenantHasFeature(currentUser?.organizationId, 'unitCost')) {
    // Renderizar funcionalidad
  }
  ```

### Temas y Variables CSS (`src/hooks/useTenantTheme.ts` & `src/styles/globals.css`)
- Cada cliente define su paleta de colores inyectada en `:root`:
  - `--primary`: Color principal de marca (botones de acción, badges, acentos activos).
  - `--primary-hover`: Color de hover en botones primarios.
  - `--bg-canvas`: Color de fondo de la aplicación.
  - `--bg-surface`: Fondo de tarjetas y contenedores blancos.
  - `--border-light`: Borde sutil característico de la marca.
- **Preview en desarrollo:** Es posible probar cualquier marca en `localhost` agregando el parámetro de consulta:
  - `?brand=modamiel`
  - `?brand=loschunches`
  - `?brand=juguetes`

---

## 5. ESTRUCTURA DE DIRECTORIOS

```
src/
├── components/          # Componentes reutilizables
│   ├── admin/           # Gestión de usuarios, productos, modales administrativos
│   ├── layout/          # DashboardLayout (Sidebar, Shell), NavBar
│   ├── pos/             # Componentes de Punto de Venta (Cart, ProductGrid, Tickets)
│   └── ui/              # Componentes visuales genéricos
├── config/              # Configuración central
│   ├── branding.ts      # Definición de marcas, logos, textos y detección
│   ├── supabase.ts      # Inicialización del cliente Supabase DEV vs PROD
│   └── tenantFeatures.ts# Matriz de feature flags por organización
├── hooks/               # Custom hooks (useTenantTheme, usePermissions, etc.)
├── pages/               # Vistas principales de la aplicación
│   ├── Analytics.tsx    # Métricas y proyecciones predictivas
│   ├── Inventory.tsx    # Catálogo de stock central
│   ├── POS.tsx          # Punto de Venta
│   └── Settings.tsx     # Configuración y preferencias del negocio
├── services/            # Servicios de API, Supabase, tickets y sincronización
├── store/               # Estado global Zustand (appStore.ts)
└── styles/              # globals.css con estilos base y temas por tenant
```

---

## 6. COMANDOS ÚTILES

```powershell
# Iniciar servidor de desarrollo local
npm run dev

# Compilar proyecto para producción (validación de TypeScript y bundle)
npm run build

# Despliegue de prueba a Vercel para un proyecto específico
vercel deploy --prod
```

---

## 7. PAUTAS Y CONVENCIONES DE CÓDIGO

1. **Sin regresiones en componentes compartidos:** Antes de editar [`src/components/layout/DashboardLayout.tsx`](file:///D:/proyectos/reisbloc-retail/src/components/layout/DashboardLayout.tsx) o [`src/pages/Inventory.tsx`](file:///D:/proyectos/reisbloc-retail/src/pages/Inventory.tsx), verificar que no se afecte la experiencia de otros tenants.
2. **Responsividad Móvil:** En dispositivos móviles, la barra de navegación inferior debe ocultarse en rutas críticas de pantalla completa como `/pos` para no obstaculizar los botones de cobro.
3. **Manejo de Encoding en Windows:** Al crear o editar archivos con PowerShell, utilizar siempre UTF-8 sin BOM para evitar errores de parseo JSON o caracteres especiales corrompidos.
4. **Preservación de Documentación:** Mantener siempre sincronizados [`SKILL.md`](file:///D:/proyectos/reisbloc-retail/SKILL.md) y [`AGENTS.md`](file:///D:/proyectos/reisbloc-retail/AGENTS.md) tras implementar cambios estructurales.
