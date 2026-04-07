# Deuda Técnica - Reisbloc Store

## Completado

### CFDI 4.0
- **Estado**: Código listo, requiere configuración
- **Archivos**: 
  - `src/services/facturapiService.ts` - Servicio de integración
  - `supabase/functions/facturapi-webhook/index.ts` - Webhook handler
  - `supabase/migrations/20260328000000_invoices.sql` - Tabla invoices
  - `src/pages/LandingPage.tsx` - Badge de CFDI 4.0 agregado (feature activa)
- **Pendiente**: Configurar `VITE_FACTURAPI_API_KEY` en variables de entorno

### WhatsApp Business
- **Estado**: Código listo, requiere configuración
- **Archivos**:
  - `src/services/whatsappService.ts` - Servicio de WhatsApp
  - `supabase/functions/whatsapp-webhook/index.ts` - Webhook con auto-respuestas
  - `supabase/migrations/20260328000001_whatsapp_messages.sql` - Tablas de mensajes
- **Pendiente**: 
  - Configurar `VITE_WHATSAPP_PHONE_NUMBER_ID` y `VITE_WHATSAPP_ACCESS_TOKEN`
  - Obtener WhatsApp Business API token de Meta
  - Registrar webhook en WhatsApp Business API

### Ticket Sharing (COMPLETADO)
- **Estado**: Implementado ✅
- **Archivos**:
  - `src/services/ticketService.ts` - Servicio de generación y envío de tickets
  - `src/components/pos/TicketShareModal.tsx` - Modal para compartir tickets
  - `src/pages/POS.tsx` - Botón "Compartir" en modal de ticket
- **Funcionalidades**:
  - Genera PDF del ticket desde HTML
  - Envío por WhatsApp (con API o fallback a wa.me)
  - Envío por Email con PDF adjunto
  - Formateo de número de teléfono automático
- **Pendiente**:
  - Crear bucket de storage `tickets` en Supabase (políticas RLS)
  - Configurar variables de WhatsApp Business

## Notas de Configuración

### Facturapi
1. Crear cuenta en https://www.facturapi.io
2. Obtener API Key de prueba/producción
3. Configurar en Supabase:
   - `FACTURAPI_API_KEY`
   - `FACTURAPI_WEBHOOK_SECRET`
4. Registrar webhook: `https://[project].supabase.co/functions/v1/facturapi-webhook`

### WhatsApp Business
1. Crear app en Meta for Developers
2. Agregar producto WhatsApp Business
3. Configurar número de teléfono
4. Obtener Phone Number ID y Access Token
5. Configurar en Supabase:
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_VERIFY_TOKEN` (token aleatorio para verificación)
6. Registrar webhook: `https://[project].supabase.co/functions/v1/whatsapp-webhook?hub.verify_token=[WHATSAPP_VERIFY_TOKEN]&hub.mode=subscribe`

### Supabase Storage (Tickets)
1. Crear bucket público `tickets`
2. Configurar políticas RLS:
```sql
-- Política para usuarios autenticados subir tickets propios
CREATE POLICY "Users can upload own tickets"
ON storage.buckets FOR INSERT
TO authenticated
WITH CHECK (name = 'tickets');

-- Política para leer tickets propios
CREATE POLICY "Users can read own tickets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'tickets');
```
