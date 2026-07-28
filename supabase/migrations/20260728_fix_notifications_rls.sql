-- Migration: Fix Notifications RLS & Security Definer Triggers
-- Date: 2026-07-28
-- Error Resolved: Postgres 42501 (new row violates row-level security policy for table "notifications")

-- 1. Actualizar las funciones trigger con SECURITY DEFINER para que la inserción automática
-- de notificaciones del sistema (ej. nueva comanda, listo para entrega, nuevo dispositivo)
-- no falle por políticas de RLS de usuario.

CREATE OR REPLACE FUNCTION "public"."on_new_order_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO notifications (user_id, organization_id, title, body, type, priority, data)
  SELECT id, NEW.organization_id,
         '🍳 Nueva Comanda: Mesa ' || COALESCE(NEW.table_number, NEW.ticket_number, 1), 
         'Hay ' || COALESCE(jsonb_array_length(NEW.items), 0) || ' productos nuevos.', 
         'order',
         'high',
         jsonb_build_object('order_id', NEW.id, 'table', COALESCE(NEW.table_number, NEW.ticket_number, 1))
  FROM users 
  WHERE active = true 
    AND (organization_id = NEW.organization_id OR organization_id IS NULL)
    AND id != NEW.created_by;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Evitar bloquear la creación de la orden si falla una notificación secundaria
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."on_order_ready_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SECURITY DEFINER
    AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) AND (NEW.status = 'ready' OR NEW.status = 'listo_entrega') THEN
    INSERT INTO public.notifications (user_id, organization_id, title, body, type, priority, data)
    VALUES (
      NEW.created_by,
      NEW.organization_id,
      '✅ Orden Lista: Ticket #' || COALESCE(NEW.ticket_number, NEW.table_number, 1),
      'La orden ya está lista para entrega.',
      'ready',
      'normal',
      jsonb_build_object('order_id', NEW.id, 'ticket_number', COALESCE(NEW.ticket_number, NEW.table_number, 1))
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."notify_new_device_pending"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SECURITY DEFINER
    AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  IF NEW.is_approved = false AND (OLD.is_approved IS NULL OR OLD.is_approved = false) THEN
    SELECT id INTO v_admin_id
    FROM public.users
    WHERE (organization_id = (SELECT organization_id FROM public.users WHERE id = NEW.user_id) OR organization_id IS NULL)
      AND role IN ('admin', 'owner', 'manager')
      AND active = true
    LIMIT 1;
    
    IF v_admin_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        organization_id,
        title,
        body,
        type,
        priority,
        data,
        read,
        created_at
      ) VALUES (
        v_admin_id,
        (SELECT organization_id FROM public.users WHERE id = NEW.user_id),
        '🔐 Nuevo Dispositivo: Aprobación Pendiente',
        'Se requiere aprobación de dispositivo para acceder.',
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
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- 2. Habilitar y ajustar políticas RLS permisivas en public.notifications
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_insert_policy" ON "public"."notifications";
CREATE POLICY "notifications_insert_policy" ON "public"."notifications"
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_select_policy" ON "public"."notifications";
CREATE POLICY "notifications_select_policy" ON "public"."notifications"
  FOR SELECT USING (
    user_id = auth.uid() 
    OR organization_id = (auth.jwt() ->> 'organization_id')::uuid
    OR user_id IS NULL
  );

DROP POLICY IF EXISTS "notifications_update_policy" ON "public"."notifications";
CREATE POLICY "notifications_update_policy" ON "public"."notifications"
  FOR UPDATE USING (
    user_id = auth.uid() 
    OR organization_id = (auth.jwt() ->> 'organization_id')::uuid
  );
