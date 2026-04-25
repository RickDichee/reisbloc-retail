-- =============================================================
-- REISBLOC ECOSYSTEM - DATABASE MIGRATION
-- Creates: stores, wholesale_catalog, store_inventory + user_role
-- =============================================================

-- 1. CREATE USER ROLE ENUM
DO $$ 
BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'wholesaler', 'store_owner', 'buyer');
EXCEPTION 
  WHEN duplicate_object THEN null;
END $$;

-- 2. AGREGAR COLUMNAS A users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS user_role user_role DEFAULT 'buyer';

-- 3. CREATE STORES TABLE
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  location_lat FLOAT,
  location_long FLOAT,
  address TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREATE WHOLESALE CATALOG
CREATE TABLE IF NOT EXISTS wholesale_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wholesaler_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  description TEXT,
  min_order_quantity INTEGER DEFAULT 1,
  wholesale_price DECIMAL(12,2) NOT NULL,
  category TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CREATE STORE_INVENTORY (The Bridge)
CREATE TABLE IF NOT EXISTS store_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  wholesale_product_id UUID REFERENCES wholesale_catalog(id) ON DELETE SET NULL,
  sku TEXT,
  name TEXT NOT NULL,
  cost_price DECIMAL(12,2),
  sale_price DECIMAL(12,2),
  stock_quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 5,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ENABLE RLS
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_inventory ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES - STORES
DROP POLICY IF EXISTS "Public stores are viewable by everyone" ON stores;
CREATE POLICY "Public stores are viewable by everyone" 
ON stores FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Owners can manage their stores" ON stores;
CREATE POLICY "Owners can manage their stores" 
ON stores FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_primary_admin = true)
);

-- 8. RLS POLICIES - WHOLESALE CATALOG
DROP POLICY IF EXISTS "Wholesale visible to ecosystem only" ON wholesale_catalog;
CREATE POLICY "Wholesale visible to ecosystem only" 
ON wholesale_catalog FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.user_role IN ('wholesaler', 'store_owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Wholesalers can manage their products" ON wholesale_catalog;
CREATE POLICY "Wholesalers can manage their products" 
ON wholesale_catalog FOR ALL USING (
  wholesaler_id = auth.uid()
);

-- 9. RLS POLICIES - STORE INVENTORY
DROP POLICY IF EXISTS "Owners manage own inventory" ON store_inventory;
CREATE POLICY "Owners manage own inventory" 
ON store_inventory FOR ALL USING (
  EXISTS (
    SELECT 1 FROM stores s
    WHERE s.id = store_inventory.store_id 
    AND s.owner_id = auth.uid()
  )
);

-- 10. CREAR INDICES
CREATE INDEX IF NOT EXISTS idx_stores_owner ON stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_wholesale_catalog_wholesaler ON wholesale_catalog(wholesaler_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_store ON store_inventory(store_id);

-- =============================================================
-- DONE
-- =============================================================
SELECT 'Ecosistema creado!' as status, NOW() as timestamp;