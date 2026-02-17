-- Fix roles constraint to accept Spanish roles
-- Ejecutar esto en Supabase SQL Editor

-- PASO 1: Ver roles actuales
SELECT id, name, role FROM users;

-- PASO 2: Drop old constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- PASO 3: Migrar roles existentes de inglés a español
UPDATE users SET role = 'mesero' WHERE role = 'waiter';
UPDATE users SET role = 'cocina' WHERE role = 'cook';
UPDATE users SET role = 'admin' WHERE role = 'cashier';
-- admin permanece como admin

-- PASO 4: Verificar migración
SELECT id, name, role FROM users;

-- PASO 5: Add new constraint with Spanish roles
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'capitan', 'mesero', 'cocina', 'bar', 'supervisor'));

-- PASO 6: Verify constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass AND conname = 'users_role_check';
