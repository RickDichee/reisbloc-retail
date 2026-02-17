-- ============================================================================
-- LÓGICA AUTOMÁTICA PARA NOTIFICACIONES PUSH/REALTIME
-- ============================================================================

-- Función que se dispara al crear una orden
CREATE OR REPLACE FUNCTION public.on_new_order_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertamos en la tabla de notificaciones para que el Front reaccione
  -- Esto notificará a todos los usuarios con rol 'cocina' o 'bar'
  INSERT INTO notifications (user_id, title, body, type, data)
  SELECT id, 
         '¡Nueva Orden!', 
         'Mesa ' || NEW.table_number || ' acaba de pedir.', 
         'order_created',
         jsonb_build_object('order_id', NEW.id, 'table', NEW.table_number)
  FROM users 
  WHERE role IN ('cocina', 'bar', 'admin') AND active = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- El Trigger
DROP TRIGGER IF EXISTS tr_notify_new_order ON orders;
CREATE TRIGGER tr_notify_new_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.on_new_order_notification();

-- Asegurar que anon puede guardar sus suscripciones push (Browser tokens)
CREATE POLICY "Allow anon to manage push subscriptions" ON push_subscriptions
  FOR ALL TO anon USING (true) WITH CHECK (true);