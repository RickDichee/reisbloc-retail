// Edge Function: webhook-auth-user-created
// Nombre sugerido al desplegar: webhook-auth-user-created
// Requisitos: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY están disponibles automáticamente.

import { createClient } from "npm:@supabase/supabase-js@2.35.0";

console.info("Webhook function starting");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

Deno.serve(async (req: Request) => {
  try {
    // Validate method
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
    }

    // Optional: basic verification of Supabase webhook signature
    // Supabase currently does not sign webhooks with a secret by default.
    // If you configured a secret use it here to validate.

    const body = await req.json().catch(() => null);
    if (!body) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Supabase sends events like { "user": { ... }, "event": "user.created" } depending on setup.
    // Inspect incoming body for structure.
    const event = body.event || body.type || null;
    const user = (body.record || body.user || body.data?.user) || null;

    // Basic validation
    if (!event || !user) {
      // reply with 200 so Supabase doesn't keep retrying if it's not our webhook format
      console.warn("Unrecognized webhook payload", { event, user });
      return new Response(JSON.stringify({ ok: false, reason: "unrecognized payload" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // Only handle user.created (adjust if your webhook uses a different event name)
    if (event !== "user.created" && event !== "auth.user.created" && event !== "USER_CREATED") {
      return new Response(JSON.stringify({ ok: true, skipped: true, event }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // Extract fields from user payload
    // Supabase auth user format: { id, email, phone, user_metadata, created_at, ... }
    const authUid = user.id || user.uid || null;
    const email = user.email || (user.user_metadata && user.user_metadata.email) || null;

    if (!authUid) {
      console.error("No auth UID in webhook payload", user);
      return new Response(JSON.stringify({ ok: false, reason: "no auth uid" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Upsert into public.users: create if not exists
    // Adjust columns to match your public.users schema.
    // We'll attempt to insert auth_uid, email, created_at; if row exists do nothing.
    const insertPayload: any = {
      auth_uid: authUid,
      email: email ?? null,
      created_at: new Date().toISOString(),
    };

    // Upsert by auth_uid (assumes a unique index on auth_uid). If you don't have it, use a select + insert.
    // Safer approach: try select first
    const { data: existing, error: selErr } = await admin
      .from("users")
      .select("id, auth_uid")
      .eq("auth_uid", authUid)
      .limit(1)
      .maybeSingle();

    if (selErr) {
      console.error("Error selecting existing user", selErr);
      // continue to try insert
    }

    if (existing && existing.id) {
      // Already exists - optionally update email if missing
      if (!existing.email && email) {
        const { error: updErr } = await admin.from("users").update({ email }).eq("auth_uid", authUid);
        if (updErr) console.error("Error updating existing user email", updErr);
      }
      return new Response(JSON.stringify({ ok: true, existed: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // Insert new user row
    const { data: inserted, error: insErr } = await admin.from("users").insert(insertPayload).select().limit(1).maybeSingle();

    if (insErr) {
      // If conflict on unique constraint (race) try to ignore
      console.error("Insert error", insErr);
      return new Response(JSON.stringify({ ok: false, error: insErr.message }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // Optionally create audit entry
    await admin.from("user_audit").insert({
      event_time: new Date().toISOString(),
      op: "INSERT_OR_UPSERT_FROM_WEBHOOK",
      userid: inserted?.id ?? null,
      row_data: inserted ?? insertPayload,
    });

    return new Response(JSON.stringify({ ok: true, inserted }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Unhandled error in webhook function", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});