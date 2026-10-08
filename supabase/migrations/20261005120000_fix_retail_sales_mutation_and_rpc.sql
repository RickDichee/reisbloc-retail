-- ==============================================================================
-- MIGRACIÓN DE PRODUCCIÓN: Corrección de client_mutation_id, RPC de Ventas Retail
-- y sincronización Realtime para Moda Miel MX
-- ==============================================================================

-- 1. Asegurar columna client_mutation_id en retail_sales
ALTER TABLE public.retail_sales 
  ADD COLUMN IF NOT EXISTS client_mutation_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_retail_sales_client_mutation_id
  ON public.retail_sales (organization_id, client_mutation_id)
  WHERE client_mutation_id IS NOT NULL;

-- 2. Asegurar que las tablas de ventas tengan Replica Identity FULL para Realtime
ALTER TABLE public.retail_sales REPLICA IDENTITY FULL;
ALTER TABLE public.retail_sale_items REPLICA IDENTITY FULL;
ALTER TABLE public.shifts REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- 3. Publicaciones de Supabase Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.closings;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.retail_sales;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.retail_sale_items;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

-- 4. RPC Atómica de Venta Retail: process_retail_sale_transaction
CREATE OR REPLACE FUNCTION public.process_retail_sale_transaction(
  p_sale jsonb,
  p_items jsonb,
  p_options jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_role text := COALESCE(auth.role(), '');
  v_caller_org uuid;
  v_org_id uuid;
  v_org_raw text;
  v_sale_by uuid;
  v_sale_id uuid;
  v_existing_id uuid;
  v_client_id uuid;
  v_mutation_id text;
  v_total numeric;
  v_subtotal numeric;
  v_discounts numeric;
  v_tax numeric;
  v_tip numeric;
  v_payment_method text;
  v_status text;
  v_skip_stock boolean;
  v_reserved_order_ids jsonb;
  v_reserved_order jsonb;
  v_reserved_order_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_target_id uuid;
  v_item_qty numeric;
  v_pack_qty numeric;
  v_deduct_qty numeric;
  v_stock numeric;
  v_has_inventory boolean;
  v_uuid_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
BEGIN
  -- Validaciones básicas de payload
  IF jsonb_typeof(p_sale) <> 'object' OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'sale must be an object with at least one item';
  END IF;

  -- Resolver organización
  v_org_raw := COALESCE(p_sale->>'organization_id', p_sale->>'organizationId', '');
  IF v_org_raw ~* v_uuid_pattern THEN
    v_org_id := v_org_raw::uuid;
  ELSE
    v_org_id := public.get_my_org_id();
  END IF;

  IF v_org_id IS NULL THEN
    v_org_id := '1b498fa6-aca5-428c-9bdd-01e6fea30316'::uuid;
  END IF;

  -- Resolver usuario vendedor
  IF (p_sale->>'sale_by') ~* v_uuid_pattern THEN
    v_sale_by := (p_sale->>'sale_by')::uuid;
  ELSIF (p_sale->>'saleBy') ~* v_uuid_pattern THEN
    v_sale_by := (p_sale->>'saleBy')::uuid;
  ELSIF auth.uid() IS NOT NULL THEN
    v_sale_by := auth.uid();
  ELSE
    SELECT u.id INTO v_sale_by FROM public.users u WHERE u.organization_id = v_org_id LIMIT 1;
  END IF;

  -- IDEMPOTENCIA: Verificar duplicados por client_mutation_id
  v_mutation_id := NULLIF(trim(COALESCE(p_sale->>'client_mutation_id', p_sale->>'clientMutationId', p_options->>'client_mutation_id', '')), '');
  IF v_mutation_id IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM public.retail_sales
    WHERE organization_id = v_org_id AND client_mutation_id = v_mutation_id
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'sale_id', v_existing_id,
        'is_duplicate', true,
        'message', 'Sale already processed with mutation ID ' || v_mutation_id
      );
    END IF;
  END IF;

  -- Campos monetarios
  v_total := COALESCE((p_sale->>'total')::numeric, 0);
  v_subtotal := COALESCE((p_sale->>'subtotal')::numeric, v_total);
  v_discounts := COALESCE((p_sale->>'discounts')::numeric, 0);
  v_tax := COALESCE((p_sale->>'tax')::numeric, 0);
  v_tip := COALESCE((p_sale->>'tip')::numeric, 0);
  v_payment_method := COALESCE(p_sale->>'payment_method', p_sale->>'paymentMethod', 'cash');
  v_status := COALESCE(p_sale->>'status', 'completed');

  IF (p_sale->>'client_id') ~* v_uuid_pattern THEN
    v_client_id := (p_sale->>'client_id')::uuid;
  ELSIF (p_sale->>'clientId') ~* v_uuid_pattern THEN
    v_client_id := (p_sale->>'clientId')::uuid;
  END IF;

  -- Insertar Cabecera de Venta
  INSERT INTO public.retail_sales (
    organization_id, table_number, subtotal, discounts, tax, total, payment_method,
    tip, tip_source, sale_by, notes, client_id, branch_id, status, paid_amount,
    client_mutation_id, created_at
  ) VALUES (
    v_org_id,
    COALESCE((p_sale->>'table_number')::int, (p_sale->>'tableNumber')::int, 1),
    v_subtotal, v_discounts, v_tax, v_total, v_payment_method, v_tip,
    COALESCE(p_sale->>'tip_source', p_sale->>'tipSource', 'none'),
    v_sale_by,
    p_sale->>'notes',
    v_client_id,
    CASE WHEN COALESCE(p_sale->>'branch_id', p_sale->>'branchId', '') ~* v_uuid_pattern
      THEN COALESCE(p_sale->>'branch_id', p_sale->>'branchId')::uuid ELSE NULL END,
    v_status,
    v_total,
    v_mutation_id,
    COALESCE((p_sale->>'created_at')::timestamptz, now())
  ) RETURNING id INTO v_sale_id;

  -- Insertar Items y descontar stock
  v_skip_stock := COALESCE((p_options->>'skip_stock_deduction')::boolean, (p_options->>'skipStockDeduction')::boolean, false);

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_qty := COALESCE((v_item->>'quantity')::numeric, 1);
    v_pack_qty := COALESCE((v_item->>'packQuantity')::numeric, (v_item->>'pack_quantity')::numeric, 1);
    IF v_item_qty <= 0 THEN v_item_qty := 1; END IF;

    INSERT INTO public.retail_sale_items (
      sale_id, product_id, product_name, quantity, unit_price, total_price
    ) VALUES (
      v_sale_id,
      CASE WHEN COALESCE(v_item->>'productId', v_item->>'product_id', v_item->>'id', '') ~* v_uuid_pattern
        THEN COALESCE(v_item->>'productId', v_item->>'product_id', v_item->>'id')::uuid ELSE NULL END,
      COALESCE(v_item->>'productName', v_item->>'product_name', v_item->>'name', 'Artículo manual'),
      v_item_qty,
      COALESCE((v_item->>'unitPrice')::numeric, (v_item->>'unit_price')::numeric, 0),
      COALESCE((v_item->>'totalPrice')::numeric, (v_item->>'total_price')::numeric,
        v_item_qty * COALESCE((v_item->>'unitPrice')::numeric, (v_item->>'unit_price')::numeric, 0))
    );

    -- Descontar inventario si aplica
    IF NOT v_skip_stock AND COALESCE(v_item->>'productId', v_item->>'product_id', v_item->>'id', '') ~* v_uuid_pattern THEN
      v_product_id := COALESCE(v_item->>'productId', v_item->>'product_id', v_item->>'id')::uuid;
      v_target_id := CASE WHEN COALESCE(v_item->>'parentId', v_item->>'parent_id', '') ~* v_uuid_pattern
        THEN COALESCE(v_item->>'parentId', v_item->>'parent_id')::uuid ELSE v_product_id END;
      v_deduct_qty := v_item_qty * v_pack_qty;

      UPDATE public.retail_products
      SET current_stock = GREATEST(0, current_stock - v_deduct_qty),
          updated_at = now()
      WHERE id = v_target_id AND organization_id = v_org_id;

      UPDATE public.products
      SET current_stock = GREATEST(0, current_stock - v_deduct_qty),
          updated_at = now()
      WHERE id = v_target_id AND organization_id = v_org_id;
    END IF;
  END LOOP;

  -- Si venía de una orden reservada, completarla
  v_reserved_order_ids := COALESCE(p_options->'reserved_order_ids', p_options->'reservedOrderIds', '[]'::jsonb);
  IF jsonb_typeof(v_reserved_order_ids) = 'array' AND jsonb_array_length(v_reserved_order_ids) > 0 THEN
    FOR v_reserved_order IN SELECT * FROM jsonb_array_elements(v_reserved_order_ids)
    LOOP
      IF trim(both '"' from v_reserved_order::text) ~* v_uuid_pattern THEN
        v_reserved_order_id := trim(both '"' from v_reserved_order::text)::uuid;
        UPDATE public.orders
        SET status = 'completed', is_paid = true, updated_at = now()
        WHERE id = v_reserved_order_id AND organization_id = v_org_id;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'sale_id', v_sale_id,
    'total', v_total,
    'created_at', now()
  );
END;
$$;

-- 5. Otorgar permisos de ejecución para soportar usuarios con login y cajeros con PIN local
GRANT EXECUTE ON FUNCTION public.process_retail_sale_transaction(jsonb, jsonb, jsonb) TO authenticated, service_role, anon;

-- 6. Otorgar permisos a retail_sales y retail_sale_items para fallback
GRANT SELECT, INSERT ON public.retail_sales TO authenticated, anon;
GRANT SELECT, INSERT ON public.retail_sale_items TO authenticated, anon;

-- 7. RECARGAR SCHEMA CACHE DE POSTGREST
NOTIFY pgrst, 'reload schema';
