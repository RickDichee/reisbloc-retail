-- =============================================================================
-- REISBLOC RETAIL - MIGRACIÓN DE POLÍTICAS MULTI-TENANT PARA TABLA ORDERS
-- Fecha: 2026-09-07
-- Propósito:
--   1. Eliminar políticas heredadas ('Orders_Zen_Policy', etc.) que causaban
--      errores HTTP 403 al crear o consultar pedidos en modo multi-tenant.
--   2. Habilitar RLS estricto en "orders" basado en organization_id = get_my_org_id().
-- =============================================================================

-- 1. Eliminar políticas heredadas en "orders"
DROP POLICY IF EXISTS "Orders_Zen_Policy" ON "public"."orders";
DROP POLICY IF EXISTS "orders_policy" ON "public"."orders";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."orders";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."orders";
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON "public"."orders";
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON "public"."orders";
DROP POLICY IF EXISTS "orders_org_select" ON "public"."orders";
DROP POLICY IF EXISTS "orders_org_insert" ON "public"."orders";
DROP POLICY IF EXISTS "orders_org_update" ON "public"."orders";
DROP POLICY IF EXISTS "orders_org_delete" ON "public"."orders";

-- 2. Asegurar RLS activado
ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas RLS multi-tenant aisladas
CREATE POLICY "orders_org_select" ON "public"."orders"
    FOR SELECT TO "authenticated"
    USING (organization_id = "public"."get_my_org_id"());

CREATE POLICY "orders_org_insert" ON "public"."orders"
    FOR INSERT TO "authenticated"
    WITH CHECK (organization_id = "public"."get_my_org_id"());

CREATE POLICY "orders_org_update" ON "public"."orders"
    FOR UPDATE TO "authenticated"
    USING (organization_id = "public"."get_my_org_id"())
    WITH CHECK (organization_id = "public"."get_my_org_id"());

CREATE POLICY "orders_org_delete" ON "public"."orders"
    FOR DELETE TO "authenticated"
    USING (organization_id = "public"."get_my_org_id"());
