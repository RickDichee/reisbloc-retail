# 🗄️ Migración Firebase → Supabase

Plan completo de migración gradual de Firebase a Supabase para Reisbloc POS.

## 🎯 Objetivos

**¿Por qué Supabase?**
- ✅ **Open Source** - PostgreSQL en lugar de Firestore propietario
- ✅ **SQL** - Queries más potentes y flexibles
- ✅ **Más barato** - ~70% menos costo que Firebase en escala
- ✅ **Self-hosteable** - Control total de datos
- ✅ **Real-time incluido** - Sin costo extra
- ✅ **Row Level Security** - Seguridad nativa de PostgreSQL

## 📊 Comparativa

| Feature | Firebase | Supabase | Winner |
|---------|----------|----------|--------|
| **Database** | Firestore (NoSQL) | PostgreSQL (SQL) | Supabase |
| **Auth** | Firebase Auth | Supabase Auth (GoTrue) | Empate |
| **Storage** | Firebase Storage | Supabase Storage | Empate |
| **Functions** | Cloud Functions | Edge Functions (Deno) | Supabase |
| **Real-time** | $$ | Incluido | Supabase |
| **Costo** | $$$ | $ | Supabase |
| **Self-hosting** | ❌ | ✅ | Supabase |
| **Open Source** | ❌ | ✅ | Supabase |

## 🗺️ Plan de Migración (4 Fases)

### Fase 1: Setup & Configuración ✅
**Duración:** 1-2 días  
**Status:** COMPLETO

- [x] Instalar `@supabase/supabase-js`
- [x] Crear configuración en `src/config/supabase.ts`
- [x] Feature flags para migración gradual
- [x] Variables de entorno (.env.local)
- [ ] Crear proyecto en Supabase dashboard

**Variables de entorno necesarias:**
```bash
# .env.local
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui

# Feature flags (gradual migration)
VITE_SUPABASE_AUTH_ENABLED=false
VITE_SUPABASE_DB_ENABLED=false
VITE_SUPABASE_STORAGE_ENABLED=false
```

### Fase 2: Schema & Migración de Datos
**Duración:** 3-5 días  
**Status:** PENDIENTE

#### 2.1 Crear Schema PostgreSQL

```sql
-- Schema: public

-- Tabla: users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  pin VARCHAR(255) NOT NULL, -- hashed
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'waiter', 'cook', 'cashier')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: devices
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mac_address VARCHAR(17) NOT NULL UNIQUE,
  device_name VARCHAR(255),
  device_type VARCHAR(50),
  network_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  available BOOLEAN DEFAULT true,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number INTEGER NOT NULL,
  waiter_id UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'paid')),
  items JSONB NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tip_amount DECIMAL(10, 2) DEFAULT 0,
  tip_percentage INTEGER DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Tabla: sales (historial de ventas completadas)
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  waiter_id UUID REFERENCES users(id),
  table_number INTEGER NOT NULL,
  items JSONB NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tip_amount DECIMAL(10, 2) DEFAULT 0,
  tip_percentage INTEGER DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  device_id UUID REFERENCES devices(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  record_id UUID,
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_table ON orders(table_number);
CREATE INDEX idx_orders_waiter ON orders(waiter_id);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_sales_created ON sales(created_at DESC);
CREATE INDEX idx_sales_waiter ON sales(waiter_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 2.2 Row Level Security (RLS)

```sql
-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies para users
CREATE POLICY "Users are viewable by authenticated users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Policies para orders (todos los usuarios autenticados pueden ver)
CREATE POLICY "Orders are viewable by authenticated users"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Orders can be created by authenticated users"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Orders can be updated by authenticated users"
  ON orders FOR UPDATE
  TO authenticated
  USING (true);

-- Policies para products (público)
CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  TO authenticated, anon
  USING (available = true);

-- Policies para sales (solo lectura para auditoría)
CREATE POLICY "Sales are viewable by authenticated users"
  ON sales FOR SELECT
  TO authenticated
  USING (true);
```

#### 2.3 Script de Migración de Datos

```typescript
// scripts/migrate-firebase-to-supabase.ts
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'
import { createClient } from '@supabase/supabase-js'

const firebaseConfig = { /* tu config */ }
const supabaseUrl = 'https://tu-proyecto.supabase.co'
const supabaseKey = 'tu_service_role_key' // ⚠️ SERVICE ROLE, no anon key

const firebaseApp = initializeApp(firebaseConfig)
const firestore = getFirestore(firebaseApp)
const supabase = createClient(supabaseUrl, supabaseKey)

async function migrateCollection(collectionName: string) {
  console.log(`📦 Migrando ${collectionName}...`)
  
  const snapshot = await getDocs(collection(firestore, collectionName))
  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  
  const { error } = await supabase
    .from(collectionName)
    .upsert(data)
  
  if (error) {
    console.error(`❌ Error en ${collectionName}:`, error)
  } else {
    console.log(`✅ ${collectionName}: ${data.length} registros migrados`)
  }
}

