


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "admin";


ALTER SCHEMA "admin" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."org_status" AS ENUM (
    'active',
    'past_due',
    'suspended',
    'trial'
);


ALTER TYPE "public"."org_status" OWNER TO "postgres";


CREATE TYPE "public"."plan_type" AS ENUM (
    'free',
    'pro',
    'enterprise'
);


ALTER TYPE "public"."plan_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "admin"."purge_products"("days" integer, "batch_size" integer DEFAULT 500) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    deleted_count int;
BEGIN
    LOOP
        DELETE FROM public.products 
        WHERE id IN (
            SELECT id FROM public.products
            WHERE deleted_at IS NOT NULL 
            AND deleted_at < now() - (days || ' days')::interval 
            LIMIT batch_size
        );
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        INSERT INTO admin.purge_log(table_name, purged_count, run_by) 
        VALUES ('public.products', COALESCE(deleted_count, 0), auth.uid());
        
        EXIT WHEN deleted_count = 0;
        PERFORM pg_sleep(0.1); 
    END LOOP;
END;
$$;


ALTER FUNCTION "admin"."purge_products"("days" integer, "batch_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "admin"."purge_sales"("days" integer, "batch_size" integer DEFAULT 500) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    deleted_count int;
BEGIN
    LOOP
        DELETE FROM public.sales 
        WHERE id IN (
            SELECT id FROM public.sales
            WHERE deleted_at IS NOT NULL 
            AND deleted_at < now() - (days || ' days')::interval 
            LIMIT batch_size
        );
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        INSERT INTO admin.purge_log(table_name, purged_count, run_by) 
        VALUES ('public.sales', COALESCE(deleted_count, 0), auth.uid());
        
        EXIT WHEN deleted_count = 0;
        PERFORM pg_sleep(0.1);
    END LOOP;
END;
$$;


ALTER FUNCTION "admin"."purge_sales"("days" integer, "batch_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_device"("p_device_id" "uuid", "p_approved_by" "uuid", "p_approval" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_device RECORD;
  v_approver RECORD;
  v_result JSONB;
BEGIN
  
  -- Validar que el aprobador sea admin en la org del dispositivo
  SELECT id, organization_id, role INTO v_approver
  FROM public.users
  WHERE id = p_approved_by AND role IN ('admin', 'superuser') AND active = true;
  
  IF v_approver.id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado para aprobar dispositivos';
  END IF;
  
  -- Validar que el dispositivo pertenezca a la mismo org del admin
  SELECT id, user_id, organization_id, is_approved INTO v_device
  FROM public.devices
  WHERE id = p_device_id AND organization_id = v_approver.organization_id;
  
  IF v_device.id IS NULL THEN
    RAISE EXCEPTION 'Dispositivo no encontrado o no pertenece a tu organización';
  END IF;
  
  -- Actualizar aprobación del dispositivo
  UPDATE public.devices
  SET 
    is_approved = p_approval,
    status = CASE WHEN p_approval THEN 'approved' ELSE 'pending' END,
    approved_by = p_approved_by,
    approved_at = CASE WHEN p_approval THEN NOW() ELSE NULL END
  WHERE id = p_device_id;
  
  -- Registrar en auditoría
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    changes,
    created_at
  ) VALUES (
    p_approved_by,
    CASE WHEN p_approval THEN 'DEVICE_APPROVED' ELSE 'DEVICE_REJECTED' END,
    'devices',
    p_device_id,
    jsonb_build_object(
      'approved', p_approval,
      'approved_by', p_approved_by,
      'device_id', p_device_id
    ),
    NOW()
  );
  
  -- Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'device_id', p_device_id,
    'approved', p_approval,
    'message', CASE WHEN p_approval THEN 'Dispositivo aprobado' ELSE 'Dispositivo rechazado' END
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error aprobando dispositivo: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."approve_device"("p_device_id" "uuid", "p_approved_by" "uuid", "p_approval" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_org_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, changes)
    VALUES (
        auth.uid(), 
        'ORG_UPDATE', 
        'organizations', 
        NEW.id, 
        jsonb_build_object('old', old, 'new', NEW)
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."audit_org_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_user_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    changes,
    created_at
  ) VALUES (
    auth.uid(),
    'USER_CREATED',
    'users',
    NEW.id,
    jsonb_build_object(
      'name', NEW.name,
      'role', NEW.role,
      'organization_id', NEW.organization_id
    ),
    NOW()
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."audit_user_creation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_approve_admin_device"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- En lugar de un UUID fijo, verificamos si el usuario es admin en su tabla
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = NEW.user_id AND role = 'admin' AND active = true
  ) THEN
    NEW.status := 'approved';
    NEW.is_approved := true;
    NEW.approved_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_approve_admin_device"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_acl_access"("p_acl" "jsonb", "p_user_id" "uuid", "p_required_role" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Si el usuario es el Admin Maestro de Reisbloc, siempre tiene acceso
    IF EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id AND is_primary_admin = true) THEN
        RETURN true;
    END IF;

    -- Verificar si el UUID del usuario está en 'visible_to'
    IF p_acl->'visible_to' ? p_user_id::text THEN
        RETURN true;
    END IF;

    -- Verificar si el rol del usuario está permitido en el ACL
    IF p_required_role IS NOT NULL AND p_acl->'roles_permitidos' ? p_required_role THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$;


ALTER FUNCTION "public"."check_acl_access"("p_acl" "jsonb", "p_user_id" "uuid", "p_required_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_organization_limits"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
    v_plan plan_type;
    v_current_count INTEGER;
    v_max_allowed INTEGER;
BEGIN
    -- Obtener el plan de la organización
    SELECT plan INTO v_plan 
    FROM public.organizations 
    WHERE id = NEW.organization_id;

    -- Definir límites según la tabla y el plan
    CASE TG_TABLE_NAME
        WHEN 'users' THEN
            v_max_allowed := CASE WHEN v_plan = 'free' THEN 1 ELSE 100 END; -- Solo 1 en Free
        WHEN 'products' THEN
            v_max_allowed := CASE WHEN v_plan = 'free' THEN 50 ELSE 5000 END; -- 50 en Free
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
            TG_TABLE_NAME, v_plan;
    END IF;

    RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."check_organization_limits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_plan_limits"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    v_count INTEGER;
    v_limit INTEGER := 50; -- Límite para plan Free
BEGIN
    -- Solo checamos si es plan free
    IF (SELECT plan FROM public.organizations WHERE id = NEW.organization_id) = 'free' THEN
        EXECUTE format('SELECT count(*) FROM public.%I WHERE organization_id = $1', TG_TABLE_NAME)
        INTO v_count
        USING NEW.organization_id;

        IF v_count >= v_limit THEN
            RAISE EXCEPTION 'Has alcanzado el límite de productos para el plan gratuito.';
        END IF;
    END IF;
    RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."check_plan_limits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_rate_limit"("p_ip_address" "text", "p_identifier" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_record RECORD;
    v_max_attempts INT := 5;
    v_block_duration INTERVAL := '15 minutes';
BEGIN
    SELECT * INTO v_record 
    FROM public.auth_rate_limits 
    WHERE (ip_address = p_ip_address OR identifier = p_identifier)
      AND last_attempt_at > NOW() - INTERVAL '15 minutes'
    ORDER BY last_attempt_at DESC
    LIMIT 1;

    IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > NOW() THEN
        RETURN jsonb_build_object('allowed', false, 'blocked_until', v_record.blocked_until);
    END IF;

    IF v_record.attempt_count >= v_max_attempts THEN
        UPDATE public.auth_rate_limits SET blocked_until = NOW() + v_block_duration WHERE id = v_record.id;
        RETURN jsonb_build_object('allowed', false, 'blocked_until', NOW() + v_block_duration);
    END IF;

    RETURN jsonb_build_object('allowed', true);
END;
$$;


ALTER FUNCTION "public"."check_rate_limit"("p_ip_address" "text", "p_identifier" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_rate_limits"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE expires_at < NOW();
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_rate_limits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_new_tenant"("org_name" "text", "admin_name" "text", "admin_pin" "text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_org_id uuid;
  new_user_id uuid;
  new_slug text;
BEGIN
  -- 1. Generamos ID y un Slug simple (ej. "Taquería Los Primos" -> "taqueria-los-primos")
  new_org_id := gen_random_uuid();
  new_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  
  -- 2. Crear la Organización (¡ESTO FALTABA!)
  INSERT INTO organizations (id, name, slug, active, created_at)
  VALUES (new_org_id, org_name, new_slug, true, now());

  -- 3. Crear el usuario Admin vinculado a esa organización
  INSERT INTO users (
    name, 
    username, 
    pin, 
    role, 
    active, 
    organization_id,
    created_at
  )
  VALUES (
    admin_name, 
    admin_name, 
    admin_pin, 
    'admin', 
    true, 
    new_org_id,
    now()
  )
  RETURNING id INTO new_user_id;

  -- 4. Retornamos los datos
  RETURN json_build_object(
    'mensaje', '✅ Negocio creado exitosamente',
    'negocio', org_name,
    'slug', new_slug,
    'organization_id', new_org_id,
    'admin_pin', admin_pin
  );
END;
$$;


ALTER FUNCTION "public"."create_new_tenant"("org_name" "text", "admin_name" "text", "admin_pin" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_secure"("p_name" "text", "p_username" "text", "p_pin" "text", "p_role" "text", "p_organization_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_id uuid;
  current_user_role text;
  current_user_org uuid;
BEGIN
  -- 1. Verificar quién está ejecutando esto
  SELECT role, organization_id INTO current_user_role, current_user_org
  FROM users WHERE id = auth.uid();

  -- 2. Validar permisos (Debe ser Admin y coincidir la organización)
  IF current_user_role NOT IN ('admin', 'superuser') OR current_user_org != p_organization_id THEN
    RAISE EXCEPTION 'No autorizado: Solo administradores pueden crear usuarios en su organización.';
  END IF;

  -- 3. Insertar el usuario (Saltando RLS gracias a SECURITY DEFINER)
  INSERT INTO users (name, username, pin, role, organization_id, active)
  VALUES (p_name, p_username, p_pin, p_role, p_organization_id, true)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;


ALTER FUNCTION "public"."create_user_secure"("p_name" "text", "p_username" "text", "p_pin" "text", "p_role" "text", "p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_single_primary_admin"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.is_primary_admin = true AND NEW.role = 'admin' THEN
    -- Desactivar otros primary admins en la misma org
    UPDATE public.users
    SET is_primary_admin = false
    WHERE organization_id = NEW.organization_id 
      AND id != NEW.id 
      AND is_primary_admin = true;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_single_primary_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_audit_log"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.audit_logs(user_id, action, table_name, record_id, changes, ip_address, organization_id)
  VALUES (
    auth.uid(),
    TG_OP, -- INSERT, UPDATE, DELETE
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::TEXT,
    to_jsonb(COALESCE(NEW, OLD)),
    inet_client_addr()::text,
    COALESCE(NEW.organization_id, OLD.organization_id)
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_audit_log"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_org_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."get_my_org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT auth.jwt() ->> 'role';
$$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.users (id, name, role, pin, active)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'admin',
    '0000', -- PIN temporal, el usuario debe cambiarlo
    true
  )
  ON CONFLICT (id) DO NOTHING; -- 👈 ESTO evita el "Database error"
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_sale_inventory_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  item JSONB;
  prod_id UUID;
  qty INTEGER;
BEGIN
  -- NEW.items es un array JSONB: [{"productId": "...", "quantity": 2, ...}, ...]
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    prod_id := (item->>'productId')::UUID;
    qty := (item->>'quantity')::INTEGER;

    -- Actualizar stock solo si el producto tiene inventario habilitado
    UPDATE public.products
    SET current_stock = current_stock - qty
    WHERE id = prod_id AND has_inventory = true;
  END LOOP;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_sale_inventory_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_approved_device"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.devices 
    WHERE user_id = auth.uid() AND is_approved = true
  );
END;
$$;


ALTER FUNCTION "public"."has_approved_device"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_active_user"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- 1. Intentar leer del JWT
  -- Buscamos en app_metadata, user_metadata y nivel superior
  IF (COALESCE(auth.jwt() -> 'app_metadata' ->> 'active', auth.jwt() -> 'user_metadata' ->> 'active', auth.jwt() ->> 'active', 'true'))::boolean IS TRUE OR
     (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', auth.jwt() ->> 'role', '')) != '' THEN
    RETURN true;
  END IF;
  -- 2. Fallback a la tabla
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND active = true
  );
END;
$$;


ALTER FUNCTION "public"."is_active_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- 1. Intentar leer del JWT (Custom Claim) - Máximo rendimiento
  -- Buscamos en app_metadata y user_metadata para máxima compatibilidad con Edge Functions
  -- También buscamos en el nivel superior del JWT por si la Edge Function lo pone ahí directamente
  IF (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', auth.jwt() ->> 'role', '')) = 'admin' AND 
     (COALESCE(auth.jwt() -> 'app_metadata' ->> 'active', auth.jwt() -> 'user_metadata' ->> 'active', auth.jwt() ->> 'active', 'true'))::boolean IS TRUE THEN
    RETURN true;
  END IF;
  -- 2. Fallback a la tabla (por si el token no se ha refrescado)
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin' AND active = true
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_device_approved"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_device_id UUID;
  v_org_id UUID;
BEGIN
  -- Extraer claims del JWT
  v_device_id := (auth.jwt() ->> 'deviceId')::UUID;
  v_org_id := (auth.jwt() ->> 'org_id')::UUID;

  IF v_device_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verificar existencia y estado
  RETURN EXISTS (
    SELECT 1 
    FROM public.devices 
    WHERE id = v_device_id 
      AND organization_id = v_org_id
      AND (status = 'approved' OR is_approved = TRUE)
  );
END;
$$;


ALTER FUNCTION "public"."is_device_approved"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_active"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = get_my_org_id() AND active = true
  );
END;
$$;


ALTER FUNCTION "public"."is_org_active"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_new_device_pending"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_admin_id UUID;
  v_device_name TEXT;
BEGIN
  
  -- Si el dispositivo NO está auto-aprobado, notificar al primary admin
  IF NEW.is_approved = false THEN
    SELECT id INTO v_admin_id
    FROM public.users
    WHERE organization_id = NEW.organization_id
      AND is_primary_admin = true
      AND active = true;
    
    IF v_admin_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        body,
        type,
        priority,
        data,
        read,
        created_at
      ) VALUES (
        v_admin_id,
        '🔐 Nuevo Dispositivo: Aprobación Pendiente',
        'El usuario ' || (SELECT name FROM public.users WHERE id = NEW.user_id) || 
        ' necesita aprobación de dispositivo para acceder.',
        'device_approval',
        'high',
        jsonb_build_object(
          'device_id', NEW.id,
          'device_name', NEW.device_name,
          'user_id', NEW.user_id,
          'action_url', '/admin/devices'
        ),
        false,
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_new_device_pending"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."on_new_order_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO notifications (user_id, organization_id, title, body, type, priority, data)
  SELECT id, NEW.organization_id,
         '🍳 Nueva Comanda: Mesa ' || NEW.table_number, 
         'Hay ' || COALESCE(jsonb_array_length(NEW.items), 0) || ' productos nuevos.', 
         'order',
         'high',
         jsonb_build_object('order_id', NEW.id, 'table', NEW.table_number)
  FROM users 
  WHERE role IN ('cocina', 'bar', 'admin') 
    AND active = true 
    AND organization_id = NEW.organization_id -- 🔒 Solo a gente de la misma tienda
    AND id != NEW.created_by;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."on_new_order_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."on_order_ready_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) AND (NEW.status = 'ready') THEN
    INSERT INTO public.notifications (user_id, title, body, type, priority, data)
    VALUES (
      NEW.created_by,
      '✅ Orden Lista: Mesa ' || NEW.table_number,
      'La orden ya está lista para ser servida. ¡Corre!',
      'ready',
      'normal',
      jsonb_build_object('order_id', NEW.id, 'table', NEW.table_number)
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."on_order_ready_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pg_get_tabledef"("table_oid" "oid") RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $_$  
SELECT string_agg(coldef, E'\n') FROM (    
  SELECT format('  %I %s%s%s', a.attname,                  
  pg_catalog.format_type(a.atttypid, a.atttypmod),                  
  CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END,                  
  COALESCE(' DEFAULT '||pg_get_expr(d.adbin,d.adrelid), '')) AS coldef    
  FROM pg_attribute a    
  LEFT JOIN pg_attrdef d ON a.attrelid = d.adrelid AND a.attnum = d.adnum    
  WHERE a.attrelid = $1 AND a.attnum > 0 AND NOT a.attisdropped ORDER BY a.attnum  
) s;
$_$;


ALTER FUNCTION "public"."pg_get_tabledef"("table_oid" "oid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_login_attempt"("p_ip_address" "text", "p_identifier" "text", "p_success" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE v_record_id UUID;
BEGIN
    IF p_success THEN
        DELETE FROM public.auth_rate_limits WHERE (ip_address = p_ip_address OR identifier = p_identifier);
    ELSE
        SELECT id INTO v_record_id FROM public.auth_rate_limits
        WHERE (ip_address = p_ip_address OR identifier = p_identifier) AND last_attempt_at > NOW() - INTERVAL '15 minutes' LIMIT 1;

        IF v_record_id IS NOT NULL THEN
            UPDATE public.auth_rate_limits SET attempt_count = attempt_count + 1, last_attempt_at = NOW() WHERE id = v_record_id;
        ELSE
            INSERT INTO public.auth_rate_limits (ip_address, identifier, attempt_count) VALUES (p_ip_address, p_identifier, 1);
        END IF;
    END IF;
END;
$$;


ALTER FUNCTION "public"."record_login_attempt"("p_ip_address" "text", "p_identifier" "text", "p_success" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_org_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.slugify(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_org_slug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."slugify"("v_text" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN lower(regexp_replace(regexp_replace(v_text, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'));
END;
$$;


ALTER FUNCTION "public"."slugify"("v_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_user_role_to_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    coalesce(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role, 'active', NEW.active)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_user_role_to_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."universal_audit_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    changes,
    ip_address,
    organization_id,
    created_at
  ) VALUES (
    auth.uid(),
    TG_OP, -- Esto captura automáticamente si es 'INSERT', 'UPDATE' o 'DELETE'
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::TEXT,
    to_jsonb(COALESCE(NEW, OLD)),
    inet_client_addr()::text,
    COALESCE(NEW.organization_id, OLD.organization_id),
    NOW()
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."universal_audit_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_stock_batch"("updates" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  u JSONB;
BEGIN
  FOR u IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    UPDATE public.products
    SET current_stock = current_stock + (u->>'qty')::INTEGER
    WHERE id = (u->>'id')::UUID;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."update_stock_batch"("updates" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "admin"."purge_log" (
    "id" bigint NOT NULL,
    "table_name" "text" NOT NULL,
    "purged_count" integer NOT NULL,
    "run_by" "uuid",
    "ran_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "admin"."purge_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "admin"."purge_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "admin"."purge_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "admin"."purge_log_id_seq" OWNED BY "admin"."purge_log"."id";



CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "user_id" "uuid",
    "action" character varying(100) NOT NULL,
    "table_name" character varying(100),
    "record_id" character varying(255),
    "changes" "jsonb",
    "ip_address" character varying(45),
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "entity_type" "text",
    "entity_id" "uuid",
    "organization_id" "uuid",
    "id" "date"
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_rate_limits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ip_address" "text",
    "identifier" "text",
    "attempt_count" integer DEFAULT 1,
    "last_attempt_at" timestamp with time zone DEFAULT "now"(),
    "blocked_until" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid"
);


ALTER TABLE "public"."auth_rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "tax_id" "text",
    "email" "text",
    "phone" "text",
    "address" "text",
    "notes" "text",
    "has_credit" boolean DEFAULT false,
    "credit_limit" numeric(10,2) DEFAULT 0,
    "current_balance" numeric(10,2) DEFAULT 0,
    "price_tier" "text" DEFAULT 'retail'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid"
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."closings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "closed_by" "uuid",
    "total_sales" numeric(10,2) DEFAULT 0 NOT NULL,
    "total_cash" numeric(10,2) DEFAULT 0 NOT NULL,
    "total_card" numeric(10,2) DEFAULT 0 NOT NULL,
    "total_digital" numeric(10,2) DEFAULT 0 NOT NULL,
    "total_tips" numeric(10,2) DEFAULT 0 NOT NULL,
    "orders_count" integer DEFAULT 0 NOT NULL,
    "sales_count" integer DEFAULT 0 NOT NULL,
    "employee_metrics" "jsonb",
    "payment_methods" "jsonb",
    "notes" "text",
    "status" character varying(20) DEFAULT 'open'::character varying NOT NULL,
    "closed_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid" NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid"
);


ALTER TABLE "public"."closings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "mac_address" "text",
    "device_name" character varying(255),
    "device_type" character varying(50),
    "network" character varying(50),
    "network_type" character varying(50),
    "os" character varying(100),
    "browser" character varying(100),
    "fingerprint" "text",
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "registered_at" timestamp with time zone DEFAULT "now"(),
    "last_seen" timestamp with time zone DEFAULT "now"(),
    "last_access" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_approved" boolean DEFAULT false,
    "is_rejected" boolean DEFAULT false,
    "organization_id" "uuid" NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    CONSTRAINT "devices_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('approved'::character varying)::"text", ('rejected'::character varying)::"text"])))
);


ALTER TABLE "public"."devices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "type" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "previous_stock" integer,
    "new_stock" integer,
    "reference_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid"
);


ALTER TABLE "public"."inventory_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "waiter_id" "uuid",
    "table_number" integer NOT NULL,
    "items" "jsonb" NOT NULL,
    "subtotal" numeric(10,2) NOT NULL,
    "tip_amount" numeric(10,2) DEFAULT 0,
    "tip_percentage" integer DEFAULT 0,
    "total" numeric(10,2) NOT NULL,
    "payment_method" character varying(50) NOT NULL,
    "device_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid" NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid"
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255),
    "pin" character varying(255),
    "role" character varying(50) NOT NULL,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "username" "text",
    "organization_id" "uuid" NOT NULL,
    "avatar_url" "text",
    "deleted_at" timestamp with time zone,
    "is_primary_user" boolean DEFAULT false,
    "is_primary_admin" boolean DEFAULT false,
    "deleted_by" "uuid",
    "acl" "jsonb" DEFAULT '{"editors": ["admin"], "visible_to": []}'::"jsonb",
    CONSTRAINT "check_acl_structure" CHECK (("jsonb_typeof"("acl") = 'object'::"text")),
    CONSTRAINT "users_role_check" CHECK ((("role")::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('capitan'::character varying)::"text", ('mesero'::character varying)::"text", ('cocina'::character varying)::"text", ('bar'::character varying)::"text", ('supervisor'::character varying)::"text", ('superuser'::character varying)::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."is_primary_user" IS 'public.users.is_primary_admin IS ''Si es true, este usuario es el admin primario de la org y puede auto-aprobar dispositivos'';';



COMMENT ON COLUMN "public"."users"."is_primary_admin" IS 'Si es true, este usuario es el admin primario de la org y puede auto-aprobar dispositivos';



CREATE OR REPLACE VIEW "public"."kpi_ventas_personal" WITH ("security_invoker"='on') AS
 SELECT "u"."organization_id",
    "u"."name" AS "empleado",
    "count"("s"."id") AS "numero_ventas",
    "sum"("s"."total") AS "monto_generado"
   FROM ("public"."users" "u"
     JOIN "public"."sales" "s" ON (("u"."id" = "s"."waiter_id")))
  GROUP BY "u"."organization_id", "u"."name";


ALTER VIEW "public"."kpi_ventas_personal" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" character varying(150) NOT NULL,
    "body" "text" NOT NULL,
    "type" character varying(20) DEFAULT 'info'::character varying,
    "priority" character varying(10) DEFAULT 'normal'::character varying,
    "read" boolean DEFAULT false,
    "data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "acl" "jsonb" DEFAULT '{"visible_to": []}'::"jsonb"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_number" integer NOT NULL,
    "waiter_id" "uuid",
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "items" "jsonb" NOT NULL,
    "subtotal" numeric(10,2) NOT NULL,
    "tip_amount" numeric(10,2) DEFAULT 0,
    "tip_percentage" integer DEFAULT 0,
    "total" numeric(10,2) NOT NULL,
    "payment_method" character varying(50),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sent_to_kitchen_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "organization_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    CONSTRAINT "orders_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('sent'::character varying)::"text", ('preparing'::character varying)::"text", ('ready'::character varying)::"text", ('served'::character varying)::"text", ('completed'::character varying)::"text", ('cancelled'::character varying)::"text", ('paid'::character varying)::"text", ('open'::character varying)::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "logo_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "active" boolean DEFAULT true,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "plan" "public"."plan_type" DEFAULT 'free'::"public"."plan_type",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "public"."org_status" DEFAULT 'active'::"public"."org_status"
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."organizations"."active" IS 'Estado operativo de la organización (Kill-switch)';



COMMENT ON COLUMN "public"."organizations"."plan" IS 'Nivel de suscripción del cliente';



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "price" numeric DEFAULT 0,
    "current_stock" numeric DEFAULT 0,
    "has_inventory" boolean DEFAULT true,
    "available" boolean DEFAULT true,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "minimum_stock" integer DEFAULT 0,
    "organization_id" "uuid" NOT NULL,
    "wholesale_price" numeric(10,2),
    "wholesale_min_qty" integer DEFAULT 0,
    "cost_price" numeric(10,2),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid"
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "subscription" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid"
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schema_catalog_backups" (
    "id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "schema_name" "text" NOT NULL,
    "ddl" "text" NOT NULL
);


ALTER TABLE "public"."schema_catalog_backups" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."schema_catalog_backups_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."schema_catalog_backups_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."schema_catalog_backups_id_seq" OWNED BY "public"."schema_catalog_backups"."id";



CREATE TABLE IF NOT EXISTS "public"."shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "user_id" "uuid",
    "start_time" timestamp with time zone DEFAULT "now"(),
    "end_time" timestamp with time zone,
    "opening_amount" numeric DEFAULT 0,
    "closing_amount" numeric,
    "expected_amount" numeric,
    "status" "text" DEFAULT 'open'::"text",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    CONSTRAINT "shifts_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."shifts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "contact_name" "text",
    "phone" "text",
    "email" "text",
    "tax_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid"
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."token_blacklist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "jti" "text" NOT NULL,
    "user_id" "uuid",
    "revoked_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid"
);


ALTER TABLE "public"."token_blacklist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "refresh_token_hash" "text" NOT NULL,
    "jti" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone NOT NULL,
    "revoked" boolean DEFAULT false,
    "device_id" "uuid",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid"
);


ALTER TABLE "public"."user_sessions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_kpi_actividad" WITH ("security_invoker"='on') AS
 SELECT "created_at",
    "user_id",
    ( SELECT "users"."name"
           FROM "public"."users"
          WHERE ("users"."id" = "audit_logs"."user_id")) AS "empleado",
    "action",
    "table_name",
    "organization_id"
   FROM "public"."audit_logs";


ALTER VIEW "public"."view_kpi_actividad" OWNER TO "postgres";


ALTER TABLE ONLY "admin"."purge_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"admin"."purge_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."schema_catalog_backups" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."schema_catalog_backups_id_seq"'::"regclass");



ALTER TABLE ONLY "admin"."purge_log"
    ADD CONSTRAINT "purge_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth_rate_limits"
    ADD CONSTRAINT "auth_rate_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."closings"
    ADD CONSTRAINT "closings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_mac_address_key" UNIQUE ("mac_address");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_name_org_unique" UNIQUE ("name", "organization_id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schema_catalog_backups"
    ADD CONSTRAINT "schema_catalog_backups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."token_blacklist"
    ADD CONSTRAINT "token_blacklist_jti_key" UNIQUE ("jti");



ALTER TABLE ONLY "public"."token_blacklist"
    ADD CONSTRAINT "token_blacklist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_jti_key" UNIQUE ("jti");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pin_org_unique" UNIQUE ("pin", "organization_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pin_unique" UNIQUE ("pin");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_audit_logs_created" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_user" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_audit_user_created_at" ON "public"."audit_logs" USING "btree" ("user_id", "created_at");



CREATE INDEX "idx_closings_closed_by" ON "public"."closings" USING "btree" ("closed_by");



CREATE INDEX "idx_closings_date" ON "public"."closings" USING "btree" ("date" DESC);



CREATE INDEX "idx_devices_org_id" ON "public"."devices" USING "btree" ("organization_id");



CREATE INDEX "idx_devices_user_id" ON "public"."devices" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_acl_gin" ON "public"."notifications" USING "gin" ("acl");



CREATE INDEX "idx_notifications_created" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_orders_created" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_orders_org_id" ON "public"."orders" USING "btree" ("organization_id");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_table" ON "public"."orders" USING "btree" ("table_number");



CREATE INDEX "idx_orders_waiter" ON "public"."orders" USING "btree" ("waiter_id");



CREATE INDEX "idx_products_org_id" ON "public"."products" USING "btree" ("organization_id");



CREATE INDEX "idx_rate_limits_identifier" ON "public"."auth_rate_limits" USING "btree" ("identifier");



CREATE INDEX "idx_rate_limits_ip" ON "public"."auth_rate_limits" USING "btree" ("ip_address");



CREATE INDEX "idx_sales_created" ON "public"."sales" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_sales_org_id" ON "public"."sales" USING "btree" ("organization_id");



CREATE INDEX "idx_sales_waiter" ON "public"."sales" USING "btree" ("waiter_id");



CREATE INDEX "idx_users_acl_gin" ON "public"."users" USING "gin" ("acl");



CREATE INDEX "idx_users_org_id" ON "public"."users" USING "btree" ("organization_id");



CREATE OR REPLACE TRIGGER "tr_audit_org_changes" AFTER UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."audit_org_changes"();



CREATE OR REPLACE TRIGGER "tr_audit_user_creation" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."audit_user_creation"();



CREATE OR REPLACE TRIGGER "tr_auto_slug_org" BEFORE INSERT ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."set_org_slug"();



CREATE OR REPLACE TRIGGER "tr_enforce_primary_admin" BEFORE INSERT OR UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_single_primary_admin"();



CREATE OR REPLACE TRIGGER "tr_limit_products_free" BEFORE INSERT ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."check_plan_limits"();



CREATE OR REPLACE TRIGGER "tr_limit_products_quota" BEFORE INSERT ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."check_organization_limits"();



CREATE OR REPLACE TRIGGER "tr_limit_users_quota" BEFORE INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."check_organization_limits"();



CREATE OR REPLACE TRIGGER "tr_notify_device_pending" AFTER INSERT ON "public"."devices" FOR EACH ROW EXECUTE FUNCTION "public"."notify_new_device_pending"();



CREATE OR REPLACE TRIGGER "tr_notify_new_order" AFTER INSERT ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."on_new_order_notification"();



CREATE OR REPLACE TRIGGER "tr_notify_order_ready" AFTER UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."on_order_ready_notification"();



CREATE OR REPLACE TRIGGER "tr_sync_user_role" AFTER INSERT OR UPDATE OF "role", "active" ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."sync_user_role_to_auth"();



CREATE OR REPLACE TRIGGER "tr_universal_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."universal_audit_trigger"();



CREATE OR REPLACE TRIGGER "tr_universal_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."universal_audit_trigger"();



CREATE OR REPLACE TRIGGER "tr_universal_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."universal_audit_trigger"();



CREATE OR REPLACE TRIGGER "tr_update_inventory_on_sale" AFTER INSERT ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."handle_sale_inventory_update"();



CREATE OR REPLACE TRIGGER "trigger_auto_approve_admin" BEFORE INSERT ON "public"."devices" FOR EACH ROW EXECUTE FUNCTION "public"."auto_approve_admin_device"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."auth_rate_limits"
    ADD CONSTRAINT "auth_rate_limits_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."closings"
    ADD CONSTRAINT "closings_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."closings"
    ADD CONSTRAINT "closings_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."closings"
    ADD CONSTRAINT "closings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_waiter_id_fkey" FOREIGN KEY ("waiter_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_waiter_id_fkey" FOREIGN KEY ("waiter_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."token_blacklist"
    ADD CONSTRAINT "token_blacklist_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."token_blacklist"
    ADD CONSTRAINT "token_blacklist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



CREATE POLICY "Acceso por ACL" ON "public"."notifications" FOR SELECT TO "authenticated" USING ((("organization_id" = "public"."get_my_org_id"()) AND (("user_id" = "auth"."uid"()) OR "public"."check_acl_access"("acl", "auth"."uid"()))));



CREATE POLICY "Acceso por organizacion" ON "public"."clients" TO "authenticated" USING (("organization_id" = "public"."get_my_org_id"())) WITH CHECK (("organization_id" = "public"."get_my_org_id"()));



CREATE POLICY "Acceso por organizacion" ON "public"."closings" TO "authenticated" USING (("organization_id" = "public"."get_my_org_id"())) WITH CHECK (("organization_id" = "public"."get_my_org_id"()));



CREATE POLICY "Acceso por organizacion" ON "public"."devices" TO "authenticated" USING (("organization_id" = "public"."get_my_org_id"())) WITH CHECK (("organization_id" = "public"."get_my_org_id"()));



CREATE POLICY "Acceso por organizacion" ON "public"."inventory_movements" TO "authenticated" USING (("organization_id" = "public"."get_my_org_id"())) WITH CHECK (("organization_id" = "public"."get_my_org_id"()));



CREATE POLICY "Acceso por organizacion" ON "public"."orders" TO "authenticated" USING (("organization_id" = "public"."get_my_org_id"())) WITH CHECK (("organization_id" = "public"."get_my_org_id"()));



CREATE POLICY "Acceso por organizacion" ON "public"."products" TO "authenticated" USING (("organization_id" = "public"."get_my_org_id"())) WITH CHECK (("organization_id" = "public"."get_my_org_id"()));



CREATE POLICY "Acceso por organizacion" ON "public"."sales" TO "authenticated" USING (("organization_id" = "public"."get_my_org_id"())) WITH CHECK (("organization_id" = "public"."get_my_org_id"()));



CREATE POLICY "Acceso por organizacion" ON "public"."shifts" TO "authenticated" USING (("organization_id" = "public"."get_my_org_id"())) WITH CHECK (("organization_id" = "public"."get_my_org_id"()));



CREATE POLICY "Acceso por organizacion" ON "public"."suppliers" TO "authenticated" USING (("organization_id" = "public"."get_my_org_id"())) WITH CHECK (("organization_id" = "public"."get_my_org_id"()));



CREATE POLICY "Admins can manage products" ON "public"."products" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can update their own organization" ON "public"."organizations" FOR UPDATE TO "authenticated" USING ((("id" = ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())
 LIMIT 1)) AND ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())
 LIMIT 1))::"text" = 'admin'::"text"))) WITH CHECK (("id" = ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "Admins_manage_sales" ON "public"."sales" TO "authenticated" USING (("public"."is_admin"() AND "public"."has_approved_device"()));



CREATE POLICY "Admins_view_all_products" ON "public"."products" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Allow authenticated to read notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND "public"."is_active_user"() AND "public"."has_approved_device"()));



CREATE POLICY "Device_based_insert_orders" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_active_user"() AND "public"."has_approved_device"()));



CREATE POLICY "Device_based_insert_sales" ON "public"."sales" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_active_user"() AND "public"."has_approved_device"()));



CREATE POLICY "Device_based_select_orders" ON "public"."orders" FOR SELECT TO "authenticated" USING (("public"."is_active_user"() AND "public"."has_approved_device"()));



CREATE POLICY "Device_based_update_orders" ON "public"."orders" FOR UPDATE TO "authenticated" USING (("public"."is_active_user"() AND "public"."has_approved_device"()));



CREATE POLICY "Devices_Zen_Policy" ON "public"."devices" TO "authenticated" USING ((("organization_id" = "public"."get_my_org_id"()) AND ("public"."is_admin"() OR ("user_id" = "auth"."uid"())))) WITH CHECK (("organization_id" = "public"."get_my_org_id"()));



CREATE POLICY "Dispositivos: Registro inicial" ON "public"."devices" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" = "public"."get_my_org_id"()));



CREATE POLICY "Enable insert for authenticated users" ON "public"."closings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."sales" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."sales" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for devices" ON "public"."devices" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for sales" ON "public"."sales" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."closings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."sales" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for devices" ON "public"."devices" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read for sales" ON "public"."sales" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."devices" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable update for devices" ON "public"."devices" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable update for staff" ON "public"."products" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Lectura pública de productos" ON "public"."products" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Manager can manage products" ON "public"."products" TO "authenticated" USING ((("organization_id" = ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) AND ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('manager'::character varying)::"text"])))) WITH CHECK (("organization_id" = ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Manager can use pos all access" ON "public"."orders" TO "authenticated" USING ((("organization_id" = ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) AND ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('manager'::character varying)::"text", ('capitan'::character varying)::"text"])))) WITH CHECK (("organization_id" = ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Manager can view sales and billing" ON "public"."sales" FOR SELECT TO "authenticated" USING (("organization_id" = ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Managers_view_org_metrics" ON "public"."sales" FOR SELECT TO "authenticated" USING ((("organization_id" = ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) AND ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('manager'::character varying)::"text"]))));



CREATE POLICY "Members can view their own organization" ON "public"."organizations" FOR SELECT TO "authenticated" USING (("id" = ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "Notifications_Zen_Policy" ON "public"."notifications" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Ordenes: Crear solo con equipo aprobado" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK ((("organization_id" = "public"."get_my_org_id"()) AND "public"."is_device_approved"()));



CREATE POLICY "Orders: Solo escritura si esta activo" ON "public"."orders" TO "authenticated" USING ((("organization_id" = "public"."get_my_org_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."organizations"
  WHERE (("organizations"."id" = "public"."get_my_org_id"()) AND ("organizations"."status" = ANY (ARRAY['active'::"public"."org_status", 'trial'::"public"."org_status"]))))))) WITH CHECK ((("organization_id" = "public"."get_my_org_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."organizations"
  WHERE (("organizations"."id" = "public"."get_my_org_id"()) AND ("organizations"."status" = ANY (ARRAY['active'::"public"."org_status", 'trial'::"public"."org_status"])))))));



CREATE POLICY "Orders: Ver siempre" ON "public"."orders" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."get_my_org_id"()));



CREATE POLICY "Orders_Zen_Policy" ON "public"."orders" TO "authenticated" USING ((("organization_id" = "public"."get_my_org_id"()) AND ("public"."is_admin"() OR "public"."has_approved_device"()))) WITH CHECK (("organization_id" = "public"."get_my_org_id"()));



CREATE POLICY "Org: Gestionar clientes" ON "public"."clients" TO "authenticated" USING (("organization_id" = ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Org: Gestionar dispositivos" ON "public"."devices" FOR UPDATE USING (("organization_id" = "public"."get_my_org_id"()));



CREATE POLICY "Org: Gestionar productos" ON "public"."products" USING (("organization_id" = "public"."get_my_org_id"()));



CREATE POLICY "Org: Gestionar proveedores" ON "public"."suppliers" TO "authenticated" USING (("organization_id" = ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Org: Ver clientes" ON "public"."clients" FOR SELECT TO "authenticated" USING (("organization_id" = ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Org: Ver dispositivos" ON "public"."devices" FOR SELECT USING (("organization_id" = "public"."get_my_org_id"()));



CREATE POLICY "Org: Ver productos" ON "public"."products" FOR SELECT USING (("organization_id" = "public"."get_my_org_id"()));



CREATE POLICY "Org: Ver proveedores" ON "public"."suppliers" FOR SELECT TO "authenticated" USING (("organization_id" = ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Permitir todo a autenticados" ON "public"."products" TO "authenticated" USING (true);



CREATE POLICY "Permitir todo a autenticados en su organización" ON "public"."shifts" TO "authenticated" USING (("organization_id" = (("auth"."jwt"() ->> 'organization_id'::"text"))::"uuid"));



CREATE POLICY "Renovador puede purgar" ON "public"."clients" FOR DELETE TO "authenticated" USING ((((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text" = 'renovador'::"text") AND ("deleted_at" IS NOT NULL) AND ("deleted_at" < ("now"() - '30 days'::interval))));



CREATE POLICY "Renovador puede purgar" ON "public"."inventory_movements" FOR DELETE TO "authenticated" USING ((((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text" = 'renovador'::"text") AND ("deleted_at" IS NOT NULL) AND ("deleted_at" < ("now"() - '30 days'::interval))));



CREATE POLICY "Renovador puede purgar" ON "public"."orders" FOR DELETE TO "authenticated" USING ((((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text" = 'renovador'::"text") AND ("deleted_at" IS NOT NULL) AND ("deleted_at" < ("now"() - '90 days'::interval))));



CREATE POLICY "Renovador puede purgar" ON "public"."products" FOR DELETE TO "authenticated" USING ((((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text" = 'renovador'::"text") AND ("deleted_at" IS NOT NULL) AND ("deleted_at" < ("now"() - '30 days'::interval))));



CREATE POLICY "Renovador puede purgar" ON "public"."sales" FOR DELETE TO "authenticated" USING ((((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text" = 'renovador'::"text") AND ("deleted_at" IS NOT NULL) AND ("deleted_at" < ("now"() - '90 days'::interval))));



CREATE POLICY "Renovador: Purga de clientes" ON "public"."clients" FOR DELETE TO "authenticated" USING ((((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text" = 'renovador'::"text") AND ("deleted_at" IS NOT NULL) AND ("deleted_at" < ("now"() - '30 days'::interval))));



CREATE POLICY "Renovador: Purga de movimientos" ON "public"."inventory_movements" FOR DELETE TO "authenticated" USING ((((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text" = 'renovador'::"text") AND ("deleted_at" IS NOT NULL) AND ("deleted_at" < ("now"() - '30 days'::interval))));



CREATE POLICY "Renovador: Purga de productos" ON "public"."products" FOR DELETE TO "authenticated" USING ((((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text" = 'renovador'::"text") AND ("deleted_at" IS NOT NULL) AND ("deleted_at" < ("now"() - '30 days'::interval))));



CREATE POLICY "Renovador: Purga de productos obsoletos" ON "public"."products" FOR DELETE TO "authenticated" USING ((((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text" = 'renovador'::"text") AND ("deleted_at" IS NOT NULL) AND ("deleted_at" < ("now"() - '30 days'::interval))));



CREATE POLICY "Renovador: Purga de proveedores" ON "public"."suppliers" FOR DELETE TO "authenticated" USING ((((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text" = 'renovador'::"text") AND ("deleted_at" IS NOT NULL) AND ("deleted_at" < ("now"() - '30 days'::interval))));



CREATE POLICY "Sec: Modificar ordenes" ON "public"."orders" FOR UPDATE USING ((("organization_id" = "public"."get_my_org_id"()) AND "public"."is_device_approved"()));



CREATE POLICY "Sec: Ver ordenes" ON "public"."orders" FOR SELECT USING ((("organization_id" = "public"."get_my_org_id"()) AND "public"."is_device_approved"()));



CREATE POLICY "Solo admins ven auditoria" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Solo admins ven backups" ON "public"."schema_catalog_backups" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Solo dueño puede ver sus notificaciones" ON "public"."notifications" TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Solo dueño puede ver sus sesiones" ON "public"."user_sessions" TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Staging_Unlock_Products" ON "public"."products" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "System only access" ON "public"."auth_rate_limits" USING (false);



CREATE POLICY "Users can manage their own push subscriptions" ON "public"."push_subscriptions" TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND "public"."is_active_user"() AND "public"."has_approved_device"()));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND "public"."is_active_user"() AND "public"."has_approved_device"())) WITH CHECK ((("user_id" = "auth"."uid"()) AND "public"."is_active_user"() AND "public"."has_approved_device"()));



CREATE POLICY "Ventas: Registrar solo autenticados" ON "public"."sales" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" = "public"."get_my_org_id"()));



CREATE POLICY "Ventas: Ver solo misma org" ON "public"."sales" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."get_my_org_id"()));



CREATE POLICY "Ver mi propia organizacion" ON "public"."organizations" FOR SELECT TO "authenticated" USING (("id" = "public"."get_my_org_id"()));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_select_policy" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ((("organization_id" = ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) AND ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('manager'::character varying)::"text"]))));



CREATE POLICY "audit_logs_select_policy_v2" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ((("organization_id" = ( SELECT "u"."organization_id"
   FROM "public"."users" "u"
  WHERE ("u"."id" = "auth"."uid"())
 LIMIT 1)) AND ((( SELECT "u"."role"
   FROM "public"."users" "u"
  WHERE ("u"."id" = "auth"."uid"())
 LIMIT 1))::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('manager'::character varying)::"text"]))));



CREATE POLICY "audit_logs_system_insert_only" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK (false);



ALTER TABLE "public"."auth_rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."closings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."devices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "devices_insert_policy" ON "public"."devices" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



ALTER TABLE "public"."inventory_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schema_catalog_backups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shifts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."token_blacklist" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_select_policy" ON "public"."users" FOR SELECT TO "authenticated" USING ((("organization_id" = "public"."get_my_org_id"()) OR ("id" = "auth"."uid"())));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."devices";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."orders";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."products";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





























































































































































































GRANT ALL ON FUNCTION "public"."approve_device"("p_device_id" "uuid", "p_approved_by" "uuid", "p_approval" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."approve_device"("p_device_id" "uuid", "p_approved_by" "uuid", "p_approval" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_device"("p_device_id" "uuid", "p_approved_by" "uuid", "p_approval" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_org_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_org_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_org_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_user_creation"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_user_creation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_user_creation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_approve_admin_device"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_approve_admin_device"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_approve_admin_device"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_acl_access"("p_acl" "jsonb", "p_user_id" "uuid", "p_required_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_acl_access"("p_acl" "jsonb", "p_user_id" "uuid", "p_required_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_acl_access"("p_acl" "jsonb", "p_user_id" "uuid", "p_required_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_organization_limits"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_organization_limits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_organization_limits"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_plan_limits"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_plan_limits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_plan_limits"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_ip_address" "text", "p_identifier" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_ip_address" "text", "p_identifier" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_ip_address" "text", "p_identifier" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_rate_limits"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_rate_limits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_rate_limits"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_new_tenant"("org_name" "text", "admin_name" "text", "admin_pin" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_new_tenant"("org_name" "text", "admin_name" "text", "admin_pin" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_new_tenant"("org_name" "text", "admin_name" "text", "admin_pin" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_secure"("p_name" "text", "p_username" "text", "p_pin" "text", "p_role" "text", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_secure"("p_name" "text", "p_username" "text", "p_pin" "text", "p_role" "text", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_secure"("p_name" "text", "p_username" "text", "p_pin" "text", "p_role" "text", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_single_primary_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_single_primary_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_single_primary_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_audit_log"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_audit_log"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_audit_log"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_org_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_org_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_sale_inventory_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_sale_inventory_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_sale_inventory_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_approved_device"() TO "anon";
GRANT ALL ON FUNCTION "public"."has_approved_device"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_approved_device"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_active_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_active_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_active_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_device_approved"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_device_approved"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_device_approved"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_active"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_active"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_active"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_new_device_pending"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_new_device_pending"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_new_device_pending"() TO "service_role";



GRANT ALL ON FUNCTION "public"."on_new_order_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_new_order_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_new_order_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."on_order_ready_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_order_ready_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_order_ready_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."pg_get_tabledef"("table_oid" "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."pg_get_tabledef"("table_oid" "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pg_get_tabledef"("table_oid" "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_login_attempt"("p_ip_address" "text", "p_identifier" "text", "p_success" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."record_login_attempt"("p_ip_address" "text", "p_identifier" "text", "p_success" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_login_attempt"("p_ip_address" "text", "p_identifier" "text", "p_success" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_org_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_org_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_org_slug"() TO "service_role";



GRANT ALL ON FUNCTION "public"."slugify"("v_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."slugify"("v_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."slugify"("v_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_role_to_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_role_to_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_role_to_auth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."universal_audit_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."universal_audit_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."universal_audit_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_stock_batch"("updates" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_stock_batch"("updates" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_stock_batch"("updates" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
























GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."auth_rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."auth_rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."closings" TO "anon";
GRANT ALL ON TABLE "public"."closings" TO "authenticated";
GRANT ALL ON TABLE "public"."closings" TO "service_role";



GRANT ALL ON TABLE "public"."devices" TO "anon";
GRANT ALL ON TABLE "public"."devices" TO "authenticated";
GRANT ALL ON TABLE "public"."devices" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_movements" TO "anon";
GRANT ALL ON TABLE "public"."inventory_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_movements" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."kpi_ventas_personal" TO "anon";
GRANT ALL ON TABLE "public"."kpi_ventas_personal" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_ventas_personal" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."schema_catalog_backups" TO "anon";
GRANT ALL ON TABLE "public"."schema_catalog_backups" TO "authenticated";
GRANT ALL ON TABLE "public"."schema_catalog_backups" TO "service_role";



GRANT ALL ON SEQUENCE "public"."schema_catalog_backups_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."schema_catalog_backups_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."schema_catalog_backups_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."shifts" TO "anon";
GRANT ALL ON TABLE "public"."shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."shifts" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."token_blacklist" TO "anon";
GRANT ALL ON TABLE "public"."token_blacklist" TO "authenticated";
GRANT ALL ON TABLE "public"."token_blacklist" TO "service_role";



GRANT ALL ON TABLE "public"."user_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."view_kpi_actividad" TO "anon";
GRANT ALL ON TABLE "public"."view_kpi_actividad" TO "authenticated";
GRANT ALL ON TABLE "public"."view_kpi_actividad" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































drop extension if exists "pg_net";


