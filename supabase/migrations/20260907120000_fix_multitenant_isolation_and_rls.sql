-- =============================================================================
-- REISBLOC RETAIL - MIGRACIÓN CRÍTICA DE SEGURIDAD Y AISLAMIENTO MULTI-TENANT
-- Fecha: 2026-09-07
-- Propósito:
--   1. Eliminar todas las políticas RLS 'USING (true)' heredadas o de depuración
--      que rompen el aislamiento entre organizaciones.
--   2. Optimizar la función get_my_org_id() marcándola como STABLE.
--   3. Establecer políticas estrictas de aislamiento por organization_id.
--   4. Habilitar RLS en ecosystem_events.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. OPTIMIZAR get_my_org_id() COMO STABLE
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."get_my_org_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
  RETURN (
    SELECT organization_id
    FROM public.users
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. LIMPIEZA TOTAL DE POLÍTICAS INSEGURAS EN "sales"
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "public"."sales";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."sales";
DROP POLICY IF EXISTS "Enable insert for sales" ON "public"."sales";
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "public"."sales";
DROP POLICY IF EXISTS "Enable read for sales" ON "public"."sales";
DROP POLICY IF EXISTS "Acceso por organizacion" ON "public"."sales";
DROP POLICY IF EXISTS "Admins_manage_sales" ON "public"."sales";
DROP POLICY IF EXISTS "Device_based_insert_sales" ON "public"."sales";
DROP POLICY IF EXISTS "Manager can view sales and billing" ON "public"."sales";
DROP POLICY IF EXISTS "Managers_view_org_metrics" ON "public"."sales";
DROP POLICY IF EXISTS "Ventas: Registrar solo autenticados" ON "public"."sales";
DROP POLICY IF EXISTS "Ventas: Ver solo misma org" ON "public"."sales";

ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_org_select" ON "public"."sales"
    FOR SELECT TO "authenticated"
    USING (organization_id = "public"."get_my_org_id"());

CREATE POLICY "sales_org_insert" ON "public"."sales"
    FOR INSERT TO "authenticated"
    WITH CHECK (organization_id = "public"."get_my_org_id"());

CREATE POLICY "sales_org_update" ON "public"."sales"
    FOR UPDATE TO "authenticated"
    USING (organization_id = "public"."get_my_org_id"())
    WITH CHECK (organization_id = "public"."get_my_org_id"());

CREATE POLICY "sales_org_delete" ON "public"."sales"
    FOR DELETE TO "authenticated"
    USING (organization_id = "public"."get_my_org_id"());

-- -----------------------------------------------------------------------------
-- 3. LIMPIEZA TOTAL DE POLÍTICAS INSEGURAS EN "closings" (Cierres de Caja)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "public"."closings";
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "public"."closings";
DROP POLICY IF EXISTS "Acceso por organizacion" ON "public"."closings";

ALTER TABLE "public"."closings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "closings_org_select" ON "public"."closings"
    FOR SELECT TO "authenticated"
    USING (organization_id = "public"."get_my_org_id"());

CREATE POLICY "closings_org_insert" ON "public"."closings"
    FOR INSERT TO "authenticated"
    WITH CHECK (organization_id = "public"."get_my_org_id"());

CREATE POLICY "closings_org_update" ON "public"."closings"
    FOR UPDATE TO "authenticated"
    USING (organization_id = "public"."get_my_org_id"())
    WITH CHECK (organization_id = "public"."get_my_org_id"());

-- -----------------------------------------------------------------------------
-- 4. LIMPIEZA TOTAL DE POLÍTICAS INSEGURAS EN "devices"
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable insert for devices" ON "public"."devices";
DROP POLICY IF EXISTS "Enable read access for devices" ON "public"."devices";
DROP POLICY IF EXISTS "Enable update for authenticated users" ON "public"."devices";
DROP POLICY IF EXISTS "Enable update for devices" ON "public"."devices";
DROP POLICY IF EXISTS "Acceso por organizacion" ON "public"."devices";
DROP POLICY IF EXISTS "Devices_Zen_Policy" ON "public"."devices";
DROP POLICY IF EXISTS "Dispositivos: Registro inicial" ON "public"."devices";
DROP POLICY IF EXISTS "Org: Gestionar dispositivos" ON "public"."devices";
DROP POLICY IF EXISTS "Org: Ver dispositivos" ON "public"."devices";

ALTER TABLE "public"."devices" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "devices_org_select" ON "public"."devices"
    FOR SELECT TO "authenticated"
    USING (organization_id = "public"."get_my_org_id"());

CREATE POLICY "devices_org_insert" ON "public"."devices"
    FOR INSERT TO "authenticated"
    WITH CHECK (organization_id = "public"."get_my_org_id"());

CREATE POLICY "devices_org_update" ON "public"."devices"
    FOR UPDATE TO "authenticated"
    USING (organization_id = "public"."get_my_org_id"())
    WITH CHECK (organization_id = "public"."get_my_org_id"());

CREATE POLICY "devices_org_delete" ON "public"."devices"
    FOR DELETE TO "authenticated"
    USING (organization_id = "public"."get_my_org_id"());

-- -----------------------------------------------------------------------------
-- 5. LIMPIEZA TOTAL DE POLÍTICAS EN "products"
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable update for staff" ON "public"."products";
DROP POLICY IF EXISTS "Acceso por organizacion" ON "public"."products";
DROP POLICY IF EXISTS "Admins can manage products" ON "public"."products";
DROP POLICY IF EXISTS "Admins_view_all_products" ON "public"."products";
DROP POLICY IF EXISTS "Lectura pública de productos" ON "public"."products";
DROP POLICY IF EXISTS "Manager can manage products" ON "public"."products";
DROP POLICY IF EXISTS "Org: Gestionar productos" ON "public"."products";
DROP POLICY IF EXISTS "Org: Ver productos" ON "public"."products";

ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;

-- Lectura: los miembros ven los productos de su organización
CREATE POLICY "products_org_select" ON "public"."products"
    FOR SELECT TO "authenticated"
    USING (organization_id = "public"."get_my_org_id"());

-- Lectura anónima/pública controlada: solo productos activos de tiendas públicas
CREATE POLICY "products_public_store_select" ON "public"."products"
    FOR SELECT TO "anon"
    USING (
        active = true 
        AND EXISTS (
            SELECT 1 FROM "public"."stores" s 
            WHERE s.organization_id = "public"."products".organization_id 
            AND s.is_public = true
        )
    );

CREATE POLICY "products_org_insert" ON "public"."products"
    FOR INSERT TO "authenticated"
    WITH CHECK (organization_id = "public"."get_my_org_id"());

CREATE POLICY "products_org_update" ON "public"."products"
    FOR UPDATE TO "authenticated"
    USING (organization_id = "public"."get_my_org_id"())
    WITH CHECK (organization_id = "public"."get_my_org_id"());

CREATE POLICY "products_org_delete" ON "public"."products"
    FOR DELETE TO "authenticated"
    USING (organization_id = "public"."get_my_org_id"());

-- -----------------------------------------------------------------------------
-- 6. CORRECCIÓN DE POLÍTICAS EN "audit_logs"
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "audit_logs_org_insert" ON "public"."audit_logs";
DROP POLICY IF EXISTS "audit_logs_org_select" ON "public"."audit_logs";

ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_org_insert" ON "public"."audit_logs"
    FOR INSERT TO "authenticated"
    WITH CHECK (organization_id = "public"."get_my_org_id"());

CREATE POLICY "audit_logs_org_select" ON "public"."audit_logs"
    FOR SELECT TO "authenticated"
    USING (organization_id = "public"."get_my_org_id"());

-- -----------------------------------------------------------------------------
-- 7. HABILITAR RLS Y POLÍTICA EN "ecosystem_events"
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS "public"."ecosystem_events" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ecosystem_events_party_select" ON "public"."ecosystem_events";
CREATE POLICY "ecosystem_events_party_select" ON "public"."ecosystem_events"
    FOR SELECT TO "authenticated"
    USING (
        wholesaler_id = auth.uid()
        OR store_id IN (
            SELECT s.id FROM "public"."stores" s 
            WHERE s.organization_id = "public"."get_my_org_id"()
        )
    );

DROP POLICY IF EXISTS "ecosystem_events_store_insert" ON "public"."ecosystem_events";
CREATE POLICY "ecosystem_events_store_insert" ON "public"."ecosystem_events"
    FOR INSERT TO "authenticated"
    WITH CHECK (
        store_id IN (
            SELECT s.id FROM "public"."stores" s 
            WHERE s.organization_id = "public"."get_my_org_id"()
        )
    );