async function migrate() {
  await migrateCollection('users')
  await migrateCollection('devices')
  await migrateCollection('products')
  await migrateCollection('orders')
  await migrateCollection('sales')
  console.log('✅ Migración completa')
}

migrate()
```

### Fase 3: Crear Servicios Adaptadores
**Duración:** 2-3 días  
**Status:** EN PROGRESO

Crear capa de abstracción que use Firebase O Supabase según feature flags:

```typescript
// src/services/databaseService.ts
import { SUPABASE_FEATURES } from '@/config/supabase'
import firebaseService from './firebaseService'
import supabaseService from './supabaseService'

export const databaseService = {
  async getOrders() {
    if (SUPABASE_FEATURES.DATABASE_ENABLED) {
      return await supabaseService.getOrders()
    }
    return await firebaseService.getOrders()
  },
  
  async addOrder(order: any) {
    if (SUPABASE_FEATURES.DATABASE_ENABLED) {
      return await supabaseService.addOrder(order)
    }
    return await firebaseService.addOrder(order)
  },
  
  // ... más métodos
}
```

### Fase 4: Testing & Rollout
**Duración:** 3-5 días  
**Status:** PENDIENTE

1. **Testing paralelo** - Firebase y Supabase funcionan simultáneamente
2. **Comparar resultados** - Verificar que ambos dan mismos datos
3. **Gradual rollout** - Activar feature flags por módulo:
   - Auth primero (más simple)
   - Database después (más complejo)
   - Storage último
4. **Monitoreo** - Verificar performance y errores
5. **Desactivar Firebase** - Cuando todo esté 100% migrado

## 🔧 Setup Inicial

### 1. Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crear nueva organización: `Reisbloc Lab`
3. Crear nuevo proyecto: `reisbloc-pos`
4. Región: `South America (São Paulo)` (más cercano a México)
5. Database password: [GUARDAR EN LUGAR SEGURO]

### 2. Configurar Variables de Entorno

```bash
# Copiar template
cp .env.example .env.local

# Agregar credenciales de Supabase
echo "VITE_SUPABASE_URL=https://tu-proyecto.supabase.co" >> .env.local
echo "VITE_SUPABASE_ANON_KEY=tu_anon_key" >> .env.local

# Feature flags (inicialmente false)
echo "VITE_SUPABASE_AUTH_ENABLED=false" >> .env.local
echo "VITE_SUPABASE_DB_ENABLED=false" >> .env.local
echo "VITE_SUPABASE_STORAGE_ENABLED=false" >> .env.local
```

### 3. Ejecutar Schema

1. Supabase Dashboard → SQL Editor
2. Copiar schema SQL de arriba
3. Run → Verificar tablas creadas

### 4. Migrar Datos

```bash
# Ejecutar script de migración
npm run migrate:supabase
```

## 📝 Checklist de Migración

- [ ] Crear proyecto Supabase
- [ ] Ejecutar schema SQL
- [ ] Configurar RLS policies
- [ ] Migrar datos de Firebase
- [ ] Verificar datos migrados
- [ ] Crear servicio adaptador
- [ ] Testing paralelo (Firebase + Supabase)
- [ ] Activar feature flag: AUTH
- [ ] Testing exhaustivo auth
- [ ] Activar feature flag: DATABASE
- [ ] Testing exhaustivo database
- [ ] Activar feature flag: STORAGE
- [ ] Testing exhaustivo storage
- [ ] Monitoreo 7 días
- [ ] Desactivar Firebase
- [ ] Eliminar código legacy de Firebase
- [ ] Celebration! 🎉

## 🚨 Rollback Plan

Si algo falla:

```bash
# Desactivar Supabase
VITE_SUPABASE_AUTH_ENABLED=false
VITE_SUPABASE_DB_ENABLED=false
VITE_SUPABASE_STORAGE_ENABLED=false

# La app volverá a Firebase automáticamente
```

## 📊 Comparativa de Costos

### Firebase (100 restaurantes activos)

```
Firestore Reads:  10M/mes × $0.06/100K  = $6.00
Firestore Writes:  2M/mes × $0.18/100K  = $3.60
Functions:     1M invocaciones × $0.40  = $0.40
Storage:              10GB × $0.026/GB  = $0.26
Auth:                      Incluido      = $0.00
                                   TOTAL = $10.26/mes
```

### Supabase (100 restaurantes activos)

```
Database:           Incluido (2GB)      = $0.00
Auth:                      Incluido      = $0.00
Storage:                   Incluido      = $0.00
Edge Functions:            Incluido      = $0.00
                           Plan Pro      = $25/mes
                                   TOTAL = $25/mes
```

**Pero con escala:**

- 1,000 restaurantes → Firebase: ~$102/mes vs Supabase: $25/mes
- 10,000 restaurantes → Firebase: ~$1,020/mes vs Supabase: $25/mes (o $99 Team)

**Winner:** Supabase (70-90% más barato en escala)

## 🔗 Referencias

- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase + React](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)
- [Migrating from Firebase](https://supabase.com/docs/guides/migrations/firebase)

