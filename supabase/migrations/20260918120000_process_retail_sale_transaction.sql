-- ==============================================================================
-- MIGRACIÓN: RPC TRANSACCIONAL ATÓMICO DE VENTAS RETAIL
-- Función: public.process_retail_sale_transaction(p_sale jsonb, p_items jsonb, p_options jsonb)
-- Garantiza atomicidad ACID en ventas: header + items + pagos + cliente + inventario + auditoría
-- Previene ventas huérfanas, inconsistencias de stock y fallas parciales por red.
-- ==============================================================================

-- 1. Añadir columna de idempotencia client_mutation_id a retail_sales si no existe
ALTER TABLE public.retail_sales
  ADD COLUMN IF NOT EXISTS client_mutation_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_retail_sales_client_mutation
  ON public.retail_sales(organization_id, client_mutation_id)
  WHERE client_mutation_id IS NOT NULL;

-- 2. Crear función RPC transaccional
CREATE OR REPLACE FUNCTION public.process_retail_sale_transaction(
  p_sale jsonb,
  p_items jsonb,
  p_options jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_caller_org uuid;
  v_org_id uuid;
  v_org_raw text;
  v_sale_id uuid;
  v_sale_by uuid;
  v_client_id uuid;
  v_client_raw text;
  v_branch_id uuid;
  v_branch_raw text;
  v_mutation_id text;
  v_total numeric;
  v_subtotal numeric;
  v_discounts numeric;
  v_tax numeric;
  v_tip numeric;
  v_payment_method text;
  v_tip_source text;
  v_table_number int;
  v_notes text;
  v_status text;
  v_skip_stock boolean;
  v_existing_id uuid;
  v_item jsonb;
  v_prod_raw text;
  v_prod_id uuid;
  v_parent_raw text;
  v_parent_id uuid;
  v_target_id uuid;
  v_pack_qty numeric;
  v_item_qty numeric;
  v_unit_price numeric;
  v_total_price numeric;
  v_item_name text;
  v_total_deduct numeric;
  v_uuid_pattern text := '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
BEGIN
  -- ---------------------------------------------------------------------------
  -- A. VALIDACIÓN DE AUTENTICACIÓN Y ROLES
  -- ---------------------------------------------------------------------------
  v_caller_role := current_setting('request.jwt.claim.role', true);
  IF v_caller_role IS NULL OR v_caller_role = '' THEN
    v_caller_role := auth.role();
  END IF;

  IF v_caller_role = 'anon' THEN
    RAISE EXCEPTION 'anon role is not authorized to execute sales transactions';
  END IF;

  IF v_caller_role <> 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'authentication required';
    END IF;

    v_caller_org := public.get_my_org_id();
    IF v_caller_org IS NULL THEN
      RAISE EXCEPTION 'organization context is required for authenticated user';
    END IF;
  END IF;

  -- ---------------------------------------------------------------------------
  -- B. PARSEO Y NORMALIZACIÓN DE CABECERA DE VENTA
  -- ---------------------------------------------------------------------------
  v_org_raw := COALESCE(p_sale->>'organization_id', p_sale->>'organizationId', '');
  IF v_org_raw ~* v_uuid_pattern THEN
    v_org_id := v_org_raw::uuid;
  ELSE
    v_org_id := v_caller_org;
  END IF;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'valid organization_id is required';
  END IF;

  IF v_caller_role <> 'service_role' AND v_caller_org IS DISTINCT FROM v_org_id THEN
    RAISE EXCEPTION 'cross-tenant sale execution denied (target %, caller %)', v_org_id, v_caller_org;
  END IF;

  -- Idempotencia: Verificar si esta venta ya fue procesada anteriormente
  v_mutation_id := NULLIF(trim(COALESCE(p_sale->>'client_mutation_id', p_options->>'client_mutation_id', '')), '');
  IF v_mutation_id IS NOT NULL THEN
    SELECT rs.id INTO v_existing_id
    FROM public.retail_sales rs
    WHERE rs.organization_id = v_org_id
      AND rs.client_mutation_id = v_mutation_id
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

  -- Extraer campos numéricos y textos
  v_total := COALESCE((p_sale->>'total')::numeric, 0);
  v_subtotal := COALESCE((p_sale->>'subtotal')::numeric, v_total);
  v_discounts := COALESCE((p_sale->>'discounts')::numeric, 0);
  v_tax := COALESCE((p_sale->>'tax')::numeric, 0);
  v_tip := COALESCE((p_sale->>'tip')::numeric, 0);
  v_payment_method := COALESCE(p_sale->>'payment_method', p_sale->>'paymentMethod', 'cash');
  v_tip_source := COALESCE(p_sale->>'tip_source', p_sale->>'tipSource', 'none');
  v_table_number := COALESCE((p_sale->>'table_number')::int, (p_sale->>'tableNumber')::int, 1);
  v_notes := p_sale->>'notes';
  v_status := COALESCE(p_sale->>'status', 'completed');
  v_skip_stock := COALESCE((p_options->>'skip_stock_deduction')::boolean, (p_options->>'skipStockDeduction')::boolean, false);

  -- Resolver usuario vendedor
  IF (p_sale->>'sale_by') ~* v_uuid_pattern THEN
    v_sale_by := (p_sale->>'sale_by')::uuid;
  ELSIF (p_sale->>'saleBy') ~* v_uuid_pattern THEN
    v_sale_by := (p_sale->>'saleBy')::uuid;
  ELSE
    v_sale_by := auth.uid();
  END IF;

  IF v_sale_by IS NULL THEN
    -- Fallback al primer usuario admin de la org si es service_role
    SELECT u.id INTO v_sale_by FROM public.users u WHERE u.organization_id = v_org_id LIMIT 1;
  END IF;

  -- Resolver cliente si aplica
  v_client_raw := COALESCE(p_sale->>'client_id', p_sale->>'clientId', '');
  IF v_client_raw ~* v_uuid_pattern THEN
    v_client_id := v_client_raw::uuid;
  ELSE
    v_client_id := NULL;
  END IF;

  -- Resolver sucursal si aplica
  v_branch_raw := COALESCE(p_sale->>'branch_id', p_sale->>'branchId', '');
  IF v_branch_raw ~* v_uuid_pattern THEN
    v_branch_id := v_branch_raw::uuid;
  ELSE
    v_branch_id := NULL;
  END IF;

  -- ---------------------------------------------------------------------------
  -- C. INSERTAR ENCABEZADO DE VENTA (retail_sales)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.retail_sales (
    organization_id,
    table_number,
    subtotal,
    discounts,
    tax,
    total,
    payment_method,
    tip,
    tip_source,
    sale_by,
    notes,
    client_id,
    branch_id,
    status,
    paid_amount,
    client_mutation_id,
    created_at
  ) VALUES (
    v_org_id,
    v_table_number,
    v_subtotal,
    v_discounts,
    v_tax,
    v_total,
    v_payment_method,
    v_tip,
    v_tip_source,
    v_sale_by,
    v_notes,
    v_client_id,
    v_branch_id,
    v_status,
    v_total,
    v_mutation_id,
    now()
  )
  RETURNING id INTO v_sale_id;

  -- ---------------------------------------------------------------------------
  -- D. INSERTAR PARTIDAS DE VENTA (retail_sale_items)
  -- ---------------------------------------------------------------------------
  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      v_prod_raw := COALESCE(v_item->>'productId', v_item->>'product_id', v_item->>'id', '');
      IF v_prod_raw ~* v_uuid_pattern THEN
        v_prod_id := v_prod_raw::uuid;
      ELSE
        v_prod_id := NULL;
      END IF;

      v_item_name := COALESCE(v_item->>'productName', v_item->>'product_name', v_item->>'name', 'Artículo manual');
      v_item_qty := COALESCE((v_item->>'quantity')::numeric, 1);
      v_unit_price := COALESCE((v_item->>'unitPrice')::numeric, (v_item->>'unit_price')::numeric, 0);
      v_total_price := COALESCE((v_item->>'totalPrice')::numeric, (v_item->>'total_price')::numeric, v_item_qty * v_unit_price);

      INSERT INTO public.retail_sale_items (
        sale_id,
        product_id,
        product_name,
        quantity,
        unit_price,
        total_price
      ) VALUES (
        v_sale_id,
        v_prod_id,
        v_item_name,
        v_item_qty,
        v_unit_price,
        v_total_price
      );
    END LOOP;
  END IF;

  -- ---------------------------------------------------------------------------
  -- E. REGISTRAR PAGO (retail_sale_payments)
  -- ---------------------------------------------------------------------------
  IF v_status <> 'pending' AND v_total > 0 THEN
    INSERT INTO public.retail_sale_payments (
      sale_id,
      organization_id,
      payment_method,
      amount,
      reference_id,
      created_at
    ) VALUES (
      v_sale_id,
      v_org_id,
      v_payment_method,
      v_total,
      p_sale->>'reference_id',
      now()
    );
  END IF;

  -- ---------------------------------------------------------------------------
  -- F. ACTUALIZAR ACUMULADO DE CLIENTE (clients.total_spent)
  -- ---------------------------------------------------------------------------
  IF v_client_id IS NOT NULL THEN
    UPDATE public.clients
    SET total_spent = COALESCE(total_spent, 0) + v_total,
        updated_at = now()
    WHERE id = v_client_id
      AND organization_id = v_org_id;
  END IF;

  -- ---------------------------------------------------------------------------
  -- G. DESCUENTO ATÓMICO DE INVENTARIO (retail_products & products)
  -- ---------------------------------------------------------------------------
  IF NOT v_skip_stock AND p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      v_prod_raw := COALESCE(v_item->>'productId', v_item->>'product_id', v_item->>'id', '');
      -- Ignorar artículos manuales o sin UUID válido
      IF v_prod_raw = '' OR v_prod_raw !~* v_uuid_pattern THEN
        CONTINUE;
      END IF;

      -- Verificar si el artículo tiene un producto padre (ej. paquete/caja de mayoreo)
      v_parent_raw := COALESCE(v_item->>'parentId', v_item->>'parent_id', '');
      IF v_parent_raw ~* v_uuid_pattern THEN
        v_target_id := v_parent_raw::uuid;
      ELSE
        v_target_id := v_prod_raw::uuid;
      END IF;

      v_pack_qty := COALESCE((v_item->>'packQuantity')::numeric, (v_item->>'pack_quantity')::numeric, 1);
      IF v_pack_qty <= 0 THEN v_pack_qty := 1; END IF;

      v_item_qty := COALESCE((v_item->>'quantity')::numeric, 1);
      v_total_deduct := v_item_qty * v_pack_qty;

      -- Actualizar en retail_products bloqueando la fila con FOR UPDATE
      PERFORM 1 FROM public.retail_products rp
      WHERE rp.id = v_target_id AND rp.organization_id = v_org_id
      FOR UPDATE;

      UPDATE public.retail_products rp
      SET current_stock = GREATEST(0, rp.current_stock - v_total_deduct),
          updated_at = now()
      WHERE rp.id = v_target_id
        AND rp.organization_id = v_org_id;

      -- Mantener sincronizada la tabla legacy products si el producto existe allí
      UPDATE public.products p
      SET current_stock = GREATEST(0, p.current_stock - v_total_deduct),
          updated_at = now()
      WHERE p.id = v_target_id
        AND p.organization_id = v_org_id;
    END LOOP;
  END IF;

  -- ---------------------------------------------------------------------------
  -- H. REGISTRO DE AUDITORÍA
  -- ---------------------------------------------------------------------------
  BEGIN
    INSERT INTO public.audit_logs (
      organization_id,
      action,
      entity_type,
      entity_id,
      user_id,
      details,
      created_at
    ) VALUES (
      v_org_id,
      'CREATE_RETAIL_SALE',
      'retail_sales',
      v_sale_id::text,
      v_sale_by,
      'Venta retail procesada atómicamente por total: $' || v_total::text,
      now()
    );
  EXCEPTION WHEN OTHERS THEN
    -- El fallo del registro de auditoría no debe cancelar una venta legítima
    NULL;
  END;

  -- ---------------------------------------------------------------------------
  -- I. RETORNO EXITOSO
  -- ---------------------------------------------------------------------------
  RETURN jsonb_build_object(
    'success', true,
    'sale_id', v_sale_id,
    'is_duplicate', false,
    'total', v_total
  );

EXCEPTION WHEN OTHERS THEN
  -- Cualquier excepción provoca un ROLLBACK automático de toda la transacción
  RAISE EXCEPTION 'Transaction failed processing retail sale: %', SQLERRM;
END;
$$;

-- 3. Asignación de permisos de ejecución con principio de mínimo privilegio
REVOKE ALL ON FUNCTION public.process_retail_sale_transaction(jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_retail_sale_transaction(jsonb, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.process_retail_sale_transaction(jsonb, jsonb, jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.process_retail_sale_transaction(jsonb, jsonb, jsonb)
  IS 'Procesa ventas retail en una única transacción PostgreSQL atómica con deduplicación por client_mutation_id, deducción de inventario, pagos y actualización de cliente.';
