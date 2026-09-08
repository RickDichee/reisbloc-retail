-- =============================================================================
-- REISBLOC RETAIL - MIGRACIÓN DE PUBLICACIÓN REALTIME Y REPLICA IDENTITY FULL
-- Fecha: 2026-09-08
-- Propósito:
--   1. Configurar REPLICA IDENTITY FULL en tablas críticas ('orders', 'products', 'clients')
--      para permitir filtros por organization_id en canales de Supabase Realtime
--      durante eventos de UPDATE y DELETE sin cerrar el canal WebSocket.
--   2. Asegurar que 'clients' esté en la publicación supabase_realtime.
-- =============================================================================

ALTER TABLE "public"."orders" REPLICA IDENTITY FULL;
ALTER TABLE "public"."products" REPLICA IDENTITY FULL;
ALTER TABLE "public"."clients" REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'clients'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "public"."clients";
  END IF;
END $$;
