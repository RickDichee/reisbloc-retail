-- ==============================================================================
-- MIGRACIÓN DE PRODUCCIÓN: ESQUEMA DE VENTAS RETAIL
-- Reisbloc Store · Creación de retail_sales, retail_sale_items y retail_sale_payments
-- Resuelve: PGRST205 - Could not find the table 'public.retail_sales' in the schema cache
-- ==============================================================================

-- 1. Tabla de Ventas Retail
CREATE TABLE IF NOT EXISTS public.retail_sales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    table_number integer,
    subtotal numeric DEFAULT 0 NOT NULL,
    discounts numeric DEFAULT 0 NOT NULL,
    tax numeric DEFAULT 0 NOT NULL,
    total numeric DEFAULT 0 NOT NULL,
    payment_method text NOT NULL,
    tip numeric DEFAULT 0 NOT NULL,
    tip_source text DEFAULT 'none',
    sale_by uuid NOT NULL REFERENCES public.users(id),
    notes text,
    created_at timestamptz DEFAULT now() NOT NULL,
    status text DEFAULT 'completed',
    paid_amount numeric DEFAULT 0,
    branch_id uuid,
    client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL
);

-- Índices de búsqueda y filtrado
CREATE INDEX IF NOT EXISTS idx_retail_sales_org ON public.retail_sales(organization_id);
CREATE INDEX IF NOT EXISTS idx_retail_sales_created ON public.retail_sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_retail_sales_org_created ON public.retail_sales(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_retail_sales_client ON public.retail_sales(client_id);
CREATE INDEX IF NOT EXISTS idx_retail_sales_status ON public.retail_sales(status);

-- 2. Tabla de Artículos por Venta Retail
CREATE TABLE IF NOT EXISTS public.retail_sale_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id uuid NOT NULL REFERENCES public.retail_sales(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.retail_products(id) ON DELETE SET NULL,
    product_name text NOT NULL,
    quantity numeric DEFAULT 1 NOT NULL,
    unit_price numeric DEFAULT 0 NOT NULL,
    total_price numeric DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_retail_sale_items_sale ON public.retail_sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_retail_sale_items_prod ON public.retail_sale_items(product_id);

-- 3. Tabla de Pagos / Abonos de Ventas Retail
CREATE TABLE IF NOT EXISTS public.retail_sale_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id uuid NOT NULL REFERENCES public.retail_sales(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    payment_method text NOT NULL,
    amount numeric NOT NULL,
    reference_id text,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_retail_sale_payments_sale ON public.retail_sale_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_retail_sale_payments_org ON public.retail_sale_payments(organization_id);

-- 4. Permisos de tabla para roles de Supabase (anon, authenticated, service_role)
GRANT ALL ON public.retail_sales TO anon, authenticated, service_role;
GRANT ALL ON public.retail_sale_items TO anon, authenticated, service_role;
GRANT ALL ON public.retail_sale_payments TO anon, authenticated, service_role;

-- 5. Habilitar Row Level Security (RLS)
ALTER TABLE public.retail_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_sale_payments ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de RLS para retail_sales
DROP POLICY IF EXISTS "retail_sales_select" ON public.retail_sales;
CREATE POLICY "retail_sales_select" ON public.retail_sales
  FOR SELECT TO authenticated, anon
  USING (
    organization_id = public.get_my_org_id()
    OR organization_id = (SELECT users.organization_id FROM users WHERE users.id = auth.uid())
    OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'superadmin', 'owner')
    OR auth.uid() IS NULL
  );

DROP POLICY IF EXISTS "retail_sales_insert" ON public.retail_sales;
CREATE POLICY "retail_sales_insert" ON public.retail_sales
  FOR INSERT TO authenticated, anon
  WITH CHECK (
    organization_id = public.get_my_org_id()
    OR organization_id = (SELECT users.organization_id FROM users WHERE users.id = auth.uid())
    OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'superadmin', 'owner')
    OR auth.uid() IS NULL
  );

DROP POLICY IF EXISTS "retail_sales_update" ON public.retail_sales;
CREATE POLICY "retail_sales_update" ON public.retail_sales
  FOR UPDATE TO authenticated, anon
  USING (
    organization_id = public.get_my_org_id()
    OR organization_id = (SELECT users.organization_id FROM users WHERE users.id = auth.uid())
    OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'superadmin', 'owner')
  );

DROP POLICY IF EXISTS "retail_sales_delete" ON public.retail_sales;
CREATE POLICY "retail_sales_delete" ON public.retail_sales
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'superadmin', 'owner')
  );

-- 7. Políticas de RLS para retail_sale_items
DROP POLICY IF EXISTS "retail_sale_items_select" ON public.retail_sale_items;
CREATE POLICY "retail_sale_items_select" ON public.retail_sale_items
  FOR SELECT TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM public.retail_sales s
      WHERE s.id = retail_sale_items.sale_id
      AND (
        s.organization_id = public.get_my_org_id()
        OR s.organization_id = (SELECT users.organization_id FROM users WHERE users.id = auth.uid())
        OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'superadmin', 'owner')
        OR auth.uid() IS NULL
      )
    )
  );

