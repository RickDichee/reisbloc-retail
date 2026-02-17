-- ==========================================
-- VERIFICAR CONFIGURACIÓN SUPABASE REALTIME
-- ==========================================

-- 1. Verificar publicaciones existentes
SELECT * FROM pg_publication;

-- 2. Verificar qué tablas están en la publicación supabase_realtime
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_publication_tables
		WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
	) THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE orders;
	END IF;
END $$;

-- 3b. Si NO aparece 'users', AGREGAR LA TABLA (idempotente):
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_publication_tables
		WHERE pubname = 'supabase_realtime' AND tablename = 'users'
	) THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE users;
	END IF;
END $$;

-- 3c. Si NO aparece 'products', AGREGAR LA TABLA (idempotente):
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_publication_tables
		WHERE pubname = 'supabase_realtime' AND tablename = 'products'
	) THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE products;
	END IF;
END $$;

-- 3d. Si NO aparece 'sales', AGREGAR LA TABLA (idempotente):
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_publication_tables
		WHERE pubname = 'supabase_realtime' AND tablename = 'sales'
	) THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE sales;
	END IF;
END $$;

-- 3e. Si NO aparece 'devices', AGREGAR LA TABLA (idempotente):
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_publication_tables
		WHERE pubname = 'supabase_realtime' AND tablename = 'devices'
	) THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE devices;
	END IF;
END $$;

-- 3f. Si NO aparece 'notifications', AGREGAR LA TABLA (idempotente):
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_publication_tables
		WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
	) THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
	END IF;
END $$;

-- 3g. Si NO aparece 'audit_logs', AGREGAR LA TABLA (idempotente):
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_publication_tables
		WHERE pubname = 'supabase_realtime' AND tablename = 'audit_logs'
	) THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
	END IF;
END $$;

-- 4. Verificar que quedó agregada
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- 5. OPCIONAL: Si quieres agregar TODAS las tablas a Realtime:
-- ALTER PUBLICATION supabase_realtime ADD TABLE users;
-- ALTER PUBLICATION supabase_realtime ADD TABLE products;
-- ALTER PUBLICATION supabase_realtime ADD TABLE sales;
-- ALTER PUBLICATION supabase_realtime ADD TABLE devices;
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;

-- ==========================================
-- NOTA IMPORTANTE:
-- ==========================================
-- Si la publicación 'supabase_realtime' no existe, créala así:
-- CREATE PUBLICATION supabase_realtime FOR TABLE orders, users, products, sales;
--
-- Luego REINICIA las conexiones Realtime desde tu app (refresca el navegador)
