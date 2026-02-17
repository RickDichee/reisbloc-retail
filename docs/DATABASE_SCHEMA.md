# 🗄️ Esquema de Base de Datos - Reisbloc POS (v3.2.1)

Este documento contiene la estructura SQL completa de la base de datos en Supabase para la versión Multi-Tenant.

> **Nota:** Este esquema incluye tablas, funciones de seguridad y políticas RLS.

## 1. Tablas Principales (Public Schema)

```sql
-- ORGANIZACIONES (Tenant Root)
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- USUARIOS (Vinculados a Organización)
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name character varying,
  username text,
  pin character varying, -- Unique constraint removed for multi-tenant future
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['admin', 'capitan', 'mesero', 'cocina', 'bar', 'supervisor'])),
  active boolean DEFAULT true,
  avatar_url text,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- DISPOSITIVOS (Seguridad Física)
CREATE TABLE public.devices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  user_id uuid REFERENCES public.users(id),
  mac_address character varying UNIQUE,
  device_name character varying,
  fingerprint text,
  status character varying DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_approved boolean DEFAULT false,
  last_access timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- PRODUCTOS
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  category text,
  price numeric DEFAULT 0,
  current_stock numeric DEFAULT 0,
  minimum_stock integer DEFAULT 0,
  has_inventory boolean DEFAULT true,
  available boolean DEFAULT true,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- ÓRDENES (Operación en Vivo)
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  table_number integer NOT NULL,
  waiter_id uuid REFERENCES public.users(id),
  status character varying DEFAULT 'pending',
  items jsonb NOT NULL,
  subtotal numeric NOT NULL,
  total numeric NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- VENTAS (Histórico Financiero)
CREATE TABLE public.sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  order_id uuid REFERENCES public.orders(id),
  waiter_id uuid REFERENCES public.users(id),
  table_number integer NOT NULL,
  total numeric NOT NULL,
  payment_method character varying NOT NULL,
  tip_amount numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- CIERRES DE CAJA
CREATE TABLE public.closings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  date date NOT NULL,
  closed_by uuid REFERENCES public.users(id),
  total_sales numeric DEFAULT 0,
  total_cash numeric DEFAULT 0,
  total_card numeric DEFAULT 0,
  total_digital numeric DEFAULT 0,
  total_tips numeric DEFAULT 0,
  status character varying DEFAULT 'closed',
  created_at timestamp with time zone DEFAULT now()
);

-- TURNOS Y CAJAS
CREATE TABLE public.shifts (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    user_id uuid REFERENCES public.users(id),
    start_time timestamp with time zone DEFAULT now(),
    end_time timestamp with time zone,
    opening_amount numeric DEFAULT 0,
    closing_amount numeric,
    expected_amount numeric,
    status text DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);

-- LOGS DE AUDITORÍA
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id),
  user_id uuid REFERENCES public.users(id),
  action character varying NOT NULL,
  table_name character varying,
  record_id character varying,
  changes jsonb,
  ip_address character varying,
  created_at timestamp with time zone DEFAULT now()
);
```

## 2. Funciones Críticas (Database Functions)

### Crear Nuevo Tenant (Onboarding)
```sql
CREATE OR REPLACE FUNCTION create_new_tenant(
  org_name text,
  admin_name text,
  admin_pin text
) RETURNS json AS $$
DECLARE
  new_org_id uuid;
  new_user_id uuid;
  new_slug text;
BEGIN
  new_org_id := gen_random_uuid();
  new_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  
  INSERT INTO organizations (id, name, slug, active)
  VALUES (new_org_id, org_name, new_slug, true);

  INSERT INTO users (name, username, pin, role, active, organization_id)
  VALUES (admin_name, admin_name, admin_pin, 'admin', true, new_org_id)
  RETURNING id INTO new_user_id;

  RETURN json_build_object(
    'mensaje', '✅ Negocio creado exitosamente',
    'organization_id', new_org_id,
    'admin_pin', admin_pin
  );
END;
$$ LANGUAGE plpgsql;
```

### Rate Limiting (Seguridad Login)
```sql
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_ip_address text,
  p_identifier text
) RETURNS jsonb AS $$
-- Lógica para limitar intentos de login fallidos
-- Retorna { allowed: boolean, blocked_until: timestamp }
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 3. Políticas de Seguridad (RLS)

Todas las tablas tienen RLS habilitado. La regla de oro es filtrar por `organization_id`.

### Ejemplo: Users
```sql
-- Ver usuarios: Solo de mi propia organización
CREATE POLICY "Org: Ver usuarios" ON users
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
);

-- Gestión: Solo Admins de la misma organización
CREATE POLICY "Org: Admin gestionar usuarios" ON users
FOR ALL TO authenticated
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
```

### Ejemplo: Orders/Sales
```sql
-- Lectura/Escritura restringida a la organización del usuario
CREATE POLICY "Org: Operación de órdenes" ON orders
FOR ALL TO authenticated
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
);
```