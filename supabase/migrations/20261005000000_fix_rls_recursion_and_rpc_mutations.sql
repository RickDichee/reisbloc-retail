-- ==============================================================================
-- FIX CRÍTICO: RECURSIÓN INFINITA EN RLS Y RPCs DE MUTACIÓN (REISBLOC RETAIL)
-- Fecha: 2026-10-05
-- Descripción:
-- 1. Elimina la recursión infinita en RLS (error 42P17) sobre public.users y audit_logs
--    provocada por get_my_org_id() y users_select_policy.
-- 2. Reescribe get_my_org_id(), current_tenant_id(), is_admin() con STABLE SECURITY DEFINER
--    y search_path seguro para evitar bucles circulares.
-- 3. Crea e implementa update_retail_stock_batch() y update_stock_batch() tolerantes
--    a parámetros de frontend (productId/id, quantity/qty) con SECURITY DEFINER.
-- ==============================================================================

-- 1. DROP DE POLÍTICAS PROBLEMÁTICAS QUE CAUSAN RECURSIÓN
DROP POLICY IF EXISTS "users_select_policy" ON public.users CASCADE;
DROP POLICY IF EXISTS "Solo admins ven auditoria" ON public.audit_logs CASCADE;
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs CASCADE;
DROP POLICY IF EXISTS "audit_logs_select_policy_v2" ON public.audit_logs CASCADE;
DROP POLICY IF EXISTS "audit_logs_system_insert_only" ON public.audit_logs CASCADE;

-- 2. FUNCIONES DE RESOLUCIÓN LIBRES DE RECURSIÓN
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    (SELECT u.organization_id FROM public.users u WHERE u.id = auth.uid() LIMIT 1),
    NULLIF(auth.jwt()->>'org_id', '')::uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT public.get_my_org_id();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 1. Intentar resolver por JWT primero
  IF (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', auth.jwt() ->> 'role', '')) = 'admin' THEN
    RETURN true;
  END IF;

  -- 2. Verificación directa en BD con security definer
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'superuser') AND active = true
  );
END;
$$;

-- 3. RECONSTRUCCIÓN DE POLÍTICAS EN PUBLIC.USERS (NO RECURSIVAS)
CREATE POLICY "users_select_policy" ON public.users
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR organization_id = public.get_my_org_id()
);

DROP POLICY IF EXISTS "users_admin_manage_policy" ON public.users CASCADE;
CREATE POLICY "users_admin_manage_policy" ON public.users
FOR ALL TO authenticated
USING (
  organization_id = public.get_my_org_id()
  AND public.is_admin()
)
WITH CHECK (
  organization_id = public.get_my_org_id()
  AND public.is_admin()
);

-- 4. RECONSTRUCCIÓN DE POLÍTICAS EN PUBLIC.AUDIT_LOGS
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
FOR SELECT TO authenticated
USING (
  organization_id = public.get_my_org_id()
  AND public.is_admin()
);

CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = public.get_my_org_id()
  OR organization_id IS NULL
);

-- 5. RPC: UPDATE_RETAIL_STOCK_BATCH (MUTACIÓN DE STOCK PARA CHECKOUT RETAIL)
CREATE OR REPLACE FUNCTION public.update_retail_stock_batch(updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u jsonb;
  v_prod_id uuid;
  v_qty numeric;
BEGIN
  IF updates IS NULL OR jsonb_array_length(updates) = 0 THEN
    RETURN;
  END IF;

  FOR u IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    -- Tolerar tanto productId / quantity como id / qty
    v_prod_id := COALESCE(u->>'productId', u->>'id')::uuid;
    v_qty     := COALESCE(u->>'quantity', u->>'qty')::numeric;

    IF v_prod_id IS NOT NULL AND v_qty IS NOT NULL THEN
      -- Actualizar en retail_products si existe
      UPDATE public.retail_products
      SET current_stock = COALESCE(current_stock, 0) + v_qty,
          updated_at = NOW()
      WHERE id = v_prod_id;

      -- Actualizar también en products si aplica
      UPDATE public.products
      SET current_stock = COALESCE(current_stock, 0) + v_qty,
          updated_at = NOW()
      WHERE id = v_prod_id;
    END IF;
  END LOOP;
END;
$$;

-- 6. RPC: UPDATE_STOCK_BATCH (ACTUALIZACIÓN ROBUSTA DE STOCK BATCH GENERAL)
CREATE OR REPLACE FUNCTION public.update_stock_batch(updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u jsonb;
  v_prod_id uuid;
  v_qty numeric;
BEGIN
  IF updates IS NULL OR jsonb_array_length(updates) = 0 THEN
    RETURN;
  END IF;

  FOR u IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    -- Acepta ambas estructuras ({productId, quantity} o {id, qty})
    v_prod_id := COALESCE(u->>'productId', u->>'id')::uuid;
    v_qty     := COALESCE(u->>'quantity', u->>'qty')::numeric;

    IF v_prod_id IS NOT NULL AND v_qty IS NOT NULL THEN
      UPDATE public.retail_products
      SET current_stock = COALESCE(current_stock, 0) + v_qty,
          updated_at = NOW()
      WHERE id = v_prod_id;

      UPDATE public.products
      SET current_stock = COALESCE(current_stock, 0) + v_qty,
          updated_at = NOW()
      WHERE id = v_prod_id;
    END IF;
  END LOOP;
END;
$$;

-- Permisos de ejecución
GRANT EXECUTE ON FUNCTION public.get_my_org_id() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.update_retail_stock_batch(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_stock_batch(jsonb) TO authenticated, service_role;
