-- 🛡️ MIGRACIÓN: Actualizar restricción de roles en la tabla de usuarios
-- Permite los roles de la aplicación de retail ('manager', 'cashier', 'employee') 
-- además de los roles legacy de restaurante ('mesero', 'cocina', 'bar', etc.)

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role = ANY (ARRAY[
  'admin'::text, 
  'manager'::text, 
  'supervisor'::text, 
  'cashier'::text, 
  'employee'::text, 
  'capitan'::text, 
  'mesero'::text, 
  'cocina'::text, 
  'bar'::text, 
  'superuser'::text
]));
