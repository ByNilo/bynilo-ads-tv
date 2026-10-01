const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
const sandbox = process.env.MERCADOPAGO_SANDBOX === 'true';

let preferenceClient = null;
let paymentClient = null;

function mercadoPagoActivo() {
  if (!accessToken) return false;
  return accessToken.startsWith('APP_USR') || accessToken.startsWith('TEST-');
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

function obtenerBaseUrlPublica() {
  const base = process.env.PUBLIC_BASE_URL?.trim();
  if (base) return base.replace(/\/+$/, '');
  return `http://localhost:${process.env.PORT || 3000}`;
}

async function crearPreferenciaPago(orden) {
  const { preferenceClient } = obtenerClientes();
  const baseUrl = obtenerBaseUrlPublica();
  const webhookUrl = `${baseUrl}/api/pagos/webhook`;

  const items = (orden.tarifas?.detalle || []).map((item, index) => ({
    id: `${orden.id}-${index + 1}`,
    title: `BYNILO ADS TV — ${item.bloqueNombre || 'Espacio publicitario'}`,
    description: `${item.fechaPublicacion} ${item.horarioElegido} (15 seg en vivo)`,
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
    notification_url: webhookUrl,
    statement_descriptor: 'BYNILO ADS TV',
    back_urls: {
      success: `${baseUrl}/?pago=exitoso&orden=${encodeURIComponent(orden.id)}`,
      failure: `${baseUrl}/?pago=fallido&orden=${encodeURIComponent(orden.id)}`,
      pending: `${baseUrl}/?pago=pendiente&orden=${encodeURIComponent(orden.id)}`,
    },
    auto_return: 'approved',
    payer: orden.emailFactura
      ? { email: orden.emailFactura }
      : undefined,
  };

  const respuesta = await preferenceClient.create({ body });
  const initPoint = sandbox
    ? respuesta.sandbox_init_point || respuesta.init_point
    : respuesta.init_point;

  return {
    preferenceId: respuesta.id,
    initPoint,
    externalReference: orden.id,
  };
}

async function consultarPago(paymentId) {
  const { paymentClient } = obtenerClientes();
  return paymentClient.get({ id: paymentId });
}

module.exports = {
  mercadoPagoActivo,
  obtenerBaseUrlPublica,
  crearPreferenciaPago,
  consultarPago,
};
