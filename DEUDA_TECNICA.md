# Deuda T&#233;cnica - Reisbloc Store

## Completado

### CFDI 4.0
- **Estado**: C&#243;digo listo, requiere configuraci&#243;n
- **Archivos**: 
  - `src/services/facturapiService.ts` - Servicio de integraci&#243;n
  - `supabase/functions/facturapi-webhook/index.ts` - Webhook handler
  - `supabase/migrations/20260328000000_invoices.sql` - Tabla invoices
- **Pendiente**: Configurar `VITE_FACTURAPI_API_KEY` en variables de entorno

### WhatsApp Business
- **Estado**: C&#243;digo listo, requiere configuraci&#243;n
- **Archivos**:
  - `src/services/whatsappService.ts` - Servicio de WhatsApp
  - `supabase/functions/whatsapp-webhook/index.ts` - Webhook con auto-respuestas
  - `supabase/migrations/20260328000001_whatsapp_messages.sql` - Tablas de mensajes
- **Pendiente**: 
  - Configurar `VITE_WHATSAPP_PHONE_NUMBER_ID` y `VITE_WHATSAPP_ACCESS_TOKEN`
  - Obtener WhatsApp Business API token de Meta
  - Registrar webhook en WhatsApp Business API

## Pendiente

### Ticket Sharing
- Implementar funcionalidad para compartir tickets v&#237;a WhatsApp/email
- User story: El usuario quiere enviar el ticket de compra a un cliente por WhatsApp
- API necesaria: Usar whatsappService.sendDocumentMessage() con PDF del ticket

### Landing Page - CFDI Badge
- El landing ya dice "Pr&#243;ximamente: Facturaci&#243;n CFDI 4.0"
- Una vez configurado, cambiar a feature activa

## Notas de Configuraci&#243;n

### Facturapi
1. Crear cuenta en https://www.facturapi.io
2. Obtener API Key de prueba/producci&#243;n
3. Configurar en Supabase:
   - `FACTURAPI_API_KEY`
   - `FACTURAPI_WEBHOOK_SECRET`
4. Registrar webhook: `https://[project].supabase.co/functions/v1/facturapi-webhook`

### WhatsApp Business
1. Crear app en Meta for Developers
2. Agregar producto WhatsApp Business
3. Configurar n&#250;mero de tel&#233;fono
4. Obtener Phone Number ID y Access Token
5. Configurar en Supabase:
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_VERIFY_TOKEN` (token aleatorio para verificaci&#243;n)
6. Registrar webhook: `https://[project].supabase.co/functions/v1/whatsapp-webhook?hub.verify_token=[WHATSAPP_VERIFY_TOKEN]&hub.mode=subscribe`
