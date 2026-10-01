# Mercado Pago — BYNILO ADS TV

Integración con **Checkout Pro** de Mercado Pago. El cliente paga después de que la IA aprueba el anuncio (semáforo verde).

## Flujo

1. Cliente completa formulario y elige espacios.
2. Moderación IA (verde / amarillo / rojo).
3. Si es **verde** y Mercado Pago está configurado → redirección a Mercado Pago.
4. Pago aprobado → webhook confirma la reserva automáticamente.
5. Cliente vuelve al sitio con mensaje de éxito.

## Configuración (obligatoria para pagos)

### 1. Crear aplicación en Mercado Pago

1. Entra a https://www.mercadopago.cl/developers/panel/app
2. Crea una aplicación.
3. En **Credenciales** copia el **Access Token** de prueba o producción.

### 2. Variables de entorno

En `.env` (local) o **Environment** en Render:

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `MERCADOPAGO_ACCESS_TOKEN` | `APP_USR-...` | Token privado (nunca en el frontend) |
| `MERCADOPAGO_SANDBOX` | `true` | `true` = pruebas, `false` = producción |
| `PUBLIC_BASE_URL` | `https://bynilo-ads-tv.onrender.com` | URL pública del sitio |

### 3. Webhook (Render / producción)

Mercado Pago notificará pagos a:

```
https://TU-DOMINIO/api/pagos/webhook
```

En el panel de Mercado Pago → tu aplicación → **Webhooks**, agrega esa URL con evento **Pagos**.

> En Render Free la URL es `https://bynilo-ads-tv.onrender.com/api/pagos/webhook`

## Sobre el MCP que compartiste

Esta configuración es para **Cursor IDE** (asistente de desarrollo):

```json
{
  "mcpServers": {
    "mercadopago-mcp-server": {
      "url": "https://mcp.mercadopago.com/mcp"
    }
  }
}
```

**No reemplaza** el Access Token en el servidor. El sitio web usa la API de Mercado Pago directamente desde `lib/mercadopago.js`.

## Modo sin Mercado Pago

Si **no** configuras `MERCADOPAGO_ACCESS_TOKEN`, el sitio funciona como antes: reserva directa sin pago en línea.

## Pruebas (Chile)

1. Usa credenciales de **prueba** del vendedor (`MERCADOPAGO_SANDBOX=true`).
2. En modo prueba el servidor usa automáticamente la URL **sandbox** de Mercado Pago. Solo define `MERCADOPAGO_SANDBOX_URL=false` si necesitas forzar la URL de producción.
3. Verifica `/api/health` → `"mercadoPagoActivo": true`.

### Tarjeta de prueba (pago aprobado)

| Campo | Valor |
|-------|--------|
| Número | `4168 8188 4444 7115` (Visa) |
| Vencimiento | `11/30` |
| CVV | `123` |
| Titular | `APRO` |
| RUT/Documento | Otro — `123456789` |

Documentación: https://www.mercadopago.cl/developers/es/docs/checkout-pro/integration-test/test-purchases

### Si el botón PAGAR está deshabilitado o el pago se queda trabado

1. **Ventana incógnito** (evita mezclar tu cuenta real con el modo prueba).
2. **Inicia sesión como comprador de prueba** antes de pagar:
   - [Mercado Pago Developers](https://www.mercadopago.cl/developers/panel/app) → tu app → **Cuentas de prueba** → tipo **Comprador**.
   - Usa ese usuario y contraseña en [mercadopago.cl](https://www.mercadopago.cl) dentro de la ventana incógnito.
3. **Titular de la tarjeta:** exactamente `APRO` (todo en mayúsculas).
4. **Documento:** tipo **Otro** (no RUT) y número `123456789` (9 dígitos).
5. **Cuotas:** si aparece selector, elige **1 cuota**.
6. Marca la casilla de **términos y condiciones** si Mercado Pago la muestra.
7. No uses tarjeta real en modo prueba.
8. Ingresa **correo válido** en el formulario de BYNILO antes de confirmar.

> El servidor en modo prueba redirige al checkout **sandbox** de Mercado Pago. Si entras al checkout de producción, las tarjetas de prueba no funcionan y el botón PAGAR puede quedar bloqueado.

## Archivos del proyecto

| Archivo | Función |
|---------|---------|
| `lib/mercadopago.js` | Crear preferencia de pago |
| `lib/ordenes-pendientes.js` | Guardar reserva antes del pago |
| `server.js` | Webhook y confirmación |
| `SIC/src/App.jsx` | Mensaje al volver de Mercado Pago |
