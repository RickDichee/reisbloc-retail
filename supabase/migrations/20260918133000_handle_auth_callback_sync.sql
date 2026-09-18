-- ==============================================================================
-- Migration: 20260918133000_handle_auth_callback_sync.sql
-- Description: Atomic backend OAuth / Auth callback synchronization
-- Resolves user by auth_uid, id, or email, links auth_uid, assigns Moda Miel
-- or creates new tenant organization with zero client-side RLS race conditions.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_auth_callback_sync(
  p_auth_uid uuid,
  p_email text,
  p_name text DEFAULT NULL::text,
  p_hostname text DEFAULT ''::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user record;
  v_org record;
  v_org_id uuid;
  v_is_modamiel boolean;
  v_is_admin boolean;
  v_user_name text;
  v_role text;
  v_mm_org_id uuid := '1b498fa6-aca5-428c-9bdd-01e6fea30316'::uuid;
  v_clean_email text;
  v_slug text;
BEGIN
  v_clean_email := lower(trim(COALESCE(p_email, '')));
  v_user_name := COALESCE(NULLIF(trim(p_name), ''), split_part(v_clean_email, '@', 1), 'Usuario');

  -- 1. Buscar si el usuario ya existe en public.users por auth_uid, id o email
  SELECT * INTO v_user
  FROM public.users u
  WHERE u.auth_uid = p_auth_uid
     OR u.id = p_auth_uid
     OR (v_clean_email <> '' AND lower(u.email) = v_clean_email)
  ORDER BY (CASE WHEN u.auth_uid = p_auth_uid THEN 1 WHEN u.id = p_auth_uid THEN 2 ELSE 3 END)
  LIMIT 1;

  -- 2. Si el usuario existe
  IF v_user.id IS NOT NULL THEN
    -- Asegurar que auth_uid esté enlazado
    IF v_user.auth_uid IS DISTINCT FROM p_auth_uid THEN
      UPDATE public.users
      SET auth_uid = p_auth_uid,
          email = COALESCE(email, v_clean_email),
          updated_at = now()
      WHERE id = v_user.id;
    END IF;

    -- Si es Lu o Rick o dominio Moda Miel y la org no está asignada, enlazar a Moda Miel
    IF v_user.organization_id IS NULL AND (
      v_clean_email LIKE '%lu.velazquez%' OR 
      v_clean_email = 'rick.playacar@gmail.com' OR 
      v_clean_email = 'airproject360@gmail.com' OR 
      lower(p_hostname) LIKE '%modamiel%'
    ) THEN
      UPDATE public.users
      SET organization_id = v_mm_org_id,
          role = 'admin',
          updated_at = now()
      WHERE id = v_user.id;
      v_user.organization_id := v_mm_org_id;
      v_user.role := 'admin';
    END IF;

    -- Si es Lu o Rick, garantizar rol de admin
    IF (v_clean_email LIKE '%lu.velazquez%' OR v_clean_email = 'rick.playacar@gmail.com' OR v_clean_email = 'airproject360@gmail.com') AND v_user.role <> 'admin' THEN
      UPDATE public.users
      SET role = 'admin',
          updated_at = now()
      WHERE id = v_user.id;
      v_user.role := 'admin';
    END IF;

    -- Obtener datos de la organización
    SELECT id, name, slug, logo_url, settings, plan INTO v_org
    FROM public.organizations
    WHERE id = v_user.organization_id;

    RETURN jsonb_build_object(
      'success', true,
      'user', jsonb_build_object(
        'id', v_user.id,
        'auth_uid', p_auth_uid,
        'name', v_user.name,
        'username', v_user.name,
        'email', v_user.email,
        'role', v_user.role,
        'organization_id', v_user.organization_id,
        'organizationId', v_user.organization_id,
        'active', v_user.active
      ),
      'organization', row_to_json(v_org)
    );
  END IF;

  -- 3. Si NO existe usuario en public.users
  v_is_modamiel := (
    lower(p_hostname) LIKE '%modamiel%' OR 
    v_clean_email LIKE '%lu.velazquez%' OR 
    v_clean_email = 'rick.playacar@gmail.com' OR 
    v_clean_email = 'airproject360@gmail.com'
  );
  
  IF v_is_modamiel THEN
    v_org_id := v_mm_org_id;
    v_role := CASE WHEN (
      v_clean_email LIKE '%lu.velazquez%' OR 
      v_clean_email = 'rick.playacar@gmail.com' OR 
      v_clean_email = 'airproject360@gmail.com'
    ) THEN 'admin' ELSE 'cashier' END;
    v_is_admin := (v_role = 'admin');

    INSERT INTO public.users (
      id, auth_uid, email, name, role, organization_id, active, is_primary_admin, is_primary_user
    ) VALUES (
      p_auth_uid, p_auth_uid, v_clean_email, v_user_name, v_role, v_org_id, true, v_is_admin, v_is_admin
    )
    ON CONFLICT (id) DO UPDATE
      SET auth_uid = p_auth_uid, email = v_clean_email, active = true
    RETURNING * INTO v_user;

    SELECT id, name, slug, logo_url, settings, plan INTO v_org
    FROM public.organizations
    WHERE id = v_org_id;

    RETURN jsonb_build_object(
      'success', true,
      'user', jsonb_build_object(
        'id', v_user.id,
        'auth_uid', p_auth_uid,
        'name', v_user.name,
        'username', v_user.name,
        'email', v_user.email,
        'role', v_user.role,
        'organization_id', v_user.organization_id,
        'organizationId', v_user.organization_id,
        'active', v_user.active
      ),
      'organization', row_to_json(v_org)
    );
  ELSE
    -- Nuevo tenant SaaS: Crear organización y usuario admin
    v_slug := regexp_replace(lower(v_user_name), '[^a-z0-9]+', '-', 'g');
    v_slug := trim(both '-' from v_slug);
    IF v_slug = '' THEN v_slug := 'tienda'; END IF;
    v_slug := v_slug || '-' || substr(md5(random()::text), 1, 6);

    INSERT INTO public.organizations (name, slug, plan, active)
    VALUES ('Negocio de ' || v_user_name, v_slug, 'free', true)
    RETURNING id, name, slug, logo_url, settings, plan INTO v_org;

    INSERT INTO public.users (
      id, auth_uid, email, name, role, organization_id, active, is_primary_admin, is_primary_user
    ) VALUES (
      p_auth_uid, p_auth_uid, v_clean_email, v_user_name, 'admin', v_org.id, true, true, true
    )
    ON CONFLICT (id) DO UPDATE
      SET auth_uid = p_auth_uid, organization_id = v_org.id, role = 'admin', active = true
    RETURNING * INTO v_user;

    RETURN jsonb_build_object(
      'success', true,
      'user', jsonb_build_object(
        'id', v_user.id,
        'auth_uid', p_auth_uid,
        'name', v_user.name,
        'username', v_user.name,
        'email', v_user.email,
        'role', v_user.role,
        'organization_id', v_user.organization_id,
        'organizationId', v_user.organization_id,
        'active', v_user.active
      ),
      'organization', row_to_json(v_org)
    );
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.handle_auth_callback_sync(uuid, text, text, text) TO anon, authenticated, service_role;