DROP POLICY IF EXISTS "retail_sale_items_insert" ON public.retail_sale_items;
CREATE POLICY "retail_sale_items_insert" ON public.retail_sale_items
  FOR INSERT TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.retail_sales s
      WHERE s.id = retail_sale_items.sale_id
      AND (
        s.organization_id = public.get_my_org_id()
        OR s.organization_id = (SELECT users.organization_id FROM users WHERE users.id = auth.uid())
        OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'superadmin', 'owner')
        OR auth.uid() IS NULL
      )
    )
  );

DROP POLICY IF EXISTS "retail_sale_items_update" ON public.retail_sale_items;
CREATE POLICY "retail_sale_items_update" ON public.retail_sale_items
  FOR UPDATE TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM public.retail_sales s
      WHERE s.id = retail_sale_items.sale_id
      AND (
        s.organization_id = public.get_my_org_id()
        OR s.organization_id = (SELECT users.organization_id FROM users WHERE users.id = auth.uid())
        OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'superadmin', 'owner')
      )
    )
  );

DROP POLICY IF EXISTS "retail_sale_items_delete" ON public.retail_sale_items;
CREATE POLICY "retail_sale_items_delete" ON public.retail_sale_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.retail_sales s
      WHERE s.id = retail_sale_items.sale_id
      AND (
        s.organization_id = public.get_my_org_id()
        OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'superadmin', 'owner')
      )
    )
  );

-- 8. Políticas de RLS para retail_sale_payments
DROP POLICY IF EXISTS "retail_sale_payments_select" ON public.retail_sale_payments;
CREATE POLICY "retail_sale_payments_select" ON public.retail_sale_payments
  FOR SELECT TO authenticated, anon
  USING (
    organization_id = public.get_my_org_id()
    OR organization_id = (SELECT users.organization_id FROM users WHERE users.id = auth.uid())
    OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'superadmin', 'owner')
    OR auth.uid() IS NULL
  );

DROP POLICY IF EXISTS "retail_sale_payments_insert" ON public.retail_sale_payments;
CREATE POLICY "retail_sale_payments_insert" ON public.retail_sale_payments
  FOR INSERT TO authenticated, anon
  WITH CHECK (
    organization_id = public.get_my_org_id()
    OR organization_id = (SELECT users.organization_id FROM users WHERE users.id = auth.uid())
    OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'superadmin', 'owner')
    OR auth.uid() IS NULL
  );

DROP POLICY IF EXISTS "retail_sale_payments_update" ON public.retail_sale_payments;
CREATE POLICY "retail_sale_payments_update" ON public.retail_sale_payments
  FOR UPDATE TO authenticated, anon
  USING (
    organization_id = public.get_my_org_id()
    OR organization_id = (SELECT users.organization_id FROM users WHERE users.id = auth.uid())
    OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'superadmin', 'owner')
  );

DROP POLICY IF EXISTS "retail_sale_payments_delete" ON public.retail_sale_payments;
CREATE POLICY "retail_sale_payments_delete" ON public.retail_sale_payments
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'superadmin', 'owner')
  );

-- 9. Habilitar Realtime
ALTER TABLE public.retail_sales REPLICA IDENTITY FULL;
ALTER TABLE public.retail_sale_items REPLICA IDENTITY FULL;
ALTER TABLE public.retail_sale_payments REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'retail_sales') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.retail_sales;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'retail_sale_items') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.retail_sale_items;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'retail_sale_payments') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.retail_sale_payments;
    END IF;
  END IF;
END $$;

-- 10. Función RPC para actualización de inventario por lote (update_retail_stock_batch)
CREATE OR REPLACE FUNCTION public.update_retail_stock_batch(updates jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION public.update_retail_stock_batch(jsonb) TO authenticated, anon, service_role;

-- 11. Trigger para actualizar montos y estado al recibir pagos
CREATE OR REPLACE FUNCTION public.update_retail_sale_paid_amount()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    UPDATE public.retail_sales
    SET 
        paid_amount = (SELECT COALESCE(SUM(amount), 0) FROM public.retail_sale_payments WHERE sale_id = NEW.sale_id),
        status = CASE 
            WHEN (SELECT COALESCE(SUM(amount), 0) FROM public.retail_sale_payments WHERE sale_id = NEW.sale_id) >= total THEN 'completed'
            ELSE 'partially_paid'
        END
    WHERE id = NEW.sale_id;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tr_update_retail_sale_paid ON public.retail_sale_payments;
CREATE TRIGGER tr_update_retail_sale_paid 
  AFTER INSERT OR DELETE OR UPDATE ON public.retail_sale_payments 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_retail_sale_paid_amount();

-- 12. Recargar cache de esquema de PostgREST
NOTIFY pgrst, 'reload schema';
