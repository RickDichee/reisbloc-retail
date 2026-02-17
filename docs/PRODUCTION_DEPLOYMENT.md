# Production Deployment Guide - Reisbloc POS

## Overview
This guide walks through deploying Reisbloc POS to production with strict security measures, JWT authentication, and restrictive RLS policies.

## Prerequisites
- ✅ Supabase CLI installed (`npm install -g @supabase/cli`)
- ✅ Production Supabase project created
- ✅ Node.js 18+ installed
- ✅ Git repository up to date (on master branch)
- ✅ Team access to production credentials

## Phase 1: Environment Setup

### 1.1 Create Production Supabase Project
1. Go to https://supabase.com
2. Create new project (select your preferred region)
3. Wait for project initialization (5-10 minutes)
4. Copy Project URL and Anon Key from **Project Settings > API**

### 1.2 Generate JWT Secret
```bash

# Generate a strong 32+ character secret
openssl rand -base64 32

# Output example:
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z
```

### 1.3 Configure .env.production
```bash
# Edit .env.production with production values
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key-here
VITE_SUPABASE_SERVICE_ROLE_KEY=your-prod-service-role-key
VITE_JWT_SECRET=your-generated-32-char-secret
VITE_ENVIRONMENT=production
```

### 1.4 Set Supabase CLI Context
```bash
# Authenticate with Supabase
supabase login

# Link to production project
supabase link --project-id your-production-project-id
```

## Phase 2: Database Setup

### 2.1 Apply Schema
```bash
# Execute the full schema (tables, indexes, triggers)
psql "$SUPABASE_CONNECTION_STRING" < docs/supabase-schema.sql

# Verify tables were created
psql "$SUPABASE_CONNECTION_STRING" -c "\dt"
```

### 2.2 Apply Production RLS Policies
**IMPORTANT:** Only after schema is in place!

```bash
# Execute production RLS policies
psql "$SUPABASE_CONNECTION_STRING" < docs/production-rls-policies.sql

# Verify policies are enabled
psql "$SUPABASE_CONNECTION_STRING" -c "SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;"
```

**Key Differences from Staging:**
- ✅ Restrictive role-based checks (not `WITH CHECK true`)
- ✅ Prevent amount modifications (fraud prevention)
- ✅ Explicit permission validation on every operation
- ✅ Time-based constraints for sensitive operations

### 2.3 Seed Initial Data
```bash
# Create admin user for system setup
psql "$SUPABASE_CONNECTION_STRING" << EOF
INSERT INTO users (id, name, role, pin_hash, created_at, updated_at)
VALUES (
  'admin-' || gen_random_uuid()::text,
  'Admin',
  'admin',
  crypt('1111', gen_salt('bf')),
  now(),
  now()
);
EOF

# Verify
psql "$SUPABASE_CONNECTION_STRING" -c "SELECT id, name, role FROM users LIMIT 5;"
```

## Phase 3: Edge Function Deployment

### 3.1 Set JWT Secret in Supabase
```bash
# Deploy the Edge Function secret
supabase secrets set JWT_SECRET="your-32-char-secret" \
  --project-id your-production-project-id

# Verify
supabase secrets list --project-id your-production-project-id
```

### 3.2 Deploy Edge Function
```bash
# Deploy generate-access-token function
supabase functions deploy generate-access-token \
  --project-id your-production-project-id \
  --no-verify

# Verify deployment
supabase functions list --project-id your-production-project-id
```

### 3.3 Test Edge Function
```bash
# Test JWT generation (requires auth)
curl -X POST https://your-prod-project.supabase.co/functions/v1/generate-access-token \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "role": "mesero",
    "deviceId": "test-device-id"
  }'

# Expected response:
# {"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...","expiresIn":86400}
```

## Phase 4: Application Build & Deploy

