# 🔑 GUÍA DE CONFIGURACIÓN DE SECRETOS (REISBLOC)

Sigue estos pasos para reactivar tu aplicación con las **nuevas llaves** que generaste en Supabase.

## 📌 Paso 1: Obtener las llaves de Supabase
1. Entra a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard).
2. Ve a **Settings (Engrane) > API**.
3. Copia los siguientes valores:
   - **Project URL**: (Ej: `https://xxx.supabase.co`)
   - **anon / public key**: (La llave que empieza con `eyJ...`)
   - **service_role / secret key**: (Haz clic en 'Reveal' para verla. Empieza con `eyJ...`)

## 📌 Paso 2: Actualizar `.env.local`
Abre el archivo `.env.local` en este editor y pega los valores en sus respectivos campos:

```bash
# 🌐 Copia 'Project URL' aquí (mantenlo igual en ambos campos)
VITE_SUPABASE_URL=https://your_project_ref.supabase.co
SUPABASE_URL=https://your_project_ref.supabase.co

# 🔑 Copia 'anon / public' aquí
VITE_SUPABASE_ANON_KEY=TU_NUEVA_ANON_KEY

# 🛡️ Copia 'service_role / secret' aquí
SUPABASE_SERVICE_ROLE_KEY=TU_NUEVA_SERVICE_ROLE_KEY

# 🎟️ Genera un JWT_SECRET (puedes usar cualquier cadena de 32 letras aleatorias)
JWT_SECRET=UNA_CADENA_LARGA_Y_SEGURA_DE_32_CARACTERES
```

## 📌 Paso 3: Actualizar Edge Functions
Si usas funciones de Supabase (como `social-agent` o `conekta`), debes actualizar sus secretos en la terminal de Supabase CLI o en el Dashboard:
1. Dashboard > Edge Functions > [Nombre de la función] > Settings.
2. Agrega los mismos valores (`JWT_SECRET`, `OPENAI_API_KEY`, etc.).

---
> [!TIP]
> Una vez que actualices `.env.local`, reinicia tu servidor de desarrollo para que tome los cambios (`npm run dev`).
