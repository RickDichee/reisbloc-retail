-- =============================================================================
-- REISBLOC RETAIL - MIGRACIÓN CORRECCIÓN CLIENTES, PEDIDOS Y RPC INVENTARIO
-- Fecha: 2026-09-12
-- Propósito:
--   1. Asegurar columnas 'total_spent' y 'created_by' en tabla 'clients'.
--   2. Agregar columnas de abonos y control de concurrencia en tabla 'orders'.
--   3. Corregir función 'update_retail_stock_batch' para descontar existencias
--      atendiendo claves JSON camelCase y snakeCase ('productId'/'product_id'/'id').
--   4. Configurar REPLICA IDENTITY FULL y añadir 'retail_products' a 'supabase_realtime'.
-- =============================================================================

-- 1. Clientes: Agregar total_spent y created_by si faltan
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS total_spent NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS created_by UUID;

-- 2. Pedidos: Agregar columnas de abono y concurrencia
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pending_balance NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS locked_by UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE;

-- 3. Corregir función update_retail_stock_batch para descontar stock robustamente
CREATE OR REPLACE FUNCTION public.update_retail_stock_batch(updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item jsonb;
  prod_id uuid;
  qty numeric;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    prod_id := COALESCE(
      (item->>'productId')::uuid,
      (item->>'product_id')::uuid,
      (item->>'id')::uuid
    );
    qty := COALESCE(
      (item->>'quantity')::numeric,
      (item->>'qty')::numeric,
      0
    );
    IF prod_id IS NOT NULL AND qty != 0 THEN
      -- Actualizar en retail_products
      UPDATE public.retail_products
      SET current_stock = GREATEST(0, current_stock + qty),
          updated_at = now()
      WHERE id = prod_id;

      -- Actualizar en products si existe
      UPDATE public.products
      SET current_stock = GREATEST(0, current_stock + qty),
          updated_at = now()
      WHERE id = prod_id;
    END IF;
  END LOOP;
END;
$$;

GRANT ALL ON FUNCTION public.update_retail_stock_batch(jsonb) TO anon, authenticated, service_role;

-- 4. Habilitar REPLICA IDENTITY FULL y agregar retail_products a supabase_realtime
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.retail_products REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'retail_products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.retail_products;
  END IF;
END $$;
