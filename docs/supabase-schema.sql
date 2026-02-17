-- Reisbloc POS - Supabase Schema
-- PostgreSQL SQL - Sin marcadores Markdown
-- Copiar y pegar TODO esto directamente en Supabase SQL Editor

-- ============================================
-- 1. CREAR TABLAS
-- ============================================

-- Tabla: users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  pin VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'capitan', 'mesero', 'cocina', 'bar', 'supervisor')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: devices
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  mac_address VARCHAR(17) NOT NULL UNIQUE,
  device_name VARCHAR(255),
  device_type VARCHAR(50),
  network VARCHAR(50),
  network_type VARCHAR(50),
  os VARCHAR(100),
  browser VARCHAR(100),
  fingerprint TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_access TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: products
CREATE TABLE IF NOT EXISTS products (
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
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number INTEGER NOT NULL,
  waiter_id UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending' CHECK (
    status IN ('pending', 'sent', 'preparing', 'ready', 'served', 'completed', 'cancelled', 'paid', 'open')
  ),
  items JSONB NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tip_amount DECIMAL(10, 2) DEFAULT 0,
  tip_percentage INTEGER DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_to_kitchen_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Tabla: sales (historial de ventas completadas)
CREATE TABLE IF NOT EXISTS sales (
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
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  record_id VARCHAR(255),
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title VARCHAR(150) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'info',
  priority VARCHAR(10) DEFAULT 'normal',
  read BOOLEAN DEFAULT false,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  closed_by UUID REFERENCES users(id),
  total_sales DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_cash DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_card DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_digital DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_tips DECIMAL(10,2) NOT NULL DEFAULT 0,
  orders_count INTEGER NOT NULL DEFAULT 0,
  sales_count INTEGER NOT NULL DEFAULT 0,
  employee_metrics JSONB,
  payment_methods JSONB,
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  closed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. CREAR ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_number);
CREATE INDEX IF NOT EXISTS idx_orders_waiter ON orders(waiter_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_waiter ON sales(waiter_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_closings_date ON closings(date DESC);
CREATE INDEX IF NOT EXISTS idx_closings_closed_by ON closings(closed_by);

-- ============================================
-- 3. CREAR TRIGGERS PARA updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. HABILITAR ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREAR RLS POLICIES
-- ============================================

-- Policies para users
DROP POLICY IF EXISTS "Users are viewable by authenticated users" ON users;
CREATE POLICY "Users are viewable by authenticated users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- ⚠️ IMPORTANTE: Policy para permitir login con PIN (usuarios anónimos)
DROP POLICY IF EXISTS "Users are viewable for login" ON users;
CREATE POLICY "Users are viewable for login"
  ON users FOR SELECT
  TO anon
  USING (active = true);

DROP POLICY IF EXISTS "Users can update their own data" ON users;
CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Admins can insert users" ON users;
CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete users" ON users;
CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated, anon
  USING (true);

-- Policies para devices
DROP POLICY IF EXISTS "Devices are viewable by authenticated users" ON devices;
CREATE POLICY "Devices are viewable by authenticated users"
  ON devices FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Devices are viewable by anon for registration" ON devices;
CREATE POLICY "Devices are viewable by anon for registration"
  ON devices FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Users can insert devices" ON devices;
CREATE POLICY "Users can insert devices"
  ON devices FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update devices" ON devices;
CREATE POLICY "Users can update devices"
  ON devices FOR UPDATE
  TO authenticated, anon
  USING (true);

-- Policies para products
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  TO authenticated, anon
  USING (available = true);

DROP POLICY IF EXISTS "Admins can insert products" ON products;
CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update products" ON products;
CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Admins can delete products" ON products;
CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Admins can insert products" ON products;
CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update products" ON products;
CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Admins can delete products" ON products;
CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  TO authenticated, anon
  USING (true);

-- Policies para orders
DROP POLICY IF EXISTS "Orders are viewable by authenticated users" ON orders;
CREATE POLICY "Orders are viewable by authenticated users"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update orders" ON orders;
CREATE POLICY "Users can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (true);

-- Policies para sales
DROP POLICY IF EXISTS "Sales are viewable by authenticated users" ON sales;
CREATE POLICY "Sales are viewable by authenticated users"
  ON sales FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Sales are viewable by anon users" ON sales;
CREATE POLICY "Sales are viewable by anon users"
  ON sales FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Users can create sales" ON sales;
CREATE POLICY "Users can create sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow anon role to create sales during development
DROP POLICY IF EXISTS "Anon can create sales" ON sales;
CREATE POLICY "Anon can create sales"
  ON sales FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policies para audit_logs
DROP POLICY IF EXISTS "Audit logs are viewable by authenticated users" ON audit_logs;
CREATE POLICY "Audit logs are viewable by authenticated users"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Audit logs are viewable by anon users" ON audit_logs;
CREATE POLICY "Audit logs are viewable by anon users"
  ON audit_logs FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Users can create audit logs" ON audit_logs;
CREATE POLICY "Users can create audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can create audit logs" ON audit_logs;
CREATE POLICY "Anon can create audit logs"
  ON audit_logs FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policies para notifications
DROP POLICY IF EXISTS "Notifications are viewable by authenticated users" ON notifications;
CREATE POLICY "Notifications are viewable by authenticated users"
  ON notifications FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Notifications are viewable by anon users" ON notifications;
CREATE POLICY "Notifications are viewable by anon users"
  ON notifications FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Users can create notifications" ON notifications;
CREATE POLICY "Users can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can create notifications" ON notifications;
CREATE POLICY "Anon can create notifications"
  ON notifications FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update notifications" ON notifications;
CREATE POLICY "Users can update notifications"
  ON notifications FOR UPDATE
  TO authenticated, anon
  USING (true);

-- Policies para closings
DROP POLICY IF EXISTS "Closings are viewable by authenticated users" ON closings;
CREATE POLICY "Closings are viewable by authenticated users"
  ON closings FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Admins can create closings" ON closings;
CREATE POLICY "Admins can create closings"
  ON closings FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- ============================================
-- ✅ Schema creado exitosamente
-- ============================================
