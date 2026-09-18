-- =============================================================================
-- PHASE 1 SECURITY CHECKS & VERIFICATION
-- Validates: Function permissions, explicit search_path, RLS enforcement
-- =============================================================================

-- 1. Check execute privileges on update_retail_stock_batch (Must NOT have anon / public)
SELECT 
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' 
  AND routine_name = 'update_retail_stock_batch'
ORDER BY grantee;

-- 2. Verify explicit search_path on Phase 1 SECURITY DEFINER functions
SELECT 
    p.proname AS function_name,
    p.prosecdef AS is_security_definer,
    p.proconfig AS runtime_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('update_retail_stock_batch', 'get_public_storefront_catalog');

-- 3. Verify RLS is enabled on retail_products
SELECT 
    relname AS table_name,
    relrowsecurity AS rls_enabled,
    relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname = 'retail_products';

-- 4. Verify retail_products policies (ensure retail_products_public_read blocks anon)
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'retail_products';

-- 5. Test RPC tenant isolation query (Expect empty if tenant does not exist)
SELECT * FROM public.get_public_storefront_catalog('non-existent-tenant-slug');
