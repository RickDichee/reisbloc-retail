-- ================================================
-- FIX: RLS POLICY PARA SALES (INSERT para ANON)
-- ================================================

-- Ejecutar esto en Supabase Dashboard → SQL Editor

-- Agregar policy para INSERT en sales como anon (desarrollo)
DROP POLICY IF EXISTS "Anon can create sales" ON sales;
CREATE POLICY "Anon can create sales"
  ON sales FOR INSERT
  TO anon
  WITH CHECK (true);

-- Verificar que la policy existe
SELECT * FROM pg_policies WHERE tablename = 'sales';

-- ================================================
-- NOTA: Para producción, cambiar a:
-- TO authenticated (no anon)
-- Y hacer login real con Supabase Auth
-- ================================================
