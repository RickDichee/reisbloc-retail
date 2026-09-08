-- 1. Actualizar on_new_order_notification con SECURITY DEFINER y EXCEPTION block
CREATE OR REPLACE FUNCTION "public"."on_new_order_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
  INSERT INTO public.notifications (user_id, organization_id, title, body, type, priority, data)
  SELECT id, NEW.organization_id,
         '🛍️ Nuevo Pedido: Ticket #' || COALESCE(NEW.table_number, 1), 
         'Hay ' || COALESCE(jsonb_array_length(NEW.items), 0) || ' artículos en el pedido.', 
         'order',
         'high',
         jsonb_build_object('order_id', NEW.id, 'ticket', COALESCE(NEW.table_number, 1))
  FROM public.users 
  WHERE active = true 
    AND (organization_id = NEW.organization_id OR organization_id IS NULL)
    AND (role IN ('admin', 'manager', 'supervisor', 'cashier', 'employee', 'cocina', 'bar') OR role IS NULL)
    AND id != COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- 2. Actualizar on_order_ready_notification con SECURITY DEFINER y EXCEPTION block
CREATE OR REPLACE FUNCTION "public"."on_order_ready_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) AND (NEW.status = 'ready' OR NEW.status = 'listo_entrega') THEN
    IF NEW.created_by IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, organization_id, title, body, type, priority, data)
      VALUES (
        NEW.created_by,
        NEW.organization_id,
        '✅ Pedido Listo: Ticket #' || COALESCE(NEW.table_number, 1),
        'El pedido ya está listo para entrega.',
        'ready',
        'normal',
        jsonb_build_object('order_id', NEW.id, 'ticket', COALESCE(NEW.table_number, 1))
      );
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- 3. Actualizar notify_new_device_pending con SECURITY DEFINER y EXCEPTION block
CREATE OR REPLACE FUNCTION "public"."notify_new_device_pending"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SECURITY DEFINER
    SET search_path = public
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

-- 4. Actualizar RLS policies en public.notifications para evitar cualquier error 42501
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_insert_policy" ON "public"."notifications";
DROP POLICY IF EXISTS "notifications_select_policy" ON "public"."notifications";
DROP POLICY IF EXISTS "notifications_update_policy" ON "public"."notifications";
DROP POLICY IF EXISTS "notifications_delete_policy" ON "public"."notifications";
DROP POLICY IF EXISTS "Notifications_Zen_Policy" ON "public"."notifications";
DROP POLICY IF EXISTS "Acceso por ACL" ON "public"."notifications";
DROP POLICY IF EXISTS "Allow authenticated to read notifications" ON "public"."notifications";
DROP POLICY IF EXISTS "Solo dueño puede ver sus notificaciones" ON "public"."notifications";
DROP POLICY IF EXISTS "Users can update their own notifications" ON "public"."notifications";

CREATE POLICY "notifications_insert_policy" ON "public"."notifications"
  FOR INSERT TO "authenticated"
  WITH CHECK (
    organization_id = "public"."get_my_org_id"()
    OR user_id = auth.uid()
    OR organization_id IS NULL
  );

CREATE POLICY "notifications_select_policy" ON "public"."notifications"
  FOR SELECT TO "authenticated"
  USING (
    user_id = auth.uid()
    OR organization_id = "public"."get_my_org_id"()
    OR user_id IS NULL
  );

CREATE POLICY "notifications_update_policy" ON "public"."notifications"
  FOR UPDATE TO "authenticated"
  USING (
    user_id = auth.uid()
    OR organization_id = "public"."get_my_org_id"()
  );

CREATE POLICY "notifications_delete_policy" ON "public"."notifications"
  FOR DELETE TO "authenticated"
  USING (
    user_id = auth.uid()
    OR organization_id = "public"."get_my_org_id"()
  );

-- 5. Actualizar orders_status_check en public.orders para soportar los estados de retail (apartados, surtido, entrega)
ALTER TABLE "public"."orders" DROP CONSTRAINT IF EXISTS "orders_status_check";
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_status_check" 
  CHECK (((status)::text = ANY (ARRAY[
    'pending'::text, 
    'sent'::text, 
    'preparing'::text, 
    'ready'::text, 
    'served'::text, 
    'completed'::text, 
    'cancelled'::text, 
    'paid'::text, 
    'open'::text, 
    'apartado'::text, 
    'pending_surtir'::text, 
    'listo_entrega'::text, 
    'pendiente_entrega'::text, 
    'entregado'::text
  ])));
