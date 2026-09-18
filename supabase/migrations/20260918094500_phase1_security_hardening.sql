-- =============================================================================
-- PHASE 1 SECURITY HARDENING (STORE STOREFRONT + INVENTORY RPC)
-- Fecha: 2026-09-18
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Direct anon reads of retail_products must be blocked (RPC-only public catalog)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "retail_products_public_read" ON public.retail_products;

CREATE POLICY "retail_products_public_read" ON public.retail_products
  FOR SELECT TO anon
  USING (false);

COMMENT ON POLICY "retail_products_public_read" ON public.retail_products
  IS 'Phase 1: anon cannot query retail_products directly; use get_public_storefront_catalog RPC.';

-- -----------------------------------------------------------------------------
-- 2) Harden public storefront RPC: exact slug/UUID only + explicit search_path
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_public_storefront_catalog(text);

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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org_id uuid;
  v_input text := lower(trim(coalesce(p_slug, '')));
BEGIN
  IF v_input = '' THEN
    RETURN;
  END IF;

  IF v_input ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    v_org_id := v_input::uuid;
  ELSIF v_input ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    SELECT o.id INTO v_org_id
    FROM public.organizations o
    WHERE lower(o.slug) = v_input
      AND o.active = true
    LIMIT 1;
  ELSE
    RETURN;
  END IF;

  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

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
  JOIN public.organizations o ON o.id = rp.organization_id
  WHERE rp.organization_id = v_org_id
    AND o.active = true
    AND rp.active = true
    AND (rp.current_stock > 0 OR rp.has_inventory = false)
  ORDER BY rp.name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_storefront_catalog(text) FROM public;
REVOKE ALL ON FUNCTION public.get_public_storefront_catalog(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_public_storefront_catalog(text) FROM authenticated;
REVOKE ALL ON FUNCTION public.get_public_storefront_catalog(text) FROM service_role;
GRANT EXECUTE ON FUNCTION public.get_public_storefront_catalog(text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_public_storefront_catalog(text)
  IS 'Phase 1: public catalog RPC with exact tenant resolution only (slug/UUID), explicit search_path, and tenant-scoped active products.';

-- -----------------------------------------------------------------------------
-- 3) Harden inventory batch RPC: tenant authorization + strict input validation
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_retail_stock_batch(updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  item jsonb;
  prod_id uuid;
  prod_raw text;
  qty numeric;
  caller_uid uuid;
  caller_org uuid;
  caller_role text;
  target_org uuid;
BEGIN
  IF updates IS NULL OR jsonb_typeof(updates) <> 'array' THEN
    RAISE EXCEPTION 'updates must be a JSON array';
  END IF;

  caller_role := COALESCE(auth.jwt() ->> 'role', '');
  caller_uid := auth.uid();

  IF caller_role <> 'service_role' THEN
    IF caller_uid IS NULL THEN
      RAISE EXCEPTION 'authentication required';
    END IF;

    caller_org := public.get_my_org_id();
    IF caller_org IS NULL THEN
      RAISE EXCEPTION 'organization context is required';
    END IF;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    prod_raw := COALESCE(item->>'productId', item->>'product_id', item->>'id', '');
    IF prod_raw = '' OR prod_raw !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'invalid product id in updates payload';
    END IF;
    prod_id := prod_raw::uuid;

    qty := COALESCE((item->>'quantity')::numeric, (item->>'qty')::numeric, 0);
    IF qty = 0 THEN
      CONTINUE;
    END IF;

    SELECT rp.organization_id
      INTO target_org
    FROM public.retail_products rp
    WHERE rp.id = prod_id
    FOR UPDATE;

    IF target_org IS NULL THEN
      RAISE EXCEPTION 'retail product not found for update';
    END IF;

    IF caller_role <> 'service_role' AND target_org <> caller_org THEN
      RAISE EXCEPTION 'cross-tenant stock update denied for product %', prod_id;
    END IF;

    UPDATE public.retail_products rp
    SET current_stock = GREATEST(0, rp.current_stock + qty),
        updated_at = now()
    WHERE rp.id = prod_id
      AND (caller_role = 'service_role' OR rp.organization_id = caller_org);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'stock update denied for product %', prod_id;
    END IF;

    UPDATE public.products p
    SET current_stock = GREATEST(0, p.current_stock + qty),
        updated_at = now()
    WHERE p.id = prod_id
      AND (caller_role = 'service_role' OR p.organization_id = caller_org);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.update_retail_stock_batch(jsonb) FROM public;
REVOKE ALL ON FUNCTION public.update_retail_stock_batch(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.update_retail_stock_batch(jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION public.update_retail_stock_batch(jsonb) FROM service_role;
GRANT EXECUTE ON FUNCTION public.update_retail_stock_batch(jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.update_retail_stock_batch(jsonb)
  IS 'Phase 1: inventory batch RPC with explicit search_path, JWT/org checks, UUID validation, and cross-tenant denial.';

