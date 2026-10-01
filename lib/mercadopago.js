const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const accessToken = (
  process.env.MERCADOPAGO_ACCESS_TOKEN ||
  process.env.MP_ACCESS_TOKEN ||
  process.env.MERCADOPAGO_TOKEN ||
  ''
).trim().replace(/^["']|["']$/g, '');

const sandbox = process.env.MERCADOPAGO_SANDBOX !== 'false';

let preferenceClient = null;
let paymentClient = null;

function mercadoPagoActivo() {
  if (!accessToken || accessToken.length < 20) return false;
  const lower = accessToken.toLowerCase();
  if (lower.includes('tu-token') || lower.includes('example') || lower === 'xxx') return false;
  return (
    accessToken.startsWith('APP_USR') ||
    accessToken.startsWith('TEST-') ||
    accessToken.startsWith('APP-')
  );
}

function estadoMercadoPago() {
  return {
    activo: mercadoPagoActivo(),
    tokenConfigurado: accessToken.length > 0,
    sandbox,
  };
}

function obtenerClientes() {
  if (!mercadoPagoActivo()) {
    throw new Error('Mercado Pago no está configurado.');
  }

  if (!preferenceClient) {
    const config = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 10000 },
    });
    preferenceClient = new Preference(config);
    paymentClient = new Payment(config);
  }

  return { preferenceClient, paymentClient };
}

function obtenerBaseUrlPublica(req) {
  if (req?.get?.('x-forwarded-proto') && req?.get?.('host')) {
    return `${req.get('x-forwarded-proto')}://${req.get('host')}`.replace(/\/+$/, '');
  }

  const base =
    process.env.PUBLIC_BASE_URL?.trim() ||
    process.env.RENDER_EXTERNAL_URL?.trim() ||
    process.env.URL?.trim();

  if (base) return base.replace(/\/+$/, '');
  return `http://localhost:${process.env.PORT || 3000}`;
}

function extraerErrorMercadoPago(error) {
  if (Array.isArray(error?.cause) && error.cause.length > 0) {
    return error.cause.map((c) => c.description || c.code).filter(Boolean).join(' | ');
  }
  if (error?.message) return error.message;
  return 'Error desconocido al contactar Mercado Pago.';
}

async function crearPreferenciaPago(orden, req) {
  const { preferenceClient } = obtenerClientes();
  const baseUrl = obtenerBaseUrlPublica(req);
  const webhookUrl = `${baseUrl}/api/pagos/webhook`;
  const esHttps = baseUrl.startsWith('https://');

  const items = (orden.tarifas?.detalle || []).map((item, index) => ({
    id: String(index + 1),
    title: `BYNILO ADS TV - ${(item.bloqueNombre || 'Espacio').slice(0, 40)}`,
    description: `${item.fechaPublicacion} ${item.horarioElegido}`.slice(0, 100),
    quantity: 1,
    currency_id: 'CLP',
    unit_price: Number(item.precio),
  }));

  if (items.length === 0) {
    throw new Error('La orden no tiene ítems de pago.');
  }

  const body = {
    items,
    external_reference: orden.id,
    statement_descriptor: 'BYNILO ADS',
    back_urls: {
      success: `${baseUrl}/?pago=exitoso&orden=${encodeURIComponent(orden.id)}`,
      failure: `${baseUrl}/?pago=fallido&orden=${encodeURIComponent(orden.id)}`,
      pending: `${baseUrl}/?pago=pendiente&orden=${encodeURIComponent(orden.id)}`,
    },
  };

  if (esHttps) {
    body.notification_url = webhookUrl;
    body.auto_return = 'approved';
  }

  if (orden.emailFactura) {
    body.payer = { email: orden.emailFactura };
  }

  try {
    const respuesta = await preferenceClient.create({ body });
    const initPoint = sandbox
      ? respuesta.sandbox_init_point || respuesta.init_point
      : respuesta.init_point || respuesta.sandbox_init_point;

    if (!initPoint) {
      throw new Error('Mercado Pago no devolvió enlace de pago.');
    }

    return {
      preferenceId: respuesta.id,
      initPoint,
      externalReference: orden.id,
      baseUrlUsada: baseUrl,
    };
  } catch (error) {
    const detalle = extraerErrorMercadoPago(error);
    console.error('[Pago] Error Mercado Pago:', detalle);
    console.error('[Pago] Base URL usada:', baseUrl);
    throw new Error(detalle);
  }
}

async function consultarPago(paymentId) {
  const { paymentClient } = obtenerClientes();
  return paymentClient.get({ id: paymentId });
}

module.exports = {
  mercadoPagoActivo,
  estadoMercadoPago,
  obtenerBaseUrlPublica,
  crearPreferenciaPago,
  consultarPago,
};
