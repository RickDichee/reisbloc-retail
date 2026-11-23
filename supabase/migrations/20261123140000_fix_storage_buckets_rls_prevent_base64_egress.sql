-- Migration: Ensure public buckets ('products', 'tickets', 'avatars') and RLS policies exist
-- Prevents storageService from falling back to Base64 Data URLs in retail_products / products tables

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('products', 'products', true),
  ('tickets', 'tickets', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read access for product, ticket, and avatar buckets
DROP POLICY IF EXISTS "Public Products Read" ON storage.objects;
CREATE POLICY "Public Products Read" ON storage.objects
  FOR SELECT USING (bucket_id IN ('products', 'tickets', 'avatars'));

-- Allow authenticated and anon (virtual POS PIN sessions) to upload product/avatar images
DROP POLICY IF EXISTS "POS Products Insert" ON storage.objects;
CREATE POLICY "POS Products Insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id IN ('products', 'tickets', 'avatars'));

DROP POLICY IF EXISTS "POS Products Update" ON storage.objects;
CREATE POLICY "POS Products Update" ON storage.objects
  FOR UPDATE USING (bucket_id IN ('products', 'tickets', 'avatars'));
