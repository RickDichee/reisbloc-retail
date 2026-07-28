-- Migration: Create Storage Bucket for Tickets
-- Date: 2026-07-28

INSERT INTO storage.buckets (id, name, public)
VALUES ('tickets', 'tickets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage.objects on tickets bucket
DROP POLICY IF EXISTS "Public Tickets Read" ON storage.objects;
CREATE POLICY "Public Tickets Read" ON storage.objects
  FOR SELECT USING (bucket_id = 'tickets');

DROP POLICY IF EXISTS "Authenticated Tickets Insert" ON storage.objects;
CREATE POLICY "Authenticated Tickets Insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'tickets');