### 4.1 Build Application
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Output: dist/
```

### 4.2 Deploy to Hosting
Choose your hosting provider:

#### Option A: Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

#### Option B: Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

#### Option C: Firebase Hosting
```bash
npm install -g firebase-tools
firebase deploy
```

#### Option D: Self-hosted
```bash
# Copy dist/ to your server
scp -r dist/* user@production-server:/var/www/pos/

# Or use Docker
docker build -t reisbloc-pos:latest .
docker run -p 80:3000 reisbloc-pos:latest
```

## Phase 5: Post-Deployment Testing

### 5.1 Verify Application Load
```
Visit https://your-production-domain/
Check browser console for errors
Verify environment shows "production"
```

### 5.2 Test Authentication Flow
**Test Case 1: Mesero Login**
```
1. Enter PIN: 1111
2. Select Device: POS-01
3. Click Login
4. Verify JWT token generated (check localStorage)
5. Dashboard loads successfully
```

**Test Case 2: JWT Generation**
```
1. Check browser DevTools > Application > LocalStorage
2. Look for 'jwt_token' key
3. Token should contain user role and expiry (24h)
```

### 5.3 Test Order Workflow
**Mesero: Create Order**
```
1. Click "New Order"
2. Add items (5 x Coffee at 3.00 = 15.00)
3. Click "Send to Kitchen"
4. Verify order appears in Cocina tab
5. Verify audit_log created
```

**Cocina: Mark Ready**
```
1. Login as Cocina (PIN: 2222)
2. See pending order
3. Click "Ready"
4. Verify Toast notification
5. Verify notifications table updated
```

**Capitan: Process Payment**
```
1. Login as Capitan (PIN: 1111)
2. See order at counter
3. Enter payment (Cash, 20.00)
4. Click "Complete"
5. Verify sale record created
6. Verify order status = "completed"
7. Print receipt
```

### 5.4 Verify Notifications
```
1. Login to POS (Capitan role)
2. Click bell icon (top-right)
3. See notification history
4. Check realtime updates
5. Verify Toast appears on order events
```

### 5.5 Check RLS Policies in Action
```
-- In Supabase SQL Editor, test policies:

-- This should work (Mesero reading own order)
SELECT * FROM orders WHERE created_by = '<mesero-id>' LIMIT 1;

-- This should be blocked (Mesero reading other's order)
SELECT * FROM orders WHERE created_by != '<mesero-id>' LIMIT 1;

-- This should work (admin reading all)
SELECT * FROM orders LIMIT 10;  -- Only works with admin JWT
```

## Phase 6: Security Hardening

### 6.1 Enable HTTPS Enforcement
```bash
# In Supabase Project Settings > Database > SSL enforcement
# Set to "Require" (not "Prefer")
```

### 6.2 Configure CORS
```bash
# If custom domain, update Supabase CORS:
# Project Settings > API > CORS Configuration
# Add: https://your-production-domain
```

### 6.3 Set Up Rate Limiting (Optional)
- Consider rate limiting plugin if using self-hosted
- Monitor API usage via Supabase Dashboard

### 6.4 Enable Audit Logging
```bash
-- Verify audit triggers are active
SELECT * FROM pg_trigger WHERE tgname LIKE 'audit%';

-- Check recent audit logs
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
```

### 6.5 Backup Strategy
```bash
# Scheduled daily backups (Supabase Pro plan)
# Or manual backup:
pg_dump "$SUPABASE_CONNECTION_STRING" > backup-prod-$(date +%Y%m%d).sql

# Test restore procedure
psql "$SUPABASE_CONNECTION_STRING_BACKUP" < backup-prod-*.sql
```

## Phase 7: Monitoring & Maintenance

### 7.1 Set Up Error Tracking
- Configure Sentry (optional)
- Monitor Supabase logs
- Set up alerts for critical errors

### 7.2 Monitor Audit Logs
```bash
# View recent activity
psql "$SUPABASE_CONNECTION_STRING" << EOF
SELECT 
  user_id,
  action,
  table_name,
  created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 50;
EOF
```

### 7.3 Performance Monitoring
```bash
# Check database connections
SELECT count(*) FROM pg_stat_activity;

# Monitor slow queries
SELECT query, mean_exec_time FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 10;
```

### 7.4 Regular Maintenance
- ✅ Weekly: Review audit_logs for suspicious activity
- ✅ Weekly: Check error logs
- ✅ Monthly: Verify backup integrity
- ✅ Monthly: Update dependencies
- ✅ Quarterly: Security audit

## Troubleshooting

### Issue: JWT Not Generated
```
Solution:
1. Verify JWT_SECRET is set in Supabase secrets
2. Check Edge Function logs: supabase functions list
3. Ensure user exists in database
4. Check browser console for function errors
```

### Issue: Orders Not Saving
```
Solution:
1. Verify RLS policy allows INSERT (check auth role)
2. Check Supabase logs for RLS violation
3. Ensure user has permission for order creation
4. Verify network request succeeded (200 status)
```

### Issue: Notifications Not Appearing
```
Solution:
1. Verify realtime is enabled for notifications table
2. Check browser DevTools network tab
3. Verify auth token is valid
4. Check notification permissions in RLS
```

### Issue: Slow Performance
```
Solution:
1. Check database indexes: docs/supabase-schema.sql
2. Monitor active connections
3. Review slow query logs
4. Consider caching strategy
```

## Rollback Procedure

If critical issues occur:

```bash
# 1. Revert code to previous version
git checkout <previous-commit>
npm run build

# 2. Re-deploy application
vercel --prod  # or your deployment method

# 3. If database corrupted, restore backup
psql "$SUPABASE_CONNECTION_STRING_BACKUP" < backup-prod-latest.sql

# 4. Notify team
# Alert all users of maintenance window
```

## Going Live Checklist

- ✅ All tests passed
- ✅ RLS policies verified restrictive
- ✅ JWT_SECRET secured in Supabase
- ✅ HTTPS enforced
- ✅ Backup verified
- ✅ Team trained on production system
- ✅ Monitoring configured
- ✅ Runbook created for on-call support
- ✅ Rollback plan documented
- ✅ Load testing completed (if applicable)
- ✅ Security audit passed

## Support & Escalation

- **Critical Errors**: PagerDuty alert → On-call engineer
- **Data Issues**: Team lead decides on rollback
- **Performance**: Database team investigates
- **Security**: Immediate escalation required

---

**Last Updated:** 2026-01-27
**Production Status:** Ready for deployment
**Version:** Phase 2 - Supabase Migration
