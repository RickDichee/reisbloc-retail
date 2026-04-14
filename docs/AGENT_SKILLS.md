# AGENT SKILLS: REISBLOC DEVELOPMENT OPTIMIZATION

## 🎯 Propósito
Este documento define las skills y estrategias para optimizar el uso de tokens y recursos cuando se trabaja con Reisbloc Store.

---

## 1. SKILLS DE OPTIMIZACIÓN DE TOKENS

### 1.1 Before Starting Analysis
```
✓ Verificar si ya existe revisión reciente (últimas 24h)
✓ Buscar archivos relevantes con grep antes de leer todo
✓ Usar glob patterns para encontrar archivos específicos
✓ Limitar reads a secciones relevantes (offset/limit)
```

### 1.2 Efficient File Operations
```
LECTURA:
- Nunca uses 'cat' para leer archivos → usar Read tool
- Limitar líneas con offset/limit cuando sea posible
- Usar grep para buscar en lugar de leer archivos completos

ESCRITURA:
- Solo crear archivos nuevos si es MUY necesario
- Preferir Edit tool sobre Write para cambios pequeños
- Verificar que el archivo existe antes de escribir
```

### 1.3 TypeScript Analysis
```
ANTES: tsc --noEmit en todo el proyecto (lento)
DESPUÉS: grep de errores específicos o revisar solo archivos modificados

NPM scripts del proyecto:
- npm run lint: ESLint
- npm run build: Build production
```

---

## 2. SKILLS DE DEBUGGING

### 2.1 Error Detection Priority
```
1. TypeScript Errors (bloquean compilación)
2. Import Errors (paths incorrectos)
3. Runtime Errors (undefined/null)
4. Logic Errors (comportamiento incorrecto)
5. Performance Issues (queries duplicadas, re-renders)
```

### 2.2 Debugging Workflow
```
PROBLEMA → SÍNTOMA → LOCALIZACIÓN → CAUSA → SOLUCIÓN

1. Identificar el error (mensaje exacto)
2. Buscar en archivos relacionados
3. Reproducir en contexto
4. Aplicar fix mínimo
5. Verificar con typecheck
```

### 2.3 Common Issues Checklist
```
□ Variables no definidas (devLog, supabase)
□ Hooks después de returns
□ Imports con paths incorrectos
□ Props que no existen en componentes
□ Tipos 'any' excesivos
□ Console.log en producción
□ Queries duplicadas a DB
```

---

## 3. SKILLS DE ARQUITECTURA

### 3.1 Service Layer Pattern
```
PATRÓN CORRECTO:
services/          → Lógica de negocio
  ├── supabaseService.ts    (única fuente de verdad para DB)
  ├── offlineStorage.ts     (IndexedDB wrapper)
  └── syncService.ts       (Background sync)

hooks/            → Estado + efectos
components/       → UI pura
store/            → Estado global (Zustand)
```

### 3.2 Query Optimization
```
MAL: Queries en cada componente
BIEN: Cachear en Zustand + fallback offline

EJEMPLO:
const products = useAppStore(s => s.products)
const setProducts = useAppStore(s => s.setProducts)

useEffect(() => {
  if (products.length === 0) {
    supabaseService.getAllProducts().then(setProducts)
  }
}, [])
```

### 3.3 Offline-First Pattern
```
1. Intentar fetch desde Supabase
2. Si falla, leer de IndexedDB
3. Guardar copia en IndexedDB para offline
4. Queue operaciones en sync_queue
5. Sync cuando vuelva internet
```

---

## 4. SKILLS DE SEGURIDAD

### 4.1 Secrets Management
```
✓ NUNCA hardcodear API keys
✓ Usar variables de entorno (.env)
✓ Verificar .gitignore incluye .env*
✓ No commitear credenciales
✓ Rotar keys periódicamente
```

### 4.2 Supabase Security
```
✓ RLS habilitado en todas las tablas
✓ Service Role Key solo en Edge Functions
✓ Anon Key para frontend (con RLS)
✓ Rate limiting en Edge Functions
✓ Validar auth antes de queries
```

---

## 5. SKILLS DE PERFORMANCE

### 5.1 React Optimization
```
✓ useMemo para cálculos pesados
✓ useCallback para callbacks en props
✓ React.memo para componentes puros
✓ Lazy loading para páginas
✓ Virtualización para listas largas
```

### 5.2 Bundle Optimization
```
✓ Dynamic imports: import('./Page') solo cuando se necesita
✓ Tree shaking de dependencias
✓ Eliminar dependencias no usadas
✓ Code splitting por ruta
```

---

## 6. SKILLS DE TRABAJO COLABORATIVO

### 6.1 Before Creating Files
```
PREGUNTAR:
- ¿Ya existe un archivo similar?
- ¿Puedo agregar a archivo existente?
- ¿Es realmente necesario un nuevo archivo?
- ¿Sigue la convención de nombres del proyecto?
```

### 6.2 Before Major Changes
```
1. Revisar archivo existente completo
2. Entender el patrón usado
3. Mantener estilo consistente
4. Agregar tests si es posible
5. Documentar cambios en PR
```

### 6.3 Code Review Checklist
```
□ Tipos correctos
□ Sin any innecesarios
□ Imports organizados
□ Sin console.log
□ Props tipadas
□ Error handling
□ Tests (si aplica)
```

---

## 7. PROMPTS OPTIMIZADOS

### 7.1 Para Análisis de Bugs
```
Analiza [archivo]:[línea] - describe el problema
y sugiere fix. No escribas código.
```

### 7.2 Para Fixes Simples
```
Corrige el error de TypeScript en [archivo]:[línea]
Constraints: [cualidades específicas]
```

### 7.3 Para Refactoring
```
Refactoriza [componente/servicio] siguiendo el patrón
de [componente de referencia]. Mantén la funcionalidad.
```

---

## 8. PROHIBIDO

```
❌ NO usar 'cd' para cambiar directorios
❌ NO usar cat/head/tail para leer archivos
❌ NO usar echo para escribir archivos
❌ NO crear archivos sin verificar que no existen
❌ NO hardcodear credenciales
❌ NO hacer console.log en producción
❌ NO ignorar errores de TypeScript
❌ NO comentar código sin necesidad
```

---

## 9. TOKENS ESTIMADOS POR TAREA

| Tarea | Tokens Aprox. |
|-------|---------------|
| Análisis rápido (grep/read) | 50-100 |
| Fix simple (1 archivo) | 200-400 |
| Fix medio (2-3 archivos) | 500-800 |
| Feature nueva pequeña | 1000-2000 |
| Refactoring grande | 3000-5000 |
| Revisión completa | 5000-10000 |

---

*Última actualización: Marzo 2026*
