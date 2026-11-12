-- ==============================================================================
-- Migration: 20261106110000_add_pin_column_to_users.sql
-- Description: Asegurar existencia de columna pin en public.users
-- ==============================================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pin text;
