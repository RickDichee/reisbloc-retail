# 🎨 Componentes - Reisbloc POS

## Estructura de Componentes

```
src/components/
├── auth/                    # Componentes de autenticación
│   ├── LoginPin.tsx         # Entrada de PIN con teclado numérico
│   ├── DeviceVerification.tsx  # Pantalla de espera para aprobación
│   └── index.ts             # Exports
├── pos/                     # Componentes del punto de venta
│   ├── OrderPanel.tsx       # Panel de gestión de órdenes
│   ├── CartSummary.tsx      # Resumen del carrito
│   ├── ProductGrid.tsx      # Grid de productos
│   └── index.ts
├── admin/                   # Panel de administración
│   ├── DeviceApprovalPanel.tsx  # Aprobación de dispositivos
│   ├── UserManager.tsx      # Gestión de usuarios
│   ├── ProductManager.tsx   # Gestión de productos
│   └── index.ts
└── common/                  # Componentes compartidos
    ├── Header.tsx           # Encabezado
    ├── Navigation.tsx       # Navegación
    └── index.ts
```

## Componentes Implementados

### 1. LoginPin
**Archivo**: [src/components/auth/LoginPin.tsx](../src/components/auth/LoginPin.tsx)

**Propósito**: Interfaz de login segura con entrada de PIN

**Características**:
- Entrada de PIN de 4-6 dígitos numéricos
- Teclado numérico integrado
- Validación en tiempo real
- Mostrar/ocultar contraseña
- Detección automática de dispositivo
- Manejo de errores
- Feedback visual durante validación

**Props**: Ninguna (usa hooks)

**Hooks Usados**:
- `useAuth()` - Para login y manejo de autenticación
- `useNavigate()` - Para redirección post-login

**Estilos**: Tailwind CSS con degradado azul, sombras y animaciones

**Ejemplo de Uso**:
```tsx
import { LoginPin } from '@/components/auth/LoginPin'

function App() {
  return <LoginPin />
}
```

### 2. DeviceVerification
**Archivo**: [src/components/auth/DeviceVerification.tsx](../src/components/auth/DeviceVerification.tsx)

**Propósito**: Pantalla de espera mientras un administrador aprueba el dispositivo

**Características**:
- Muestra información del dispositivo
- Reintentos automáticos cada 5 segundos
- Contador de intentos y tiempo esperando
- Botón para reintentar manualmente
- Instrucciones para administradores
- Estados: pending, approved, error

**Props**:
```tsx
interface DeviceVerificationProps {
  onDeviceApproved?: () => void    // Callback cuando se aprueba
  autoRetry?: boolean              // Reintentos automáticos (default: true)
  retryInterval?: number           // Intervalo en ms (default: 5000)
}
```

**Hooks Usados**:
- `useAppStore()` - Para acceder a currentDevice y currentUser

**Ejemplo de Uso**:
```tsx
import { DeviceVerification } from '@/components/auth/DeviceVerification'

function AuthFlow() {
  const handleApproved = () => {
    navigate('/pos')
  }
  
  return (
    <DeviceVerification 
      onDeviceApproved={handleApproved}
      autoRetry={true}
      retryInterval={3000}
    />
  )
}
```

### 3. DeviceApprovalPanel
**Archivo**: [src/components/admin/DeviceApprovalPanel.tsx](../src/components/admin/DeviceApprovalPanel.tsx)

**Propósito**: Panel de administrador para gestionar la aprobación de dispositivos

**Características**:
- Lista de todos los dispositivos
- Filtrado por estado (pending, approved, rejected, all)
- Estadísticas de dispositivos
- Vista expandible de detalles
- Botones para aprobar/revocar
- Información detallada de cada dispositivo
- Indicadores visuales de estado

**Props**: Ninguna

**Hooks Usados**:
- `firebaseService` - Para CRUD de dispositivos
- Estado local con useState

**Ejemplo de Uso**:
```tsx
import { DeviceApprovalPanel } from '@/components/admin/DeviceApprovalPanel'

function AdminPanel() {
  return (
    <div className="p-6">
      <DeviceApprovalPanel />
    </div>
  )
}
```

## Componentes Próximos a Implementar

### src/components/pos/
- **OrderPanel.tsx** - Gestión de productos en el pedido
- **CartSummary.tsx** - Resumen del carrito con totales
- **ProductGrid.tsx** - Grid de productos con stock

### src/components/admin/
- **UserManager.tsx** - CRUD de usuarios
- **ProductManager.tsx** - CRUD de productos
- **InventoryManager.tsx** - Gestión de inventario

### src/components/common/
- **Header.tsx** - Encabezado con usuario y opciones
- **Navigation.tsx** - Navegación según rol

## Patrones de Componentes

### Estructura Base
```tsx
import React from 'react'
import { SomeIcon } from 'lucide-react'

/**
 * ComponentName
 * 
 * Breve descripción del componente
 * - Característica 1
 * - Característica 2
 */

interface ComponentProps {
  prop1: string
  prop2?: boolean
}

export const ComponentName: React.FC<ComponentProps> = ({
  prop1,
  prop2 = false,
}) => {
  // Implementación
  return <div>Component</div>
}

export default ComponentName
```

### Manejo de Estados
- Usar `useState` para estado local
- Usar `useAppStore` para estado global
- Mantener estado de UI separado del estado de datos

### Manejo de Errores
```tsx
const [error, setError] = useState('')

// Mostrar error
{error && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <p className="text-red-700">{error}</p>
  </div>
)}
```

### Loading States
```tsx
{isLoading && (
  <div className="flex items-center justify-center">
    <Loader className="animate-spin" />
    <span className="ml-2">Cargando...</span>
  </div>
)}
```

## Iconos Disponibles
Usando **lucide-react**:
```tsx
import {
  Lock,           // Para login/seguridad
  CheckCircle,    // Para estados aprobados
  AlertCircle,    // Para errores/alertas
  Smartphone,     // Para dispositivos
  Loader,         // Para loading
  Plus,           // Para agregar
  Trash2,         // Para eliminar
  Edit,           // Para editar
  Eye,            // Para ver detalles
  ChevronDown,    // Para expandir
} from 'lucide-react'
```

## Testing de Componentes

### Ejecutar en desarrollo
```bash
npm run dev
# Ver en http://localhost:5173
```

### Verificar tipos
```bash
npx tsc --noEmit
```

### Lint
```bash
npm run lint
```

## Checklist de Componente Nuevo

- [ ] Crear archivo en carpeta apropiada
- [ ] Definir interfaz de props (si aplica)
- [ ] Añadir comentario JSDoc
- [ ] Usar TypeScript strict
- [ ] Importar iconos de lucide-react
- [ ] Aplicar Tailwind CSS
- [ ] Manejar estados de loading/error
- [ ] Exportar con `export const` y `export default`
- [ ] Probar en desarrollo
- [ ] Actualizar este README si es necesario

## Convenciones

### Nombres
- Componentes: PascalCase (LoginPin, DeviceVerification)
- Funciones: camelCase (handleLogin, loadDevices)
- Constantes: UPPER_SNAKE_CASE (DEFAULT_TIMEOUT)
- Props interfaces: ComponentNameProps

### Estilos
- Usar Tailwind classes
- Responsive: mobile-first
- Temas: gradientes azules/grises
- Espaciado: gap-4, p-6, etc.

### Documentación
- JSDoc comentarios en componentes
- Explicar props complejos
- Ejemplos de uso cuando sea aplicable

---

**Última actualización**: 21 de enero de 2026
