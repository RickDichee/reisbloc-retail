-- ==============================================================================
-- Migration: 20261103000000_harden_sanjudas_tenant_auth_callback.sql
-- Description: Blindaje multi-tenant estricto para Juguetes San Judas Tadeo
-- Auto-enlace garantizado para americahernandez9076@gmail.com,
-- sanjudastadeojuguetesynovedade@gmail.com y dominios de San Judas Tadeo
-- ==============================================================================

-- 1. Garantizar que la organización San Judas Tadeo exista en public.organizations
INSERT INTO public.organizations (
  id, name, slug, logo_url, plan, status, active, settings
) VALUES (
  '324fd41f-b8af-4aef-9ea6-2f954350775a'::uuid,
  'Juguetes y Novedades San Judas Tadeo',
  'sanjudastadeo',
  '/images/juguetes-san-judas-logo.jpeg',
  'pro',
  'active',
  true,
  jsonb_build_object(
    'businessName', 'Juguetes y Novedades San Judas Tadeo',
    'tagline', '¡El juguete de tus sueños te espera!',
    'ticketBusinessName', 'Juguetes y Novedades San Judas Tadeo',
    'ticketAddress', 'SAN JUDAS TADEO',
    'ticketPhone', '(442) 600-3500',
    'ticketLogoUrl', '/images/sanjudas-ticket-logo.png',
    'ticketFooter', 'NO HAY CAMBIOS NI DEVOLUCIONES UNA VEZ SALIDA LA MERCANCÍA · REVISE SU JUGUETE ANTES DE RETIRARSE',
    'brand', 'juguetes'
  )
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  logo_url = EXCLUDED.logo_url,
  active = true,
  settings = COALESCE(public.organizations.settings, '{}'::jsonb) || EXCLUDED.settings;

-- 2. Actualizar función RPC con blindaje para San Judas Tadeo y Los Chunches
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
  v_is_sanjudas boolean;
  v_is_chunches boolean;
  v_is_admin boolean;
  v_user_name text;
  v_role text;
  v_mm_org_id uuid := '1b498fa6-aca5-428c-9bdd-01e6fea30316'::uuid;
  v_jg_org_id uuid := '324fd41f-b8af-4aef-9ea6-2f954350775a'::uuid;
  v_lc_org_id uuid := 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid;
  v_clean_email text;
  v_slug text;
BEGIN
  v_clean_email := lower(trim(COALESCE(p_email, '')));
  v_user_name := COALESCE(NULLIF(trim(p_name), ''), split_part(v_clean_email, '@', 1), 'Usuario');

  -- Flags de detección por correo o dominio de origen
  v_is_sanjudas := (
    v_clean_email = 'americahernandez9076@gmail.com' OR
    v_clean_email = 'sanjudastadeojuguetesynovedade@gmail.com' OR
    v_clean_email = 'ramendanielle@gmail.com' OR
    v_clean_email = 'evelin601h2@gmail.com' OR
    v_clean_email LIKE '%sanjudas%' OR
    v_clean_email LIKE '%judastadeo%' OR
    v_clean_email LIKE '%juguetes%' OR
    lower(p_hostname) LIKE '%sanjudas%' OR
    lower(p_hostname) LIKE '%juguetes%'
  );

  v_is_modamiel := (
    lower(p_hostname) LIKE '%modamiel%' OR 
    v_clean_email LIKE '%lu.velazquez%' OR 
    v_clean_email = 'rick.playacar@gmail.com' OR 
    v_clean_email = 'airproject360@gmail.com'
  );

  v_is_chunches := (
    lower(p_hostname) LIKE '%chunches%' OR
    v_clean_email LIKE '%loschunchesdecons%' OR
    v_clean_email LIKE '%chunches%'
  );

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

    -- 🛡️ Si es usuario de San Judas Tadeo y tiene org incorrecta o nula, enlazar a San Judas Tadeo
    IF v_is_sanjudas AND (v_user.organization_id IS NULL OR v_user.organization_id IS DISTINCT FROM v_jg_org_id) THEN
      v_role := CASE WHEN (
        v_clean_email = 'sanjudastadeojuguetesynovedade@gmail.com' OR
        v_clean_email = 'americahernandez9076@gmail.com' OR
        v_clean_email = 'ramendanielle@gmail.com'
      ) THEN 'admin' ELSE COALESCE(v_user.role, 'cashier') END;

      UPDATE public.users
      SET organization_id = v_jg_org_id,
          role = v_role,
          active = true,
          updated_at = now()
      WHERE id = v_user.id;
      v_user.organization_id := v_jg_org_id;
      v_user.role := v_role;
    END IF;

    -- Si es Lu o Rick o dominio Moda Miel y la org no está asignada, enlazar a Moda Miel
    IF v_user.organization_id IS NULL AND v_is_modamiel THEN
      UPDATE public.users
      SET organization_id = v_mm_org_id,
          role = 'admin',
          updated_at = now()
      WHERE id = v_user.id;
      v_user.organization_id := v_mm_org_id;
      v_user.role := 'admin';
    END IF;

    -- Si es Los Chunches y la org no está asignada, enlazar a Los Chunches
    IF v_user.organization_id IS NULL AND v_is_chunches THEN
      UPDATE public.users
      SET organization_id = v_lc_org_id,
          role = COALESCE(v_user.role, 'cashier'),
          updated_at = now()
      WHERE id = v_user.id;
      v_user.organization_id := v_lc_org_id;
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
  IF v_is_sanjudas THEN
    v_org_id := v_jg_org_id;
    v_role := CASE WHEN (
      v_clean_email = 'sanjudastadeojuguetesynovedade@gmail.com' OR
      v_clean_email = 'americahernandez9076@gmail.com' OR
      v_clean_email = 'ramendanielle@gmail.com'
    ) THEN 'admin' ELSE 'cashier' END;
    v_is_admin := (v_role = 'admin');

    INSERT INTO public.users (
      id, auth_uid, email, name, role, organization_id, active, is_primary_admin, is_primary_user
    ) VALUES (
      p_auth_uid, p_auth_uid, v_clean_email, v_user_name, v_role, v_org_id, true, v_is_admin, v_is_admin
    )
    ON CONFLICT (id) DO UPDATE
      SET auth_uid = p_auth_uid, email = v_clean_email, organization_id = v_org_id, active = true
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

  ELSIF v_is_modamiel THEN
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

  ELSIF v_is_chunches THEN
    v_org_id := v_lc_org_id;
    v_role := CASE WHEN v_clean_email LIKE 'admin%' THEN 'admin' ELSE 'cashier' END;
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
