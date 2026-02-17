-- ============================================================================
-- FIX PARA FLUJO POS: PERMITIR OPERACIONES ANONIMAS VALIDADAS POR PIN
-- ============================================================================

-- 1. Permitir que el Front (anon) pueda insertar órdenes si el creador existe
DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "POS_flow_insert_orders" ON orders
  FOR INSERT 
  TO anon
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = created_by AND active = true)
  );

-- 2. Permitir ver órdenes (necesario para persistencia y que no desaparezcan al refrescar)
DROP POLICY IF EXISTS "Orders are viewable by authenticated users" ON orders;
CREATE POLICY "POS_flow_select_orders" ON orders
  FOR SELECT 
  TO anon
  USING (true);

-- 3. Permitir actualizar órdenes (para cambiar status a 'ready', 'served', etc.)
DROP POLICY IF EXISTS "Users can update orders" ON orders;
CREATE POLICY "POS_flow_update_orders" ON orders
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- 4. Fix para Sales (Persistencia de cobros)
DROP POLICY IF EXISTS "Anon can create sales" ON sales;
CREATE POLICY "POS_flow_insert_sales" ON sales
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = waiter_id AND active = true)
  );

-- 5. Permitir lectura de ventas para reportes
DROP POLICY IF EXISTS "Sales are viewable by anon users" ON sales;
CREATE POLICY "POS_flow_select_sales" ON sales
  FOR SELECT
  TO anon
  USING (true);

COMMIT;