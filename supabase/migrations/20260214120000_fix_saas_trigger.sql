-- 🛠️ MEJORA DEL TRIGGER DE REGISTRO SAAS (Reubicado)
-- Este trigger se encarga de crear la organización automáticamente cuando un usuario se registra vía Supabase Auth.

-- Asegurar que tenemos las herramientas de encriptación
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

-- Asegurar que el tipo plan_type existe (por si la migración base falló o no llegó)
DO $$ BEGIN
    CREATE TYPE public.plan_type AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 🚨 FIX CRÍTICO: Redefinir check_organization_limits para usar public.plan_type explícitamente
-- El error "type plan_type does not exist" ocurría porque esta función se disparaba al insertar el usuario
-- y no encontraba el tipo al no tener el search_path configurado correctamente.
CREATE OR REPLACE FUNCTION "public"."check_organization_limits"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, extensions
    AS $function$
DECLARE
    v_plan_text text;
    v_current_count integer;
    v_max_allowed integer;
BEGIN
    -- Obtener el plan de la organización
    -- FIX: Usar asignación directa para evitar error "INTO specified more than once"
    v_plan_text := (SELECT plan::text FROM public.organizations WHERE id = NEW.organization_id);

    -- Fallback por seguridad
    v_plan_text := COALESCE(v_plan_text, 'free');

    -- Definir límites según la tabla y el plan
    CASE TG_TABLE_NAME
        WHEN 'users' THEN
            v_max_allowed := CASE WHEN v_plan_text = 'free' THEN 1 ELSE 100 END; -- Solo 1 en Free
        WHEN 'products' THEN
            v_max_allowed := CASE WHEN v_plan_text = 'free' THEN 50 ELSE 5000 END; -- 50 en Free
        ELSE
            RETURN NEW; -- Si no es una tabla con límite, dejar pasar
    END CASE;

    -- Contar registros actuales de esa org en esa tabla
    EXECUTE format('SELECT count(*) FROM public.%I WHERE organization_id = $1 AND deleted_at IS NULL', TG_TABLE_NAME)
    INTO v_current_count
    USING NEW.organization_id;

    -- Validar
    IF v_current_count >= v_max_allowed THEN
        RAISE EXCEPTION 'Límite de % alcanzado para el plan %. Por favor, actualiza tu suscripción.', 
            TG_TABLE_NAME, v_plan_text;
    END IF;

    RETURN NEW;
END;
$function$;

-- 🚨 FIX ADICIONAL: Asegurar search_path en sync_user_role_to_auth
CREATE OR REPLACE FUNCTION "public"."sync_user_role_to_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, extensions
    AS $function$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    coalesce(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role, 'active', NEW.active)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  new_org_id uuid;
  org_name text;
  selected_plan text;
BEGIN
  -- ⚡ AUTO-CONFIRMACIÓN: Evitar espera de correo en flujo SaaS/Local
  UPDATE auth.users SET email_confirmed_at = now() WHERE id = new.id;

  -- Extraer datos del metadata enviado desde el Front-end durante el signUp
  -- MEJORA: Generar nombre basado en el usuario si viene de Google/Social
  org_name := COALESCE(
    new.raw_user_meta_data->>'org_name', 
    'Negocio de ' || COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Emprendedor')
  );
  selected_plan := COALESCE(new.raw_user_meta_data->>'plan', 'free');
  
  -- Validar plan
  IF selected_plan NOT IN ('free', 'pro', 'enterprise') THEN
    selected_plan := 'free';
  END IF;

  -- 1. Crear la Organización (el slug se genera por trigger tr_auto_slug_org)
  INSERT INTO public.organizations (name, plan, active)
  VALUES (org_name, selected_plan::public.plan_type, true)
  RETURNING id INTO new_org_id;

  -- 2. Crear el perfil de usuario vinculado a la nueva organización
  INSERT INTO public.users (
    id, 
    name, 
    role, 
    pin, 
    active, 
    organization_id, 
    is_primary_admin
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'admin',
    encode(extensions.digest('0000', 'sha256'), 'hex'), -- 🔐 PIN 0000 Encriptado (SHA-256)
    true,
    new_org_id,
    true    -- El creador es el Primary Admin
  );

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Loguear error real para debugging
  RAISE LOG '❌ Error en handle_new_user: %', SQLERRM;
  RAISE; -- Re-lanzar error para abortar transacción
END;
$function$;

-- 🔗 VINCULAR EL TRIGGER A AUTH.USERS
-- Sin esto, la función handle_new_user() nunca se dispara.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();