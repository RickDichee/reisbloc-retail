# Phase 1 Security Audit (2026-09-18)

## Scope covered
- Secret exposure remediation (Clip defaults + server/client config)
- Public storefront tenant isolation
- Inventory RPC authorization and grants
- SECURITY DEFINER / RLS review for Phase 1 surfaces
- Multitenant RLS verification queries

## Findings addressed in this PR
1. Removed hard-coded Clip defaults from:
   - `vite.config.ts`
   - `api/clip-pinpad.ts`
   - `src/services/clipPinpadService.ts` (default serial)
2. Public storefront now requires exact tenant slug/UUID resolution with no unsafe fallback tenant.
3. Public product catalog retrieval no longer falls back to unscoped product queries.
4. `update_retail_stock_batch` hardened with:
   - explicit `search_path`
   - JWT/auth checks
   - tenant ownership checks
   - UUID payload validation
   - least-privilege grants (`authenticated`, `service_role`; no `anon`)
5. Public catalog RPC `get_public_storefront_catalog` hardened with exact slug/UUID behavior and explicit `search_path`.
6. Direct anonymous table reads on `retail_products` were blocked (RPC-only public access path).

## Secret scanning summary
- Current-tree scan was executed for likely credential patterns and known exposed Clip defaults.
- Prior committed secrets were detected in repository history context (now removed from current tracked source/config files).
- **Action required:** rotate any previously exposed Clip credentials/serial/webhook-related secrets and re-issue credentials in provider dashboards.

## Intentional service-role-only exceptions (kept)
- Referral/webhook service workflows remain service-role driven where required by backend automation.
- These flows are intentionally not exposed to `anon` and should continue to run through secured server/Edge Function contexts only.

## Deployment/config requirements
Set these server-only variables in deployment runtime (not in client `VITE_*`):
- `CLIP_API_KEY`
- `CLIP_API_SECRET`
- `CLIP_PINPAD_SERIAL`
- `CLIP_WEBHOOK_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`

## Verification
Run:
- `supabase/verification/phase1_security_checks.sql`

Manual checks:
- Invalid slug/UUID for storefront returns empty catalog (no fallback tenant).
- Unknown tenant returns empty catalog.
- Cross-tenant inventory stock update via authenticated user is denied by RPC.
- Anonymous direct select on `retail_products` is denied/empty by policy.

