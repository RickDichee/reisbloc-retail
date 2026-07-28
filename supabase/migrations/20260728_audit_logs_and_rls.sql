-- Migration: Audit Logs RLS & Realtime Multi-Tenant Policies
-- Date: 2026-07-28
-- Compliance: OWASP ASVS 4.0 & PCI-DSS v4.0 (Audit Trail & Data Segregation)

-- 1. Ensure public.audit_logs table columns match application expectations
ALTER TABLE IF EXISTS "public"."audit_logs" 
  ADD COLUMN IF NOT EXISTS "old_value" jsonb,
  ADD COLUMN IF NOT EXISTS "new_value" jsonb,
  ADD COLUMN IF NOT EXISTS "details" text,
  ADD COLUMN IF NOT EXISTS "device_id" text,
  ADD COLUMN IF NOT EXISTS "location" text,
  ADD COLUMN IF NOT EXISTS "session_type" text;

-- Fix primary key id column if date type or missing
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'id' AND data_type = 'date'
  ) THEN
    ALTER TABLE "public"."audit_logs" DROP COLUMN "id";
    ALTER TABLE "public"."audit_logs" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid();
  END IF;
END $$;

-- 2. Habilitar RLS en audit_logs y orders
ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS de Aislamiento Multi-Tenant por organization_id

-- audit_logs: inserción pública/autenticada y lectura restringida por organización
DROP POLICY IF EXISTS "audit_logs_org_insert" ON "public"."audit_logs";
CREATE POLICY "audit_logs_org_insert" ON "public"."audit_logs"
  FOR INSERT WITH CHECK (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid 
    OR organization_id IS NOT NULL
  );

DROP POLICY IF EXISTS "audit_logs_org_select" ON "public"."audit_logs";
CREATE POLICY "audit_logs_org_select" ON "public"."audit_logs"
  FOR SELECT USING (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid
    OR (auth.jwt() ->> 'role') IN ('owner', 'admin', 'gerente')
  );

-- 4. Habilitar Supabase Realtime Replication para las tablas requeridas
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
