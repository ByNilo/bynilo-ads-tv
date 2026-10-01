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
2. **No uses** `MERCADOPAGO_SANDBOX_URL=true` salvo que falle init_point — en Chile suele funcionar mejor la URL normal (`init_point`).
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

### Si el pago se queda trabado

1. Usa ventana **incógnito**.
2. Titular debe ser exactamente **`APRO`** (aprobado).
3. No uses tarjeta real en modo prueba.
4. Opcional: crea **cuenta comprador de prueba** en Mercado Pago Developers → Cuentas de prueba, e inicia sesión en MP antes de pagar.
5. Ingresa **correo válido** en el formulario antes de confirmar.

## Archivos del proyecto

| Archivo | Función |
|---------|---------|
| `lib/mercadopago.js` | Crear preferencia de pago |
| `lib/ordenes-pendientes.js` | Guardar reserva antes del pago |
| `server.js` | Webhook y confirmación |
| `SIC/src/App.jsx` | Mensaje al volver de Mercado Pago |
