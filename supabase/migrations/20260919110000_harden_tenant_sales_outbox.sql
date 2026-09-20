-- =============================================================================
-- Tenant isolation and confirmed-sale hardening.
-- Direct writes to confirmed sales are forbidden; the RPC is the only writer.
-- =============================================================================

-- A prior schema export created this permissive policy. PostgreSQL combines
-- permissive policies with OR, so it must be explicitly removed.
DROP POLICY IF EXISTS "Permitir todo a autenticados" ON public.products;

DO $$
DECLARE
  target_table text;
  target_policy text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'products', 'retail_products', 'retail_sales', 'retail_sale_items', 'retail_sale_payments'
  ]
  LOOP
    FOR target_policy IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = target_table
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target_policy, target_table);
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_sale_payments ENABLE ROW LEVEL SECURITY;

-- No tenant administrator is implicitly a platform administrator. Every direct
-- table operation is scoped to the caller's organization.
CREATE POLICY products_tenant_read ON public.products
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY products_tenant_write ON public.products
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.get_my_role() IN ('admin', 'owner', 'manager', 'supervisor', 'gerente')
  )
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND public.get_my_role() IN ('admin', 'owner', 'manager', 'supervisor', 'gerente')
  );

CREATE POLICY retail_products_tenant_read ON public.retail_products
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id())
;

CREATE POLICY retail_products_tenant_write ON public.retail_products
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.get_my_role() IN ('admin', 'owner', 'manager', 'supervisor', 'gerente')
  )
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND public.get_my_role() IN ('admin', 'owner', 'manager', 'supervisor', 'gerente')
  );

CREATE POLICY retail_sales_tenant_read ON public.retail_sales
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY retail_sale_items_tenant_read ON public.retail_sale_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.retail_sales s
    WHERE s.id = retail_sale_items.sale_id
      AND s.organization_id = public.get_my_org_id()
  ));

CREATE POLICY retail_sale_payments_tenant_read ON public.retail_sale_payments
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

-- Public catalog access remains exclusively through get_public_storefront_catalog.
REVOKE ALL ON public.products, public.retail_products FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.retail_sales, public.retail_sale_items, public.retail_sale_payments FROM anon, authenticated;
REVOKE ALL ON public.retail_sales, public.retail_sale_items, public.retail_sale_payments FROM anon;
GRANT SELECT ON public.retail_sales, public.retail_sale_items, public.retail_sale_payments TO authenticated;

