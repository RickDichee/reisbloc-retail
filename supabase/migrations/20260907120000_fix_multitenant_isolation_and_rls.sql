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
DROP POLICY IF EXISTS "sales_org_select" ON "public"."sales";
DROP POLICY IF EXISTS "sales_org_insert" ON "public"."sales";
DROP POLICY IF EXISTS "sales_org_update" ON "public"."sales";
DROP POLICY IF EXISTS "sales_org_delete" ON "public"."sales";

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
DROP POLICY IF EXISTS "closings_org_select" ON "public"."closings";
DROP POLICY IF EXISTS "closings_org_insert" ON "public"."closings";
DROP POLICY IF EXISTS "closings_org_update" ON "public"."closings";

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
DROP POLICY IF EXISTS "devices_insert_policy" ON "public"."devices";
DROP POLICY IF EXISTS "devices_org_select" ON "public"."devices";
DROP POLICY IF EXISTS "devices_org_insert" ON "public"."devices";
DROP POLICY IF EXISTS "devices_org_update" ON "public"."devices";
DROP POLICY IF EXISTS "devices_org_delete" ON "public"."devices";

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
DROP POLICY IF EXISTS "products_org_select" ON "public"."products";
DROP POLICY IF EXISTS "products_public_store_select" ON "public"."products";
DROP POLICY IF EXISTS "products_org_insert" ON "public"."products";
DROP POLICY IF EXISTS "products_org_update" ON "public"."products";
DROP POLICY IF EXISTS "products_org_delete" ON "public"."products";

ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;

-- Lectura: los miembros ven los productos de su organización
CREATE POLICY "products_org_select" ON "public"."products"
    FOR SELECT TO "authenticated"
    USING (organization_id = "public"."get_my_org_id"());

-- Lectura anónima/pública controlada: si existe la tabla stores (e-commerce storefront), permitir lectura de productos de tiendas públicas
DO $$
BEGIN
    IF to_regclass('public.stores') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS "products_public_store_select" ON "public"."products";
                 CREATE POLICY "products_public_store_select" ON "public"."products"
                     FOR SELECT TO "anon"
                     USING (
                         active = true 
                         AND EXISTS (
                             SELECT 1 FROM "public"."stores" s 
                             WHERE s.organization_id = "public"."products".organization_id 
                             AND s.is_public = true
                         )
                     );';
    END IF;
END $$;

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
-- 7. HABILITAR RLS Y POLÍTICA EN "ecosystem_events" (SI EXISTE)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.ecosystem_events') IS NOT NULL AND to_regclass('public.stores') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE "public"."ecosystem_events" ENABLE ROW LEVEL SECURITY;
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
                     );';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 8. ASEGURAR WEBHOOK_LOGS, REFERRAL_CREDITS Y REFERRALS (SI EXISTEN)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.webhook_logs') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE "public"."webhook_logs" ENABLE ROW LEVEL SECURITY;
                 DROP POLICY IF EXISTS "Users can view webhook logs" ON "public"."webhook_logs";
                 DROP POLICY IF EXISTS "webhook_logs_admin_select" ON "public"."webhook_logs";
                 CREATE POLICY "webhook_logs_admin_select" ON "public"."webhook_logs"
                     FOR SELECT TO "authenticated"
                     USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = ''admin''));';
    END IF;

    IF to_regclass('public.referral_credits') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE "public"."referral_credits" ENABLE ROW LEVEL SECURITY;
                 DROP POLICY IF EXISTS "Service can insert credits" ON "public"."referral_credits";
                 DROP POLICY IF EXISTS "referral_credits_service_insert" ON "public"."referral_credits";
                 CREATE POLICY "referral_credits_service_insert" ON "public"."referral_credits"
                     FOR INSERT TO "service_role"
                     WITH CHECK (true);';
    END IF;

    IF to_regclass('public.referrals') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE "public"."referrals" ENABLE ROW LEVEL SECURITY;
                 DROP POLICY IF EXISTS "Service can update referrals" ON "public"."referrals";
                 DROP POLICY IF EXISTS "referrals_service_update" ON "public"."referrals";
                 CREATE POLICY "referrals_service_update" ON "public"."referrals"
                     FOR UPDATE TO "service_role"
                     USING (true)
                     WITH CHECK (true);';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 9. ELIMINACIÓN DE ÍNDICES REDUNDANTES / DUPLICADOS (SI EXISTEN)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.organization_members') IS NOT NULL THEN
        EXECUTE 'DROP INDEX IF EXISTS public.org_member_org_user_uidx;';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 10. REVOCAR EJECUCIÓN PÚBLICA DE TRIGGERS/FUNCIONES INTERNAS (PostgREST RPC)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rls_auto_enable') THEN
        EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM public, anon, authenticated;';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_user_role_to_auth') THEN
        EXECUTE 'REVOKE EXECUTE ON FUNCTION public.sync_user_role_to_auth() FROM public, anon, authenticated;';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'universal_audit_trigger') THEN
        EXECUTE 'REVOKE EXECUTE ON FUNCTION public.universal_audit_trigger() FROM public, anon, authenticated;';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 11. ÍNDICES DE RENDIMIENTO B-TREE PARA CONSULTAS MULTI-TENANT DE ALTO TRÁFICO
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sales_org_created ON public.sales (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_closings_org_created ON public.closings (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_org ON public.clients (organization_id);
CREATE INDEX IF NOT EXISTS idx_devices_org ON public.devices (organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON public.audit_logs (organization_id, created_at DESC);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'sku') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_products_org_sku ON public.products (organization_id, sku);';
    ELSE
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_products_org_name ON public.products (organization_id, name);';
    END IF;
END $$;

