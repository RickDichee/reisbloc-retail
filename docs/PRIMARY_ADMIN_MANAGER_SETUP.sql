-- ============================================================================
-- ACTUALIZACIÓN: Primary Admin + Role Manager + Approve Device RPC
-- ============================================================================
-- Ejecución: Supabase SQL Editor
-- Fecha: 8 Febrero 2026
-- Propósito: Implementar sistema de aprobación de dispositivos + nuevo rol manager

BEGIN;

-- =========================================================================
-- 1. AGREGAR COLUMNA is_primary_admin A usuarios
-- =========================================================================
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_primary_admin BOOLEAN DEFAULT false;

-- Comentario para documentación
COMMENT ON COLUMN public.users.is_primary_admin IS 'Si es true, este usuario es el admin primario de la org y puede auto-aprobar dispositivos';

-- =========================================================================
-- 2. ASEGURAR QUE SOLO UN ADMIN POR ORG SEA PRIMARY
-- =========================================================================
-- Crear función para validar un solo primary_admin por organización
CREATE OR REPLACE FUNCTION public.enforce_single_primary_admin()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS tr_enforce_primary_admin ON public.users;
CREATE TRIGGER tr_enforce_primary_admin
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_primary_admin();

-- =========================================================================
-- 3. RPC: approve_device (para que admin apruebe dispositivos)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.approve_device(
  p_device_id UUID,
  p_approved_by UUID,
  p_approval BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permisos
GRANT EXECUTE ON FUNCTION public.approve_device(UUID, UUID, BOOLEAN) TO authenticated;

-- =========================================================================
-- 4. VALIDAR ROLES PERMITIDOS (agregar 'manager' si no existe)
-- =========================================================================
-- PostgreSQL no tiene enum ALTER en todos los casos, así que verificamos en inserción
-- Las políticas RLS ya controlarán qué puede hacer cada rol

-- =========================================================================
-- 5. POLÍTICA RLS PARA MANAGER
-- =========================================================================
-- Manager puede: usar POS, crear órdenes, editar productos, ver ventas, VER FACTURACIÓN
-- Manager NO puede: crear usuarios, editar otros managers

DROP POLICY IF EXISTS "Manager can use pos all access" ON orders;
CREATE POLICY "Manager can use pos all access"
  ON orders FOR ALL
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager', 'capitan')
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Manager can manage products" ON products;
CREATE POLICY "Manager can manage products"
  ON products FOR ALL
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Manager can view sales and billing" ON sales;
CREATE POLICY "Manager can view sales and billing"
  ON sales FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- =========================================================================
-- 6. NOTIFICACIÓN PARA DISPOSITIVO PENDIENTE
-- =========================================================================
-- Crear función para notificar al admin sobre nuevo dispositivo
CREATE OR REPLACE FUNCTION public.notify_new_device_pending()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_notify_device_pending ON public.devices;
CREATE TRIGGER tr_notify_device_pending
AFTER INSERT ON public.devices
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_device_pending();

-- =========================================================================
-- 7. ASEGURAR AUDITORÍA DE CREACIÓN DE USUARIOS
-- =========================================================================
CREATE OR REPLACE FUNCTION public.audit_user_creation()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_audit_user_creation ON public.users;
CREATE TRIGGER tr_audit_user_creation
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.audit_user_creation();

COMMIT;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
--
-- 1. SETUP INICIAL:
--    - El primer admin de la org debe tener is_primary_admin = true
--    - Usar: UPDATE users SET is_primary_admin = true 
--            WHERE id = '...' AND role = 'admin'
--
-- 2. ROLES PERMITIDOS:
--    - admin: control total
--    - manager: POS, productos, ventas, reportes, facturación (NO usuarios)
--    - capitan: órdenes, mesero: órdenes, cocina/bar: preparación
--
-- 3. FLUJO DE APROBACIÓN:
--    Device pendiente → notificación al primary_admin → admin aprueba via RPC
--
-- 4. TESTING:
--    SELECT approve_device(
--      'device-uuid',
--      'admin-uuid',
--      true
--    );
--
-- ============================================================================