-- Replaces the old transaction with strict stock checks. This routine is the
-- sole supported way to record a confirmed cash/deposit/external-card sale.
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
  IF jsonb_typeof(p_sale) <> 'object' OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'sale must be an object with at least one item';
  END IF;

  IF v_caller_role = 'anon' OR v_caller_role = '' THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF v_caller_role <> 'service_role' THEN
    v_caller_org := public.get_my_org_id();
    IF auth.uid() IS NULL OR v_caller_org IS NULL THEN
      RAISE EXCEPTION 'organization context is required';
    END IF;
  END IF;

  IF COALESCE(p_sale->>'organization_id', p_sale->>'organizationId', '') ~* v_uuid_pattern THEN
    v_org_id := COALESCE(p_sale->>'organization_id', p_sale->>'organizationId')::uuid;
  ELSE
    v_org_id := v_caller_org;
  END IF;
  IF v_org_id IS NULL OR (v_caller_role <> 'service_role' AND v_org_id IS DISTINCT FROM v_caller_org) THEN
    RAISE EXCEPTION 'cross-tenant sale execution denied';
  END IF;

  v_mutation_id := NULLIF(trim(COALESCE(p_sale->>'client_mutation_id', p_sale->>'clientMutationId', p_options->>'client_mutation_id', '')), '');
  IF v_mutation_id IS NULL THEN
    RAISE EXCEPTION 'client_mutation_id is required for confirmed sales';
  END IF;

  SELECT id INTO v_existing_id
  FROM public.retail_sales
  WHERE organization_id = v_org_id AND client_mutation_id = v_mutation_id
  LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'sale_id', v_existing_id, 'is_duplicate', true);
  END IF;

  v_total := COALESCE((p_sale->>'total')::numeric, 0);
  v_subtotal := COALESCE((p_sale->>'subtotal')::numeric, v_total);
  v_discounts := COALESCE((p_sale->>'discounts')::numeric, 0);
  v_tax := COALESCE((p_sale->>'tax')::numeric, 0);
  v_tip := COALESCE((p_sale->>'tip')::numeric, 0);
  IF v_total <= 0 OR v_subtotal < 0 OR v_total < 0 THEN
    RAISE EXCEPTION 'sale totals must be positive';
  END IF;

  v_payment_method := COALESCE(p_sale->>'payment_method', p_sale->>'paymentMethod', 'cash');
  v_status := COALESCE(p_sale->>'status', 'completed');
  IF v_status <> 'completed' THEN
    RAISE EXCEPTION 'this RPC only records confirmed sales';
  END IF;

  -- Stock can be skipped only for an already-reserved order. The referenced
  -- order is validated and closed below in this same transaction.
  v_skip_stock := COALESCE((p_options->>'skip_stock_deduction')::boolean, (p_options->>'skipStockDeduction')::boolean, false);
  v_reserved_order_ids := COALESCE(p_options->'reserved_order_ids', p_options->'reservedOrderIds', '[]'::jsonb);
  IF v_skip_stock THEN
    IF jsonb_typeof(v_reserved_order_ids) <> 'array' OR jsonb_array_length(v_reserved_order_ids) = 0 THEN
      RAISE EXCEPTION 'reserved order ids are required when skipping stock deduction';
    END IF;
    FOR v_reserved_order IN SELECT * FROM jsonb_array_elements(v_reserved_order_ids)
    LOOP
      IF trim(both '"' from v_reserved_order::text) !~* v_uuid_pattern THEN
        RAISE EXCEPTION 'invalid reserved order id';
      END IF;
      v_reserved_order_id := trim(both '"' from v_reserved_order::text)::uuid;
      PERFORM 1 FROM public.orders
      WHERE id = v_reserved_order_id
        AND organization_id = v_org_id
        AND status IN ('pending', 'apartado', 'pending_surtir', 'listo_entrega', 'pendiente_entrega')
      FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'reserved order is not available for checkout'; END IF;
    END LOOP;
  END IF;

  IF COALESCE(p_sale->>'sale_by', p_sale->>'saleBy', '') ~* v_uuid_pattern THEN
    v_sale_by := COALESCE(p_sale->>'sale_by', p_sale->>'saleBy')::uuid;
  ELSE
    v_sale_by := auth.uid();
  END IF;
  IF v_sale_by IS NULL OR (v_caller_role <> 'service_role' AND v_sale_by <> auth.uid()) THEN
    RAISE EXCEPTION 'seller identity is invalid';
  END IF;

  IF COALESCE(p_sale->>'client_id', p_sale->>'clientId', '') ~* v_uuid_pattern THEN
    v_client_id := COALESCE(p_sale->>'client_id', p_sale->>'clientId')::uuid;
    PERFORM 1 FROM public.clients WHERE id = v_client_id AND organization_id = v_org_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'client does not belong to organization'; END IF;
  END IF;

  INSERT INTO public.retail_sales (
    organization_id, table_number, subtotal, discounts, tax, total, payment_method,
    tip, tip_source, sale_by, notes, client_id, branch_id, status, paid_amount,
    client_mutation_id, created_at
  ) VALUES (
    v_org_id, COALESCE((p_sale->>'table_number')::int, (p_sale->>'tableNumber')::int, 1),
    v_subtotal, v_discounts, v_tax, v_total, v_payment_method, v_tip,
    COALESCE(p_sale->>'tip_source', p_sale->>'tipSource', 'none'), v_sale_by,
    p_sale->>'notes', v_client_id,
    CASE WHEN COALESCE(p_sale->>'branch_id', p_sale->>'branchId', '') ~* v_uuid_pattern
      THEN COALESCE(p_sale->>'branch_id', p_sale->>'branchId')::uuid ELSE NULL END,
    v_status, v_total, v_mutation_id, now()
  ) RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_qty := COALESCE((v_item->>'quantity')::numeric, 0);
    v_pack_qty := COALESCE((v_item->>'packQuantity')::numeric, (v_item->>'pack_quantity')::numeric, 1);
    IF v_item_qty <= 0 OR v_pack_qty <= 0 THEN RAISE EXCEPTION 'item quantities must be positive'; END IF;

    INSERT INTO public.retail_sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
    VALUES (
      v_sale_id,
      CASE WHEN COALESCE(v_item->>'productId', v_item->>'product_id', v_item->>'id', '') ~* v_uuid_pattern
        THEN COALESCE(v_item->>'productId', v_item->>'product_id', v_item->>'id')::uuid ELSE NULL END,
      COALESCE(v_item->>'productName', v_item->>'product_name', v_item->>'name', 'Artículo manual'),
      v_item_qty,
      COALESCE((v_item->>'unitPrice')::numeric, (v_item->>'unit_price')::numeric, 0),
      COALESCE((v_item->>'totalPrice')::numeric, (v_item->>'total_price')::numeric,
        v_item_qty * COALESCE((v_item->>'unitPrice')::numeric, (v_item->>'unit_price')::numeric, 0))
    );

    IF v_skip_stock OR COALESCE(v_item->>'productId', v_item->>'product_id', v_item->>'id', '') !~* v_uuid_pattern THEN CONTINUE; END IF;
    v_product_id := COALESCE(v_item->>'productId', v_item->>'product_id', v_item->>'id')::uuid;
    v_target_id := CASE WHEN COALESCE(v_item->>'parentId', v_item->>'parent_id', '') ~* v_uuid_pattern
      THEN COALESCE(v_item->>'parentId', v_item->>'parent_id')::uuid ELSE v_product_id END;
    v_deduct_qty := v_item_qty * v_pack_qty;

    SELECT current_stock, has_inventory INTO v_stock, v_has_inventory
    FROM public.retail_products
    WHERE id = v_target_id AND organization_id = v_org_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'product % not found in organization', v_target_id; END IF;
    IF COALESCE(v_has_inventory, true) THEN
      IF COALESCE(v_stock, 0) < v_deduct_qty THEN
        RAISE EXCEPTION 'insufficient stock for product %', v_target_id;
      END IF;
      UPDATE public.retail_products SET current_stock = current_stock - v_deduct_qty, updated_at = now()
      WHERE id = v_target_id AND organization_id = v_org_id;
      UPDATE public.products SET current_stock = GREATEST(0, current_stock - v_deduct_qty), updated_at = now()
      WHERE id = v_target_id AND organization_id = v_org_id;
    END IF;
  END LOOP;

  INSERT INTO public.retail_sale_payments (sale_id, organization_id, payment_method, amount, reference_id, created_at)
  VALUES (v_sale_id, v_org_id, v_payment_method, v_total, p_sale->>'reference_id', now());

  IF v_client_id IS NOT NULL THEN
    UPDATE public.clients SET total_spent = COALESCE(total_spent, 0) + v_total, updated_at = now()
    WHERE id = v_client_id AND organization_id = v_org_id;
  END IF;

  IF v_skip_stock THEN
    FOR v_reserved_order IN SELECT * FROM jsonb_array_elements(v_reserved_order_ids)
    LOOP
      v_reserved_order_id := trim(both '"' from v_reserved_order::text)::uuid;
      UPDATE public.orders
      SET status = 'completed', is_paid = true, payment_status = 'paid',
          pending_balance = 0, paid_amount = total, updated_at = now()
      WHERE id = v_reserved_order_id AND organization_id = v_org_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'reserved order could not be closed'; END IF;
    END LOOP;
  END IF;

  INSERT INTO public.audit_logs (organization_id, action, entity_type, entity_id, user_id, details, created_at)
  VALUES (v_org_id, 'CREATE_RETAIL_SALE', 'retail_sales', v_sale_id::text, v_sale_by,
    'Venta confirmada procesada atómicamente por total: $' || v_total::text, now());

  RETURN jsonb_build_object('success', true, 'sale_id', v_sale_id, 'is_duplicate', false, 'total', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.process_retail_sale_transaction(jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_retail_sale_transaction(jsonb, jsonb, jsonb) TO authenticated, service_role;

-- Direct stock adjustments are administrative operations, not a checkout
-- fallback. Negative adjustments are rejected when they would oversell.
CREATE OR REPLACE FUNCTION public.update_retail_stock_batch(updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item jsonb;
  v_product_id uuid;
  v_target_org uuid;
  v_quantity numeric;
  v_caller_org uuid;
  v_caller_role text;
  v_uuid_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
BEGIN
  IF jsonb_typeof(updates) <> 'array' THEN RAISE EXCEPTION 'updates must be an array'; END IF;
  IF auth.role() <> 'service_role' THEN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    v_caller_org := public.get_my_org_id();
    v_caller_role := public.get_my_role();
    IF v_caller_org IS NULL OR v_caller_role NOT IN ('admin', 'owner', 'manager', 'supervisor', 'gerente') THEN
      RAISE EXCEPTION 'stock adjustments require an inventory management role';
    END IF;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    IF COALESCE(v_item->>'productId', v_item->>'product_id', v_item->>'id', '') !~* v_uuid_pattern THEN
      RAISE EXCEPTION 'invalid product id';
    END IF;
    v_product_id := COALESCE(v_item->>'productId', v_item->>'product_id', v_item->>'id')::uuid;
    v_quantity := COALESCE((v_item->>'quantity')::numeric, (v_item->>'qty')::numeric, 0);
    IF v_quantity = 0 THEN CONTINUE; END IF;

    SELECT organization_id INTO v_target_org FROM public.retail_products WHERE id = v_product_id FOR UPDATE;
    IF v_target_org IS NULL OR (auth.role() <> 'service_role' AND v_target_org <> v_caller_org) THEN
      RAISE EXCEPTION 'cross-tenant or unknown product stock adjustment denied';
    END IF;

    UPDATE public.retail_products
    SET current_stock = current_stock + v_quantity, updated_at = now()
    WHERE id = v_product_id
      AND (v_quantity >= 0 OR current_stock >= -v_quantity);
    IF NOT FOUND THEN RAISE EXCEPTION 'insufficient stock for adjustment'; END IF;

    UPDATE public.products
    SET current_stock = GREATEST(0, current_stock + v_quantity), updated_at = now()
    WHERE id = v_product_id AND organization_id = v_target_org;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.update_retail_stock_batch(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_retail_stock_batch(jsonb) TO authenticated, service_role;
