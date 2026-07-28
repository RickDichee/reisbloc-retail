-- Migration: Fix Clients Table Schema (created_by & total_spent)
-- Date: 2026-07-28

ALTER TABLE IF EXISTS "public"."clients"
  ADD COLUMN IF NOT EXISTS "created_by" uuid,
  ADD COLUMN IF NOT EXISTS "total_spent" numeric(10,2) DEFAULT 0;

-- RLS Policy Update for clients
ALTER TABLE IF EXISTS "public"."clients" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_org_all" ON "public"."clients";
CREATE POLICY "clients_org_all" ON "public"."clients"
  FOR ALL USING (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid 
    OR organization_id IS NOT NULL
  );
