-- 🛡️ MIGRACIÓN: Búsqueda segura de Email a nivel Auth
-- Objetivo: Permitir que las Edge Functions de invitación detecten si un usuario ya existe en Supabase Auth

CREATE OR REPLACE FUNCTION "public"."get_user_id_by_email"(
    "p_email" "text"
) RETURNS "uuid"
LANGUAGE "plpgsql" SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = p_email 
    LIMIT 1;
    
    RETURN v_user_id;
END;
$$;
