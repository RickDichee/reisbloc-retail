-- ==============================================================================
-- Migration: 20261106100000_allow_org_admins_update_users.sql
-- Description: Permitir a administradores de cada tenant gestionar a su personal (RLS)
-- y robustecer la resolución de get_my_org_id() y get_my_role()
-- ==============================================================================

-- 1. Robustecer get_my_org_id() para considerar tanto id como auth_uid
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- 1. Buscar en public.users por auth_uid o id
  SELECT organization_id INTO v_org_id
  FROM public.users
  WHERE (id = auth.uid() OR auth_uid = auth.uid())
    AND active = true
  LIMIT 1;

  -- 2. Fallback a claim en JWT si existe
  IF v_org_id IS NULL THEN
    BEGIN
      v_org_id := (auth.jwt() ->> 'organization_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_org_id := NULL;
    END;
  END IF;

  RETURN v_org_id;
END;
$$;

-- 2. Robustecer get_my_role()
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM public.users
  WHERE (id = auth.uid() OR auth_uid = auth.uid())
    AND active = true
  LIMIT 1;

  RETURN COALESCE(v_role, auth.jwt() ->> 'role', 'cashier');
END;
$$;

-- 3. Habilitar política de UPDATE en public.users
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
CREATE POLICY "users_update_policy" ON public.users
FOR UPDATE TO authenticated
USING (
  -- El administrador o gerente de la misma organización puede actualizar a sus usuarios
  (
    organization_id = public.get_my_org_id()
    AND public.get_my_role() IN ('admin', 'owner', 'superadmin', 'manager')
  )
  -- O el propio usuario puede actualizar su propio perfil
  OR (id = auth.uid() OR auth_uid = auth.uid())
)
WITH CHECK (
  -- No permitir mover usuarios entre organizaciones distintas
  organization_id = public.get_my_org_id()
  OR (id = auth.uid() OR auth_uid = auth.uid())
);

-- 4. Habilitar política de DELETE en public.users
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;
CREATE POLICY "users_delete_policy" ON public.users
FOR DELETE TO authenticated
USING (
  organization_id = public.get_my_org_id()
  AND public.get_my_role() IN ('admin', 'owner', 'superadmin')
);

-- 5. Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.get_my_org_id() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, anon, service_role;
