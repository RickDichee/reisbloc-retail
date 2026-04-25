-- Ecosystem Events Table for Adoption Tracking
-- Run this in your Supabase SQL Editor

-- Create the events table
CREATE TABLE IF NOT EXISTS ecosystem_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wholesaler_id UUID NOT NULL,
  store_id UUID NOT NULL,
  product_id UUID NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'import' CHECK (event_type IN ('import', 'view', 'reorder')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast time-series queries
CREATE INDEX IF NOT EXISTS idx_events_wholesaler_time ON ecosystem_events(wholesaler_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_store_time ON ecosystem_events(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_product_time ON ecosystem_events(product_id, created_at DESC);

-- RLS (disable for now - can enable per-org later)
ALTER TABLE ecosystem_events DISABLE ROW LEVEL SECURITY;

-- Seed historical events from existing store_inventory
INSERT INTO ecosystem_events (wholesaler_id, store_id, product_id, event_type, created_at)
SELECT 
  wc.wholesaler_id,
  si.store_id,
  si.wholesale_product_id,
  'import',
  NOW() - (random() * interval '30 days')::interval
FROM store_inventory si
JOIN wholesale_catalog wc ON wc.id = si.wholesale_product_id
WHERE si.wholesale_product_id IS NOT NULL;