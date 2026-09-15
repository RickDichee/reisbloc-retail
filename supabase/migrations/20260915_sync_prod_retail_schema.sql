-- ==============================================================================
-- MIGRACIÓN DE PRODUCCIÓN: ESQUEMA RETAIL MULTI-TENANT
-- Reisbloc Store · Sincronización PROD (nmovxyaibnixvxtepbod)
-- ==============================================================================

-- 1. Actualizar roles permitidos en users para retail
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role = ANY (ARRAY[
  'admin'::text, 
  'manager'::text, 
  'supervisor'::text, 
  'cashier'::text, 
  'employee'::text, 
  'owner'::text,
  'superadmin'::text,
  'capitan'::text, 
  'mesero'::text, 
  'cocina'::text, 
  'bar'::text, 
  'superuser'::text
]));

-- 2. Actualizar estados permitidos en orders para retail (apartados, surtido, entrega)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (((status)::text = ANY (ARRAY[
    'pending'::text, 
    'sent'::text, 
    'preparing'::text, 
    'ready'::text, 
    'served'::text, 
    'completed'::text, 
    'cancelled'::text, 
    'paid'::text, 
    'open'::text, 
    'apartado'::text, 
    'pending_surtir'::text, 
    'listo_entrega'::text, 
    'pendiente_entrega'::text, 
    'entregado'::text
  ])));

-- 3. Crear la tabla principal de inventario retail: retail_products
CREATE TABLE IF NOT EXISTS public.retail_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric DEFAULT 0,
  barcode text,
  sku text,
  category text DEFAULT 'General',
  image text,
  current_stock numeric DEFAULT 0,
  minimum_stock numeric DEFAULT 0,
  has_inventory boolean DEFAULT true,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  parent_id uuid REFERENCES public.retail_products(id) ON DELETE SET NULL,
  pack_quantity integer DEFAULT 1,
  branch_id uuid
);

-- Índices de búsqueda ultra rápidos para POS y Tienda Web
CREATE INDEX IF NOT EXISTS idx_retail_products_org ON public.retail_products(organization_id);
CREATE INDEX IF NOT EXISTS idx_retail_products_sku ON public.retail_products(sku);
CREATE INDEX IF NOT EXISTS idx_retail_products_barcode ON public.retail_products(barcode);
CREATE INDEX IF NOT EXISTS idx_retail_products_active ON public.retail_products(active);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.retail_products ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "retail_products_org_policy" ON public.retail_products;
CREATE POLICY "retail_products_org_policy" ON public.retail_products
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_my_org_id() 
    OR organization_id IS NULL
    OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'superadmin', 'owner')
  )
  WITH CHECK (
    organization_id = public.get_my_org_id() 
    OR organization_id IS NULL
    OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'superadmin', 'owner')
  );

DROP POLICY IF EXISTS "retail_products_public_read" ON public.retail_products;
CREATE POLICY "retail_products_public_read" ON public.retail_products
  FOR SELECT TO anon, authenticated
  USING (active = true);

-- Habilitar Realtime para retail_products
ALTER TABLE public.retail_products REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'retail_products') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.retail_products;
    END IF;
  END IF;
END $$;

-- 4. Trigger para descontar inventario en retail_products al registrar ventas
CREATE OR REPLACE FUNCTION public.handle_sale_inventory_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  item JSONB;
  prod_id UUID;
  qty INTEGER;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    prod_id := (item->>'productId')::UUID;
    qty := (item->>'quantity')::INTEGER;

    UPDATE public.retail_products
    SET current_stock = current_stock - qty
    WHERE id = prod_id AND has_inventory = true;
  END LOOP;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sale_inventory_update ON public.sales;
CREATE TRIGGER trigger_sale_inventory_update
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sale_inventory_update();

-- 5. Función RPC Gold Standard para catálogo web público en tiempo real
CREATE OR REPLACE FUNCTION public.get_public_storefront_catalog(p_slug text)
RETURNS TABLE (
  id uuid,
  sku text,
  name text,
  price numeric,
  stock numeric,
  category text,
  available boolean,
  image_url text,
  description text,
  pack_quantity integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- 1. Resolver organización por slug o UUID
  IF p_slug ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_org_id := p_slug::uuid;
  ELSE
    SELECT o.id INTO v_org_id
    FROM public.organizations o
    WHERE LOWER(o.slug) = LOWER(p_slug) 
       OR LOWER(o.name) LIKE '%' || LOWER(p_slug) || '%'
    LIMIT 1;
  END IF;

  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  -- 2. Retornar productos reales del inventario retail
  RETURN QUERY
  SELECT 
    rp.id,
    COALESCE(rp.sku, 'MM-' || SUBSTRING(rp.id::text, 1, 6)) AS sku,
    rp.name,
    rp.price,
    rp.current_stock AS stock,
    COALESCE(rp.category, 'General') AS category,
    rp.active AS available,
    rp.image AS image_url,
    COALESCE(rp.description, '') AS description,
    COALESCE(rp.pack_quantity, 1) AS pack_quantity
  FROM public.retail_products rp
  WHERE rp.organization_id = v_org_id
    AND rp.active = true
    AND (rp.current_stock > 0 OR rp.has_inventory = false)
  ORDER BY rp.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_storefront_catalog(text) TO anon, authenticated, service_role;
