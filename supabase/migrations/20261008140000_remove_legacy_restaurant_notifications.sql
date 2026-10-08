-- =========================================================================
-- Remove Legacy Restaurant Notification Triggers and Clean Notifications
-- =========================================================================

-- 1. Drop restaurant triggers on orders table
DROP TRIGGER IF EXISTS "tr_notify_new_order" ON "public"."orders";
DROP TRIGGER IF EXISTS "tr_notify_order_ready" ON "public"."orders";

-- 2. Drop corresponding trigger functions
DROP FUNCTION IF EXISTS "public"."on_new_order_notification"();
DROP FUNCTION IF EXISTS "public"."on_order_ready_notification"();

-- 3. Clean up any remaining legacy restaurant notifications
DELETE FROM "public"."notifications" 
WHERE title ILIKE '%comanda%' 
   OR title ILIKE '%mesa%' 
   OR body ILIKE '%cocina%' 
   OR body ILIKE '%bar%';
