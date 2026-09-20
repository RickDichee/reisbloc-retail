# 📧 Configuración de Envío de Correos - Cierre de Caja

## Descripción General

El sistema Reisbloc POS ahora incluye funcionalidad para:
1. **Imprimir** comprobantes de cierre de caja (genera un recibo HTML formateado)
2. **Enviar por correo** reportes de cierre con detalles de ventas, métodos de pago y desempeño de empleados

## Funcionalidades Implementadas

### 1. Impresión de Comprobantes ✅
- Botón "Imprimir" en la página de Cierre de Caja (`/closing`)
- Genera un recibo formato punto de venta con:
  - Encabezado con nombre de negocio y fecha
  - Totales de ventas, descuentos, propinas
  - Desglose de métodos de pago (Efectivo, Digital, CLIP)
  - Métricas: Transacciones, Ticket Promedio
  - Tabla de desempeño de empleados
  - Notas del cierre
  - CSS optimizado para impresoras (`@media print`)

**Uso:** Haz clic en "Imprimir" → se abre ventana de vista previa → confirma para imprimir

### 2. Envío de Correos 📧
- Botón "Enviar por Correo" en la página de Cierre de Caja
- Genera un email HTML profesional con:
  - Resumen visual con tarjetas de métricas
  - Gráficos de métodos de pago
  - Tabla detallada de empleados
  - Información completa de la venta

**Requisitos previos:**
- El usuario debe tener un email registrado en su perfil (campo `email` en la colección `users` de Firestore)
- Servidor de correo configurado en el backend

## Configuración de Envío de Correos

### Opción 1: Usar SendGrid (Recomendado para Producción)

1. **Crear cuenta en SendGrid**
   - Ve a https://sendgrid.com/
   - Crea una cuenta gratuita (hasta 100 correos/día)
   - Obtén tu API Key en Settings → API Keys

2. **Configurar Netlify Functions**
   Reemplaza el contenido de `netlify/functions/sendClosingEmail.ts` para integrar SendGrid:

   ```typescript
   const sgMail = require('@sendgrid/mail');
   sgMail.setApiKey(process.env.SENDGRID_API_KEY);

   // En la función handleSendEmail:
   const msg = {
     to: email,
     from: process.env.SENDGRID_FROM_EMAIL,
     subject: `📊 Reporte de Cierre de Caja - ${date}`,
     html: htmlContent,
   };
   await sgMail.send(msg);
   ```

3. **Configurar Variables de Entorno**
   Agrega en `netlify.toml`:
   ```toml
   [build]
   environment = {
     SENDGRID_API_KEY = "tu_api_key_aqui",
     SENDGRID_FROM_EMAIL = "noreply@tupv.com"
   }
   ```

   O en Netlify Dashboard:
   - Ve a Site settings → Build & deploy → Environment
   - Agrega: `SENDGRID_API_KEY` y `SENDGRID_FROM_EMAIL`

### Opción 2: Usar Gmail (Para Desarrollo Local)

1. **Crear contraseña de aplicación**
   - Ve a https://myaccount.google.com/security
   - Activa 2FA
   - Crea contraseña de aplicación (selecciona "Mail" y "Windows Computer")
   - Copia la contraseña generada

2. **Configurar variables de entorno** (.env local):
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=tu_correo@gmail.com
   SMTP_PASSWORD=tu_contraseña_app
   SMTP_FROM=tu_correo@gmail.com
   ```

3. **Instalar nodemailer** en functions:
   ```bash
   cd functions
   npm install nodemailer @types/nodemailer
   ```

### Opción 3: Usar Mailgun

1. **Crear cuenta en Mailgun**
   - Ve a https://www.mailgun.com/
   - Registra tu dominio
   - Obtén API Key

2. **Actualizar Netlify Function**
   ```typescript
   const mailgun = require('mailgun.js');
   const FormData = require('form-data');
   const client = new mailgun(FormData);
   const mg = client.domains.domain(process.env.MAILGUN_DOMAIN);

   await mg.messages.create(process.env.MAILGUN_DOMAIN, {
     from: `TPV <noreply@${process.env.MAILGUN_DOMAIN}>`,
     to: email,
     subject: `📊 Reporte de Cierre de Caja - ${date}`,
     html: htmlContent,
   });
   ```

## Estructura del Email Enviado

El email incluye:

```
┌─────────────────────────────────────┐
│  🏪 TPV SOLUTIONS                   │
│  Reporte de Cierre de Caja          │
│  Fecha: 23 de enero de 2026         │
│  Cajero: admin                      │
└─────────────────────────────────────┘

