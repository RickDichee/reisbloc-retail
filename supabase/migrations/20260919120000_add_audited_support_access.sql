-- =============================================================================
-- Audited, tenant-scoped platform support access.
-- Only the named support account receives memberships for organizations that
-- exist when this migration is applied. Tenant admins remain tenant-scoped.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.platform_support_access (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_email text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  PRIMARY KEY (organization_id, account_email),
  CHECK (account_email = lower(account_email))
);

ALTER TABLE public.platform_support_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_support_access FROM anon, authenticated;

INSERT INTO public.platform_support_access (organization_id, account_email)
SELECT id, 'hunab.arredondo@gmail.com'
FROM public.organizations
ON CONFLICT (organization_id, account_email) DO UPDATE
SET active = true, revoked_at = NULL;

-- Only this account is a platform superadmin. Existing tenant administrators
-- keep their tenant admin role; former global superadmins are demoted.
UPDATE public.users
SET role = 'admin', updated_at = now()
WHERE role IN ('superadmin', 'superuser')
  AND lower(COALESCE(email, '')) <> 'hunab.arredondo@gmail.com';

UPDATE public.users
SET role = 'superadmin', active = true, updated_at = now()
WHERE lower(email) = 'hunab.arredondo@gmail.com';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE lower(email) = 'hunab.arredondo@gmail.com' AND active = true) THEN
    RAISE EXCEPTION 'Support account hunab.arredondo@gmail.com must exist in public.users before enabling support access';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_platform_support_for_org(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_support_access psa
    WHERE psa.organization_id = p_organization_id
      AND psa.active = true
      AND psa.account_email = lower(COALESCE(auth.jwt() ->> 'email', ''))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_support()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_support_access psa
    WHERE psa.active = true
      AND psa.account_email = lower(COALESCE(auth.jwt() ->> 'email', ''))
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_support_for_org(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_platform_support() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_support_for_org(uuid), public.is_platform_support() TO authenticated, service_role;

-- The support user may select the organizations to which it was explicitly
-- granted access. No write policy is added for organizations themselves.
CREATE POLICY organizations_platform_support_read ON public.organizations
  FOR SELECT TO authenticated
  USING (public.is_platform_support_for_org(id));

CREATE POLICY users_platform_support_access ON public.users
  FOR ALL TO authenticated
  USING (public.is_platform_support_for_org(organization_id))
  WITH CHECK (public.is_platform_support_for_org(organization_id));

CREATE POLICY clients_platform_support_access ON public.clients
  FOR ALL TO authenticated
  USING (public.is_platform_support_for_org(organization_id))
  WITH CHECK (public.is_platform_support_for_org(organization_id));

CREATE POLICY orders_platform_support_access ON public.orders
  FOR ALL TO authenticated
  USING (public.is_platform_support_for_org(organization_id))
  WITH CHECK (public.is_platform_support_for_org(organization_id));

CREATE POLICY audit_logs_platform_support_read ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_platform_support_for_org(organization_id));

CREATE POLICY closings_platform_support_access ON public.closings
  FOR ALL TO authenticated
  USING (public.is_platform_support_for_org(organization_id))
  WITH CHECK (public.is_platform_support_for_org(organization_id));

CREATE POLICY shifts_platform_support_access ON public.shifts
  FOR ALL TO authenticated
  USING (public.is_platform_support_for_org(organization_id))
  WITH CHECK (public.is_platform_support_for_org(organization_id));

CREATE POLICY suppliers_platform_support_access ON public.suppliers
  FOR ALL TO authenticated
  USING (public.is_platform_support_for_org(organization_id))
  WITH CHECK (public.is_platform_support_for_org(organization_id));

DO $$
BEGIN
  IF to_regclass('public.branches') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY branches_platform_support_access ON public.branches
      FOR ALL TO authenticated
      USING (public.is_platform_support_for_org(organization_id))
      WITH CHECK (public.is_platform_support_for_org(organization_id))';
  END IF;
END $$;

-- Extend the previous hardening policies without granting any other admin a
-- cross-tenant bypass.
ALTER POLICY products_tenant_read ON public.products
  USING (organization_id = public.get_my_org_id() OR public.is_platform_support_for_org(organization_id));
ALTER POLICY products_tenant_write ON public.products
  USING (
    (organization_id = public.get_my_org_id() AND public.get_my_role() IN ('admin', 'owner', 'manager', 'supervisor', 'gerente'))
    OR public.is_platform_support_for_org(organization_id)
  )
  WITH CHECK (
    (organization_id = public.get_my_org_id() AND public.get_my_role() IN ('admin', 'owner', 'manager', 'supervisor', 'gerente'))
    OR public.is_platform_support_for_org(organization_id)
  );
ALTER POLICY retail_products_tenant_read ON public.retail_products
  USING (organization_id = public.get_my_org_id() OR public.is_platform_support_for_org(organization_id));
ALTER POLICY retail_products_tenant_write ON public.retail_products
  USING (
    (organization_id = public.get_my_org_id() AND public.get_my_role() IN ('admin', 'owner', 'manager', 'supervisor', 'gerente'))
    OR public.is_platform_support_for_org(organization_id)
  )
  WITH CHECK (
    (organization_id = public.get_my_org_id() AND public.get_my_role() IN ('admin', 'owner', 'manager', 'supervisor', 'gerente'))
    OR public.is_platform_support_for_org(organization_id)
  );
ALTER POLICY retail_sales_tenant_read ON public.retail_sales
  USING (organization_id = public.get_my_org_id() OR public.is_platform_support_for_org(organization_id));
ALTER POLICY retail_sale_payments_tenant_read ON public.retail_sale_payments
  USING (organization_id = public.get_my_org_id() OR public.is_platform_support_for_org(organization_id));
ALTER POLICY retail_sale_items_tenant_read ON public.retail_sale_items
  USING (EXISTS (
    SELECT 1 FROM public.retail_sales s
    WHERE s.id = retail_sale_items.sale_id
      AND (s.organization_id = public.get_my_org_id() OR public.is_platform_support_for_org(s.organization_id))
  ));
