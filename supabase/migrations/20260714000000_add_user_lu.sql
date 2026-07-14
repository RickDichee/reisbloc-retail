-- 🛡️ MIGRACIÓN: Creación y configuración del usuario administrador Lu Velázquez
-- Corresponde al correo lu.velazquezz@gmail.com con plan 'pro' (membresía Negocio)

DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
BEGIN
  -- 1. Buscar si el usuario ya existe en auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'lu.velazquezz@gmail.com';
  
  -- 2. Si no existe, insertarlo
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id, 
      instance_id, 
      email, 
      encrypted_password, 
      email_confirmed_at, 
      raw_app_meta_data, 
      raw_user_meta_data, 
      is_super_admin, 
      role, 
      aud, 
      confirmation_token
    )
    VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'lu.velazquezz@gmail.com',
      crypt('password123', gen_salt('bf')), -- Contraseña por defecto
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"full_name": "Lu Velázquez", "plan": "pro"}'::jsonb,
      false,
      'authenticated',
      'authenticated',
      ''
    );
    -- NOTA: El trigger handle_new_user() en la tabla auth.users
    -- creará la organización (plan pro) y el perfil en public.users (rol admin) automáticamente.
    
  ELSE
    -- 3. Si ya existe, asegurar que el perfil tenga rol admin y la organización tenga plan pro
    SELECT organization_id INTO v_org_id FROM public.users WHERE id = v_user_id;
    
    IF v_org_id IS NOT NULL THEN
      -- Actualizar plan de la organización a 'pro' (membresía negocio)
      UPDATE public.organizations 
      SET plan = 'pro'::public.plan_type 
      WHERE id = v_org_id;
    END IF;
    
    -- Actualizar rol del perfil a 'admin'
    UPDATE public.users 
    SET role = 'admin' 
    WHERE id = v_user_id;
  END IF;
END $$;