📊 MÉTRICAS PRINCIPALES
┌─────────────────────────────────────┐
│ Total Ventas: $1,250.00             │
│ Transacciones: 15                   │
│ Ticket Promedio: $83.33             │
│ Propinas: $125.00                   │
└─────────────────────────────────────┘

💰 RESUMEN FINANCIERO
  Subtotal:           $1,250.00
  Descuentos:          -$50.00
  Propinas:           +$125.00
  ─────────────────────────────
  A DEPOSITAR:       $1,325.00

💳 DESGLOSE DE PAGOS
  Efectivo:           $850.00 (68%)
  Digital:            $325.00 (26%)
  CLIP:                $75.00 (6%)

👥 DESEMPEÑO DE EMPLEADOS
  Empleado    │ Ventas    │ Propinas
  ────────────┼───────────┼──────────
  Juan        │ $750.00   │ $75.00
  María       │ $500.00   │ $50.00
```

## Agregar Email a Perfil de Usuario

Para que funcione el envío de correos, cada usuario necesita tener un email registrado.

**En Firestore (colección `users`):**
```json
{
  "id": "user123",
  "username": "admin",
  "email": "admin@example.com",
  "pin": "$2b$10...",
  "role": "admin",
  "active": true
}
```

**O actualizar en Admin Panel:**
- Ir a Admin → Usuarios
- Editar usuario
- Agregar campo email

## Testeo Local

### 1. Con Netlify Dev
```bash
netlify dev
```

Esto inicia las funciones de Netlify localmente.

### 2. Ver logs de desarrollo
En la página de Cierre de Caja:
1. Haz clic en "Enviar por Correo"
2. Revisa la consola del navegador (F12)
3. En desarrollo, se muestra: "Correo procesado (revisar console)"

## Historial de Correos

Los correos se guardan en Firestore en la colección `emailLogs`:

```json
{
  "type": "closing",
  "email": "admin@example.com",
  "username": "admin",
  "date": "23/01/2026",
  "closingData": { ... },
  "createdAt": "2026-01-23T15:30:00.000Z"
}
```



## Troubleshooting

### ❌ "No hay correo registrado en tu perfil"
**Solución:** Edita el usuario en Admin → Usuarios y agrega el email

### ❌ "Error de conexión al enviar correo"
**Solución:** 
- Verifica que el backend está corriendo
- Revisa que la función `sendClosingEmail` existe
- Comprueba los logs de Netlify

### ❌ Email no llega
**Solución:**
- Verifica carpeta de spam/junk
- Comprueba las credenciales de SendGrid/Gmail
- Revisa los logs de la función en Netlify Dashboard

## Funcionalidades Futuras

- [ ] Agregar adjunto PDF del reporte
- [ ] Copias de correo a administrador
- [ ] Plantillas de correo personalizables
- [ ] Historial de correos enviados (UI)
- [ ] Reenvío de correos fallidos
- [ ] Correos programados diarios

## Ejemplo de Código

**Enviar correo desde React (Closing.tsx):**
```typescript
const handleSendEmail = async () => {
  if (!currentUser?.email) {
    alert('⚠️ No hay correo registrado')
    return
  }

  try {
    const response = await fetch('/.netlify/functions/sendClosingEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentUser.email,
        username: currentUser.username,
        closingData,
        employeeMetrics,
        notes,
        date: new Date().toLocaleDateString('es-MX'),
      }),
    })

    if (response.ok) {
      alert('✅ Correo enviado exitosamente')
    }
  } catch (error) {
    alert('❌ Error al enviar correo')
  }
}
```

## Referencias

- [SendGrid API](https://docs.sendgrid.com/)
- [Nodemailer](https://nodemailer.com/)
- [Mailgun API](https://www.mailgun.com/docs/api/)
- [Netlify Functions](https://www.netlify.com/products/functions/)
