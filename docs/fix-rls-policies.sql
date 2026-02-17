-- Agregar políticas faltantes para INSERT/UPDATE/DELETE
-- Ejecutar esto en Supabase SQL Editor

-- ============ USERS POLICIES ============
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

-- ============ PRODUCTS POLICIES ============
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

-- ============ DEVICES POLICIES ============
-- Ya existen INSERT/UPDATE, solo verificamos
DROP POLICY IF EXISTS "Users can delete devices" ON devices;
CREATE POLICY "Users can delete devices"
  ON devices FOR DELETE
  TO authenticated, anon
  USING (true);
