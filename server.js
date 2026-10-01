require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
const {
  INTERVALO_SEG,
  HORA_INICIO,
  HORA_FIN,
  VENTANAS_MINUTOS,
  generarEspaciosDelDia,
  generarCatalogoHoras,
  parseHorario,
  parseFecha,
  crearFechaEmision,
  claveReserva,
  generarDiasDisponibles,
  formatearFechaLocal,
  esHorarioEnGrilla,
  esEspacioFuturo,
  filtrarEspaciosFuturos,
} = require('./lib/horarios');
const {
  sanitizarTextoPublicitario,
  sanitizarTextoOferta,
  contieneSimbolosProhibidos,
  contieneSimbolosProhibidosOferta,
  MENSAJE_SIMBOLOS_PROHIBIDOS,
  MENSAJE_SIMBOLOS_PROHIBIDOS_OFERTA,
} = require('./lib/texto-publicitario');
const {
  guardarReservaPendiente,
  listarReservasPendientes,
} = require('./lib/reservas-pendientes');
const { detectarMedioComunicacion } = require('./lib/medios-comunicacion');
const {
  obtenerTarifaEspacio,
  calcularTotalReserva,
  obtenerResumenTarifas,
} = require('./lib/tarifas');
const {
  guardarOrdenPendiente,
  cargarOrdenPendiente,
  actualizarOrdenPendiente,
} = require('./lib/ordenes-pendientes');
const {
  mercadoPagoActivo,
  estadoMercadoPago,
  obtenerBaseUrlPublica,
  crearPreferenciaPago,
  consultarPago,
} = require('./lib/mercadopago');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const EMISION_TV_ACTIVA = process.env.EMISION_TV_ACTIVA !== 'false';

// Ruta donde Just Broadcast lee los archivos de texto
const JUST_BROADCAST_FOLDER = process.env.JUST_BROADCAST_FOLDER || 'C:/JustBroadcast/Output';

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Intervalo mínimo entre emisiones
const DURACION_BANNER_MS = 15 * 1000;
const PAUSA_ENTRE_EMISIONES_MS = 30 * 1000;
const INTERVALO_TOTAL_MS = DURACION_BANNER_MS + PAUSA_ENTRE_EMISIONES_MS;
const MAX_BLOQUES_POR_SESION = 10;

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (EMISION_TV_ACTIVA && !fs.existsSync(JUST_BROADCAST_FOLDER)) {
  fs.mkdirSync(JUST_BROADCAST_FOLDER, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen.'));
    }
  },
});

const apiKey = process.env.OPENAI_API_KEY?.trim();
const openai =
  apiKey && apiKey.startsWith('sk-') && !apiKey.includes('tu-api-key')
    ? new OpenAI({ apiKey })
    : null;

// Control de intervalo de 45 segundos
let ultimaEmisionFin = 0;
let emisionEnCurso = false;
const colaEmisiones = [];
const horariosReservados = new Set();

// ─── Validación RUT chileno (Módulo 11) ───────────────────────────────────────

function validarRUT(rutCompleto) {
  if (!rutCompleto) return false;
  rutCompleto = rutCompleto.replace(/\./g, '').replace(/-/g, '');
  const cuerpo = rutCompleto.slice(0, -1);
  const dv = rutCompleto.slice(-1).toUpperCase();

  if (!/^\d+$/.test(cuerpo)) return false;

  let suma = 0;
  let multiplo = 2;

  for (let i = 1; i <= cuerpo.length; i++) {
    suma += multiplo * parseInt(cuerpo.charAt(cuerpo.length - i), 10);
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }

  const dvEsperado = 11 - (suma % 11);
  const dvFinal =
    dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();

  return dvFinal === dv;
}

// ─── Moderación con OpenAI Vision API ─────────────────────────────────────────

const CATEGORIAS_ROJO = [
  'política',
  'alcohol',
  'religión',
  'contenido sexual',
  'casinos',
  'funas',
  'discriminación',
  'lenguaje vulgar',
  'contenido inapropiado',
];

const CATEGORIAS_AMARILLO = ['medios de comunicación'];

function esSitioWeb(valor) {
  const v = valor.trim().toLowerCase();
  return /^(https?:\/\/|www\.)/.test(v) || /\.[a-z]{2,}(\/|$|\?)/i.test(v);
}

function normalizarRedes(redes) {
  if (!redes?.trim()) return '';
  const limpio = redes.trim();
  if (esSitioWeb(limpio)) {
    return limpio.replace(/\/+$/, '');
  }
  const usuario = limpio.replace(/^@+/, '');
  return usuario ? `@${usuario}` : '';
}

function extraerDatosModeracion(body) {
  const solicitarFactura = body.solicitarFactura === 'true' || body.solicitarFactura === true;
  const datos = {
    rut: body.rut?.trim() || '',
    negocio: body.negocio?.trim() || '',
    textoOferta: body.textoOferta?.trim() || '',
    contacto: body.contacto?.trim() || '',
    redesSociales: normalizarRedes(body.redesSociales),
  };

  if (solicitarFactura) {
    datos.facturacion = {
      rutFactura: body.rutFactura?.trim() || '',
      razonSocial: body.razonSocial?.trim() || '',
      giro: body.giro?.trim() || '',
      direccion: body.direccion?.trim() || '',
      comuna: body.comuna?.trim() || '',
      emailFactura: body.emailFactura?.trim() || '',
    };
  }

  return datos;
}

function construirTextoModeracion(datos) {
  const lineas = [
    `RUT anunciante: ${datos.rut}`,
    `Nombre del negocio: ${datos.negocio}`,
    `Texto de la oferta: ${datos.textoOferta}`,
  ];

  if (datos.contacto) lineas.push(`Número de contacto: ${datos.contacto}`);
  if (datos.redesSociales) {
    const etiqueta = esSitioWeb(datos.redesSociales) ? 'Sitio web' : 'Redes sociales';
    lineas.push(`${etiqueta}: ${datos.redesSociales}`);
  }

  if (datos.facturacion) {
    lineas.push('Datos de facturación:');
    lineas.push(`  RUT factura: ${datos.facturacion.rutFactura}`);
    lineas.push(`  Razón social: ${datos.facturacion.razonSocial}`);
    lineas.push(`  Giro: ${datos.facturacion.giro}`);
    lineas.push(`  Dirección: ${datos.facturacion.direccion}`);
    lineas.push(`  Comuna: ${datos.facturacion.comuna}`);
    lineas.push(`  Email factura: ${datos.facturacion.emailFactura}`);
  }

  return lineas.join('\n');
}

async function moderarContenido(datosAnuncio, imagenBuffer, mimeType) {
  const deteccionMedio = detectarMedioComunicacion(datosAnuncio);
  if (deteccionMedio.detectado) {
    console.log('[Moderación] Medio de comunicación detectado (listado):', deteccionMedio.coincidencias.join(', '));
    return {
      semaforo: 'amarillo',
      categorias: ['medios de comunicación'],
      razon: deteccionMedio.razon,
      palabrasInfractoras: deteccionMedio.coincidencias,
      textoSugerido: datosAnuncio.textoOferta || '',
      sugerencias: [
        'Los medios de comunicación y portales de noticias deben pasar revisión editorial en BYNILO ADS TV.',
        'Si crees que es un error, contacta al equipo editorial con el nombre de tu negocio y giro comercial.',
      ],
    };
  }

  if (!openai) {
    console.warn('[Moderación] OPENAI_API_KEY no configurada — se omite filtro IA.');
    return { semaforo: 'verde', categorias: [], razon: 'Moderación desactivada (sin API key).' };
  }

  const promptModeracion = `Eres un moderador de contenido publicitario para BYNILO ADS TV, plataforma de publicidad en vivo chilena.

Analiza el FORMULARIO COMPLETO del cliente: nombre del negocio, texto de la oferta, número de contacto, redes sociales, sitio web (si los ingresó), imagen del anuncio y datos de facturación (si aplica).

METODOLOGÍA (OBLIGATORIA):
1. Identifica primero el rubro o giro comercial real del anunciante usando TODOS los datos disponibles.
2. Si el cliente ingresó sitio web o redes sociales, úsalos como contexto para verificar si el negocio es legítimo y coherente con el texto de la oferta.
3. NO rechaces por palabras sueltas o similitudes. Evalúa el sentido comercial completo del aviso.
4. Asigna semáforo rojo o amarillo solo ante infracciones CLARAS. Si el contexto explica un uso legítimo, usa semáforo verde.

FALSOS POSITIVOS FRECUENTES (deben ser VERDE si el contexto lo confirma):
- Empresas de gas licuado doméstico (Abastible, Lipigas, Gasco, etc.) con ofertas de cilindros, recarga o descuentos en gas — NO es categoría alcohol.
- Ferreterías, panaderías, farmacias, veterinarias, servicios técnicos, comercio local legítimo.
- La palabra "gas" en contexto de cilindro doméstico o cocina NO equivale a alcohol ni licores.

BARES, PUBS Y NIGHTCLUBS (regla especial):
- SÍ pueden publicitar mientras NO mencionen de forma directa el consumo o promoción de alcohol.
- VERDE — ambiente, música, eventos, ubicación, experiencia nocturna sin ofertas de bebidas alcohólicas.
  Ejemplo aprobado: "Visita Santiago Bar, donde tendrás una noche increíble junto al reguetón del momento".
- ROJO — mención directa de alcohol, promociones de tragos, happy hour, 2x1, descuentos en cervezas/vinos/licores/cócteles o consumo de alcohol.
  Ejemplo rechazado: "Visita Santiago Bar. Noches con 2x1 en cervezas y happy hour".
- El nombre "Bar" en el negocio por sí solo NO es motivo de rechazo; evalúa el texto de la oferta.

EVASIÓN Y OFUSCACIÓN (rechazar con ROJO si es claro; AMARILLO si hay dudas):
- Intentos de eludir la moderación usando símbolos en lugar de letras (@ por a, $ por s, | por i/l, etc.).
- Mezcla de números y símbolos para escribir palabras prohibidas (ej: c3rv3z4, @lc0h0l).
- Palabras pegadas, sin espacios o en hashtags diseñadas para ocultar insultos, vulgaridades o contenido sexual.

HASHTAGS Y TEXTO PEGADO — ANÁLISIS LETRA POR LETRA (OBLIGATORIO):
- Cuando encuentres el símbolo #, lee LETRA POR LETRA todo el texto que sigue (aunque esté pegado sin espacios).
- Identifica palabras completas ocultas dentro de la cadena, probando distintas segmentaciones.
- Ejemplo: #chupalokaroldance → leer letra a letra → detectar "chupalo" embebido → vulgar → ROJO. Indica "chupalo" en palabrasInfractoras.
- Ejemplo: #PanaderiaElSol → segmentar en palabras legítimas → VERDE si no hay infracciones.
- Ejemplo: #Oferta20Off → segmentar "Oferta", "20", "Off" → VERDE.
- Este análisis letra a letra es CRÍTICO porque la gente escribe hashtags todo de corrido para confundir.

LENGUAJE INAPROPIADO PARA TELEVISIÓN:
- Vulgaridades, insultos, palabras altisonantes o slang obsceno en español chileno/latino.
- Si es CLARO → ROJO. Si hay DUDAS tras analizar letra a letra → AMARILLO.

DECISIÓN DE SEMÁFORO:
- ROJO: infracción clara e inequívoca.
- AMARILLO: dudas razonables, contexto ambiguo, medios de comunicación, o posible infracción que requiere revisión humana.
- VERDE: contenido claramente apto tras el análisis completo (incluido hashtags letra a letra).

CUANDO DETECTES INFRACCIÓN O DUDAS, SIEMPRE INCLUYE:
- palabrasInfractoras: palabra(s) o segmento(s) EXACTOS que infringen o generan duda (ej: ["chupalo"]).
- textoSugerido: versión corregida del texto de la oferta sin las palabras problemáticas (máx. 150 caracteres).
- sugerencias: lista breve indicando qué palabra cambiar y por qué.

SEMÁFORO ROJO (rechazar inmediatamente):
- política (candidatos, partidos, campañas electorales, referéndums)
- alcohol (promoción DIRECTA de bebidas alcohólicas: licores, cervezas, vinos, cócteles, happy hour, 2x1 en tragos, descuentos en alcohol, consumo de alcohol)
- religión (proselitismo, iglesias, cultos, símbolos religiosos prominentes)
- contenido sexual (desnudez, insinuaciones sexuales, servicios para adultos)
- casinos (apuestas, juegos de azar, casinos, tragamonedas)
- funas (denuncias públicas, exposición de personas, linchamiento mediático)
- discriminación (racismo, xenofobia, homofobia, sexismo, discapacidad)

SEMÁFORO AMARILLO (revisión editorial manual — OBLIGATORIO):
- medios de comunicación (periódicos, radios, portales de noticias, programas de TV, agencias informativas)
- Si el nombre del negocio, razón social, giro, sitio web o texto contiene: noticias, noticiero, radio, canal, TV, diario, prensa, portal informativo, redacción, o nombres de medios chilenos conocidos → AMARILLO siempre
- Ejemplos que van a AMARILLO: "Girovisual Noticias", "Radio XYZ", "Portal Noticias del Sur", "Canal Informativo"
- Casos ambiguos o con dudas razonables tras el análisis letra a letra de hashtags
- Posible infracción que no es 100% clara — enviar a revisión humana

SEMÁFORO VERDE:
- Contenido comercial legítimo coherente con el negocio, sin infracciones claras ni dudas.
- Hashtags analizados letra a letra sin palabras vulgares o prohibidas detectadas.

Responde ÚNICAMENTE con un JSON válido con esta estructura:
{
  "semaforo": "rojo" | "amarillo" | "verde",
  "categorias": ["lista de categorías detectadas"],
  "razon": "breve explicación en español mencionando el contexto evaluado",
  "palabrasInfractoras": ["palabra o segmento exacto que infringe o genera duda"],
  "textoSugerido": "texto de oferta corregido sin palabras problemáticas, máx. 150 caracteres",
  "sugerencias": ["indicaciones concretas de qué cambiar y por qué"]
}

Si semáforo es verde: palabrasInfractoras [], sugerencias [], textoSugerido puede repetir el texto original.
Si hay infracción o dudas: palabrasInfractoras y sugerencias son OBLIGATORIAS.`;

  const textoCompleto = construirTextoModeracion(datosAnuncio);

  const mensajes = [
    {
      role: 'user',
      content: [
        { type: 'text', text: `${promptModeracion}\n\nDATOS INGRESADOS POR EL CLIENTE:\n${textoCompleto}` },
      ],
    },
  ];

  if (imagenBuffer && mimeType) {
    const base64 = imagenBuffer.toString('base64');
    mensajes[0].content.push({
      type: 'image_url',
      image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'low' },
    });
  }

  try {
    const respuesta = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: mensajes,
      max_tokens: 550,
      response_format: { type: 'json_object' },
    });

    const contenido = respuesta.choices[0]?.message?.content || '{}';
    const resultado = JSON.parse(contenido);

    const semaforoValido = ['rojo', 'amarillo', 'verde'].includes(resultado.semaforo)
      ? resultado.semaforo
      : 'verde';

    let textoSugerido =
      typeof resultado.textoSugerido === 'string' ? resultado.textoSugerido.trim() : '';
    if (textoSugerido.length > 150) textoSugerido = textoSugerido.slice(0, 150);
    if (textoSugerido) textoSugerido = sanitizarTextoOferta(textoSugerido);

    return {
      semaforo: semaforoValido,
      categorias: Array.isArray(resultado.categorias) ? resultado.categorias : [],
      razon: resultado.razon || '',
      palabrasInfractoras: Array.isArray(resultado.palabrasInfractoras)
        ? resultado.palabrasInfractoras
        : [],
      textoSugerido,
      sugerencias: Array.isArray(resultado.sugerencias) ? resultado.sugerencias : [],
    };
  } catch (error) {
    console.error('[Moderación] Error OpenAI:', error.message);
    return {
      semaforo: 'amarillo',
      categorias: ['error de moderación'],
      razon: 'No se pudo verificar el contenido. Quedará en revisión manual.',
    };
  }
}

async function revisarOrtografia(textoOferta) {
  const texto = textoOferta?.trim() || '';

  if (!texto) {
    return { tieneErrores: false, ortografiaActiva: !!openai, textoOriginal: texto, textoSugerido: texto, observaciones: [], resumen: '' };
  }

  if (!openai) {
    return { tieneErrores: false, ortografiaActiva: false, textoOriginal: texto, textoSugerido: texto, observaciones: [], resumen: '' };
  }

  const promptOrtografia = `Eres corrector ortográfico para anuncios publicitarios en español chileno.

Revisa el TEXTO DE PROMOCIÓN. Detecta errores de ortografía, acentuación, gramática leve y puntuación.
No cambies el sentido comercial ni agregues información nueva.
El texto corregido debe tener como máximo 150 caracteres.

Responde ÚNICAMENTE con un JSON válido:
{
  "tieneErrores": true | false,
  "textoSugerido": "texto corregido",
  "observaciones": ["breve descripción de cada corrección"],
  "resumen": "mensaje amigable al cliente explicando qué revisar"
}

Si el texto está bien escrito, usa tieneErrores false, textoSugerido igual al original y observaciones [].`;

  try {
    const respuesta = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `${promptOrtografia}\n\nTEXTO DE PROMOCIÓN:\n"${texto}"`,
        },
      ],
      max_tokens: 350,
      response_format: { type: 'json_object' },
    });

    const contenido = respuesta.choices[0]?.message?.content || '{}';
    const resultado = JSON.parse(contenido);
    let textoSugerido = typeof resultado.textoSugerido === 'string' ? resultado.textoSugerido.trim() : texto;

    if (textoSugerido.length > 150) {
      textoSugerido = textoSugerido.slice(0, 150);
    }

    textoSugerido = sanitizarTextoOferta(textoSugerido);

    const observaciones = Array.isArray(resultado.observaciones) ? resultado.observaciones : [];
    const textoCambio = textoSugerido !== texto;
    const tieneErrores =
      resultado.tieneErrores === true ||
      (textoCambio && observaciones.length > 0);

    return {
      tieneErrores,
      ortografiaActiva: true,
      textoOriginal: texto,
      textoSugerido,
      observaciones,
      resumen: resultado.resumen || 'Se detectaron posibles errores ortográficos en tu texto de promoción.',
    };
  } catch (error) {
    console.error('[Ortografía] Error OpenAI:', error.message);
    return { tieneErrores: false, ortografiaActiva: true, errorRevision: true, textoOriginal: texto, textoSugerido: texto, observaciones: [], resumen: '' };
  }
}

// ─── Just Broadcast: escritura y limpieza de archivos ───────────────────────────

function escribirArchivosJustBroadcast(negocio, textoOferta, imagenBuffer, redesSociales, contacto) {
  fs.writeFileSync(path.join(JUST_BROADCAST_FOLDER, 'negocio.txt'), negocio, 'utf8');
  fs.writeFileSync(path.join(JUST_BROADCAST_FOLDER, 'oferta.txt'), textoOferta, 'utf8');

  if (redesSociales?.trim()) {
    fs.writeFileSync(path.join(JUST_BROADCAST_FOLDER, 'redes.txt'), redesSociales.trim(), 'utf8');
  }

  if (contacto?.trim()) {
    fs.writeFileSync(path.join(JUST_BROADCAST_FOLDER, 'contacto.txt'), contacto.trim(), 'utf8');
  }

  if (imagenBuffer) {
    fs.writeFileSync(path.join(JUST_BROADCAST_FOLDER, 'imagen.jpg'), imagenBuffer);
  }
}

function limpiarArchivosJustBroadcast() {
  const archivos = ['negocio.txt', 'oferta.txt', 'imagen.jpg', 'redes.txt', 'contacto.txt'];
  for (const archivo of archivos) {
    const ruta = path.join(JUST_BROADCAST_FOLDER, archivo);
    if (fs.existsSync(ruta)) {
      fs.unlinkSync(ruta);
    }
  }
}

function validarFacturacion(body) {
  const solicitar = body.solicitarFactura === 'true' || body.solicitarFactura === true;
  if (!solicitar) return null;

  const { rutFactura, razonSocial, giro, direccion, comuna, emailFactura } = body;

  if (!validarRUT(rutFactura)) {
    return 'El RUT de facturación no es válido.';
  }
  if (!razonSocial?.trim()) {
    return 'La razón social es obligatoria para facturación.';
  }
  if (!giro?.trim()) {
    return 'El giro comercial es obligatorio para facturación.';
  }
  if (!direccion?.trim()) {
    return 'La dirección es obligatoria para facturación.';
  }
  if (!comuna?.trim()) {
    return 'La comuna es obligatoria para facturación.';
  }
  if (!emailFactura?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailFactura)) {
    return 'Ingresa un email válido para envío de factura.';
  }

  return null;
}

function validarTextosPublicitarios(negocio, textoOferta) {
  if (contieneSimbolosProhibidos(negocio)) {
    return MENSAJE_SIMBOLOS_PROHIBIDOS;
  }
  if (contieneSimbolosProhibidosOferta(textoOferta)) {
    return MENSAJE_SIMBOLOS_PROHIBIDOS_OFERTA;
  }
  return null;
}

function validarSimbolosCamposFacturacion(body) {
  const campos = ['razonSocial', 'giro', 'direccion', 'comuna'];
  for (const campo of campos) {
    if (contieneSimbolosProhibidos(body[campo])) {
      return MENSAJE_SIMBOLOS_PROHIBIDOS;
    }
  }
  return null;
}

function guardarDatosFacturacion(datos) {
  const carpetaFacturas = EMISION_TV_ACTIVA
    ? path.join(JUST_BROADCAST_FOLDER, 'facturas')
    : path.join(DATA_DIR, 'facturas');
  if (!fs.existsSync(carpetaFacturas)) {
    fs.mkdirSync(carpetaFacturas, { recursive: true });
  }

  const {
    bloques,
    rut,
    negocio,
    rutFactura,
    razonSocial,
    giro,
    direccion,
    comuna,
    emailFactura,
  } = datos;

  const timestamp = Date.now();
  const nombreArchivo = `factura_${timestamp}.txt`;
  const lineasBloques = bloques.map(
    (b, i) => `  ${i + 1}. ${b.fechaPublicacion} ${b.horarioElegido}`,
  );

  const contenido = [
    '=== SOLICITUD DE FACTURA — BYNILO ADS TV ===',
    `Anunciante RUT: ${rut}`,
    `Negocio: ${negocio}`,
    `Bloques reservados (${bloques.length}):`,
    ...lineasBloques,
    '',
    '--- Datos de facturación ---',
    `RUT: ${rutFactura}`,
    `Razón social: ${razonSocial}`,
    `Giro: ${giro}`,
    `Dirección: ${direccion}`,
    `Comuna: ${comuna}`,
    `Email: ${emailFactura}`,
    `Registrado: ${new Date().toISOString()}`,
  ].join('\n');

  fs.writeFileSync(path.join(carpetaFacturas, nombreArchivo), contenido, 'utf8');
  console.log(`[Facturación] Datos guardados: ${nombreArchivo}`);
}

function parseBloques(body) {
  if (body.bloques) {
    try {
      const bloques = typeof body.bloques === 'string' ? JSON.parse(body.bloques) : body.bloques;
      if (!Array.isArray(bloques)) return null;
      return bloques.map((b) => ({
        fechaPublicacion: b.fechaPublicacion || b.fecha,
        horarioElegido: b.horarioElegido || b.horario,
      }));
    } catch {
      return null;
    }
  }

  if (body.fechaPublicacion && body.horarioElegido) {
    return [{ fechaPublicacion: body.fechaPublicacion, horarioElegido: body.horarioElegido }];
  }

  return null;
}

function confirmarReservaAnuncio({
  bloques,
  datosComunes,
  solicitarFactura,
  facturacion,
  rut,
  negocio,
  opcionesValidacion = {},
}) {
  const errorBloques = validarBloques(bloques, opcionesValidacion);
  if (errorBloques) {
    throw new Error(errorBloques);
  }

  if (solicitarFactura) {
    guardarDatosFacturacion({
      bloques,
      rut,
      negocio,
      ...facturacion,
    });
  }

  programarMultiplesEmisiones(bloques, datosComunes);
  return calcularTotalReserva(bloques);
}

async function confirmarReservaDesdeOrden(ordenId, paymentId = null) {
  const orden = cargarOrdenPendiente(DATA_DIR, ordenId);
  if (!orden) {
    throw new Error('Orden no encontrada.');
  }

  if (orden.estado === 'pagado') {
    return { orden, tarifas: orden.tarifas, yaConfirmada: true };
  }

  const datosComunes = {
    rut: orden.rut,
    negocio: orden.negocio,
    textoOferta: orden.textoOferta,
    imagenBuffer: orden.imagenBase64 ? Buffer.from(orden.imagenBase64, 'base64') : null,
    imagenMimeType: orden.imagenMimeType || null,
    redesSociales: orden.redesSociales || '',
    contacto: orden.contacto || '',
  };

  const tarifas = confirmarReservaAnuncio({
    bloques: orden.bloques,
    datosComunes,
    solicitarFactura: orden.solicitarFactura,
    facturacion: orden.facturacion,
    rut: orden.rut,
    negocio: orden.negocio,
    opcionesValidacion: { permitirYaReservado: true },
  });

  const ordenActualizada = actualizarOrdenPendiente(DATA_DIR, ordenId, {
    estado: 'pagado',
    paymentId,
    pagadoEn: new Date().toISOString(),
    tarifas,
  });

  console.log(`[Pago] Reserva confirmada tras pago: ${ordenId}`);
  return { orden: ordenActualizada, tarifas, yaConfirmada: false };
}

async function procesarNotificacionPago(topic, resourceId) {
  if (!mercadoPagoActivo()) return null;
  if (topic !== 'payment' || !resourceId) return null;

  const pago = await consultarPago(resourceId);
  const ordenId = pago.external_reference;
  const montoPagado = Math.round(Number(pago.transaction_amount || 0));

  if (pago.status !== 'approved') {
    console.log(`[Pago] Notificación ${resourceId} estado: ${pago.status}`);
    return null;
  }

  const orden = cargarOrdenPendiente(DATA_DIR, ordenId);
  if (!orden) {
    console.warn(`[Pago] Orden no encontrada para referencia ${ordenId}`);
    return null;
  }

  if (Math.round(Number(orden.tarifas?.total || 0)) !== montoPagado) {
    console.warn(
      `[Pago] Monto distinto en orden ${ordenId}: esperado ${orden.tarifas?.total}, recibido ${montoPagado}`,
    );
  }

  return confirmarReservaDesdeOrden(ordenId, String(resourceId));
}

function validarBloques(bloques, opciones = {}) {
  if (!bloques || bloques.length === 0) {
    return 'Debes seleccionar al menos un bloque de emisión.';
  }

  if (bloques.length > MAX_BLOQUES_POR_SESION) {
    return `Máximo ${MAX_BLOQUES_POR_SESION} bloques por sesión.`;
  }

  const claves = new Set();
  for (const bloque of bloques) {
    if (!bloque.fechaPublicacion || !bloque.horarioElegido) {
      return 'Cada bloque debe incluir fecha y horario.';
    }

    const errorHorario = validarHorarioElegido(
      bloque.fechaPublicacion,
      bloque.horarioElegido,
      opciones,
    );
    if (errorHorario) return errorHorario;

    const clave = claveReserva(bloque.fechaPublicacion, bloque.horarioElegido);
    if (claves.has(clave)) {
      return 'Hay bloques duplicados en tu selección.';
    }
    claves.add(clave);
  }

  return null;
}

function reservarHorario(fechaPublicacion, horario) {
  horariosReservados.add(claveReserva(fechaPublicacion, horario));
}

function liberarHorario(fechaPublicacion, horario) {
  horariosReservados.delete(claveReserva(fechaPublicacion, horario));
}

function liberarBloques(bloques) {
  for (const bloque of bloques) {
    liberarHorario(bloque.fechaPublicacion, bloque.horarioElegido);
  }
}

function estaReservado(fechaPublicacion, horario) {
  return horariosReservados.has(claveReserva(fechaPublicacion, horario));
}

function obtenerHorariosDisponibles(fechaConsulta) {
  const ahora = new Date();
  const dias = generarDiasDisponibles();
  const fechaPublicacion =
    fechaConsulta && parseFecha(fechaConsulta)
      ? fechaConsulta
      : formatearFechaLocal(ahora);

  const espaciosDelDia = generarEspaciosDelDia();
  const disponibles = filtrarEspaciosFuturos(
    espaciosDelDia.filter((h) => !estaReservado(fechaPublicacion, h)),
    fechaPublicacion,
    ahora,
  );

  const horas = generarCatalogoHoras().map((hora) => ({
    ...hora,
    espacios: hora.espacios.map((valor) => {
      const tarifa = obtenerTarifaEspacio(valor);
      return {
        valor,
        etiqueta: valor,
        disponible:
          esEspacioFuturo(fechaPublicacion, valor, ahora) &&
          !estaReservado(fechaPublicacion, valor),
        reservado: estaReservado(fechaPublicacion, valor),
        bloqueTarifario: tarifa.bloqueNombre,
        bloqueTarifarioId: tarifa.bloqueId,
        precio: tarifa.precio,
        precioFormateado: tarifa.precioFormateado,
      };
    }),
  }));

  return {
    fechaConsulta: fechaPublicacion,
    intervaloSegundos: INTERVALO_SEG,
    duracionEmisionSegundos: DURACION_BANNER_MS / 1000,
    pausaSegundos: PAUSA_ENTRE_EMISIONES_MS / 1000,
    espaciosPorHora: horas[0]?.totalEspacios || 0,
    ventanasMinutos: VENTANAS_MINUTOS,
    horaInicio: HORA_INICIO,
    horaFin: HORA_FIN,
    totalDisponibles: disponibles.length,
    dias,
    horas,
    bloquesTarifarios: obtenerResumenTarifas(),
  };
}

function validarHorarioElegido(fechaPublicacion, horarioElegido, opciones = {}) {
  if (!parseFecha(fechaPublicacion)) {
    return 'Debes seleccionar un día de publicación válido.';
  }

  if (!esHorarioEnGrilla(horarioElegido)) {
    return 'El horario debe ser un espacio válido de 15 segundos (grilla cada 45 seg, ej. 18:00:15).';
  }

  if (!opciones.permitirYaReservado && estaReservado(fechaPublicacion, horarioElegido)) {
    return 'Ese espacio ya está reservado. Elige otro horario.';
  }

  if (!esEspacioFuturo(fechaPublicacion, horarioElegido)) {
    return 'El horario seleccionado ya pasó o está fuera del rango de emisión (07:00–00:00, minutos 5–25 y 35–50).';
  }

  return null;
}

function puedeEmitirAhora() {
  if (emisionEnCurso) return false;
  const ahora = Date.now();
  return ahora - ultimaEmisionFin >= INTERVALO_TOTAL_MS;
}

function msHastaProximaEmision() {
  if (emisionEnCurso) return INTERVALO_TOTAL_MS;
  const transcurrido = Date.now() - ultimaEmisionFin;
  return Math.max(0, INTERVALO_TOTAL_MS - transcurrido);
}

function ejecutarEmision({ negocio, textoOferta, imagenBuffer, redesSociales, contacto, horarioElegido }) {
  emisionEnCurso = true;

  escribirArchivosJustBroadcast(negocio, textoOferta, imagenBuffer, redesSociales, contacto);
  console.log(`[Emisión] Banner activado — horario: ${horarioElegido}`);

  setTimeout(() => {
    limpiarArchivosJustBroadcast();
    console.log('[Emisión] Banner desactivado (15s). Iniciando pausa de 30s.');

    setTimeout(() => {
      emisionEnCurso = false;
      ultimaEmisionFin = Date.now();
      console.log('[Emisión] Pausa completada. Listo para nueva emisión.');

      if (colaEmisiones.length > 0) {
        const siguiente = colaEmisiones.shift();
        ejecutarEmision(siguiente);
      }
    }, PAUSA_ENTRE_EMISIONES_MS);
  }, DURACION_BANNER_MS);
}

function programarEmisionInterna({ negocio, textoOferta, imagenBuffer, redesSociales, contacto, fechaPublicacion, horarioElegido }) {
  reservarHorario(fechaPublicacion, horarioElegido);

  const encolarOEmitir = () => {
    const payload = { negocio, textoOferta, imagenBuffer, redesSociales, contacto, horarioElegido, fechaPublicacion };
    if (puedeEmitirAhora()) {
      ejecutarEmision(payload);
    } else {
      colaEmisiones.push(payload);
    }
  };

  const objetivo = crearFechaEmision(fechaPublicacion, horarioElegido);
  if (!objetivo) return false;

  const ahora = new Date();
  const delayMs = Math.max(0, objetivo.getTime() - ahora.getTime());
  console.log(
    `[Programación] Emisión agendada para ${fechaPublicacion} ${horarioElegido} (en ${Math.round(delayMs / 1000)}s)`,
  );

  setTimeout(encolarOEmitir, delayMs);
  return true;
}

function programarMultiplesEmisiones(bloques, datosComunes) {
  for (const bloque of bloques) {
    reservarHorario(bloque.fechaPublicacion, bloque.horarioElegido);

    if (EMISION_TV_ACTIVA) {
      programarEmisionInterna({ ...datosComunes, ...bloque });
    } else {
      guardarReservaPendiente(DATA_DIR, {
        ...datosComunes,
        ...bloque,
        imagenMimeType: datosComunes.imagenMimeType,
      });
    }
  }
}

function cargarReservasPersistidas() {
  if (!EMISION_TV_ACTIVA) {
    const reservas = listarReservasPendientes(DATA_DIR);
    for (const reserva of reservas) {
      if (reserva.fechaPublicacion && reserva.horarioElegido) {
        reservarHorario(reserva.fechaPublicacion, reserva.horarioElegido);
      }
    }
    if (reservas.length > 0) {
      console.log(`[Reserva] ${reservas.length} reserva(s) pendiente(s) de emisión TV cargadas.`);
    }
  }
}

cargarReservasPersistidas();

// ─── Endpoints ────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  const horarios = obtenerHorariosDisponibles();
  res.json({
    status: 'ok',
    justBroadcastFolder: JUST_BROADCAST_FOLDER,
    intervaloSegundos: INTERVALO_TOTAL_MS / 1000,
    duracionEmisionSegundos: DURACION_BANNER_MS / 1000,
    espaciosDisponibles: horarios.totalDisponibles,
    maxBloquesPorSesion: MAX_BLOQUES_POR_SESION,
    puedeEmitir: puedeEmitirAhora(),
    segundosRestantes: Math.ceil(msHastaProximaEmision() / 1000),
    moderacionActiva: !!openai,
    emisionTvActiva: EMISION_TV_ACTIVA,
    modo: EMISION_TV_ACTIVA ? 'transmision' : 'solo-reservas',
    reservasPendientes: EMISION_TV_ACTIVA ? 0 : listarReservasPendientes(DATA_DIR).length,
    bloquesTarifarios: obtenerResumenTarifas(),
    mercadoPagoActivo: mercadoPagoActivo(),
    mercadoPago: {
      ...estadoMercadoPago(),
      baseUrlPublica: obtenerBaseUrlPublica(),
    },
  });
});

app.get('/api/horarios', (req, res) => {
  res.json(obtenerHorariosDisponibles(req.query.fecha));
});

app.post('/api/revisar-ortografia', async (req, res) => {
  try {
    const textoOferta = req.body.textoOferta?.trim() || '';

    if (!textoOferta) {
      return res.status(400).json({ error: 'El texto de promoción es obligatorio.' });
    }

    if (textoOferta.length > 150) {
      return res.status(400).json({ error: 'El texto supera los 150 caracteres permitidos.' });
    }

    const errorSimbolos = validarTextosPublicitarios('', textoOferta);
    if (errorSimbolos) {
      return res.status(400).json({ error: errorSimbolos });
    }

    const resultado = await revisarOrtografia(textoOferta);
    return res.status(200).json(resultado);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/moderar', upload.single('imagen'), async (req, res) => {
  try {
    const datos = extraerDatosModeracion(req.body);
    if (!datos.negocio || !datos.textoOferta) {
      return res.status(400).json({ error: 'El negocio y el texto de la oferta son obligatorios.' });
    }

    if (datos.contacto && !/^\d+$/.test(datos.contacto)) {
      return res.status(400).json({ error: 'El número de contacto solo puede contener dígitos.' });
    }

    const errorSimbolos = validarTextosPublicitarios(datos.negocio, datos.textoOferta);
    if (errorSimbolos) {
      return res.status(400).json({ error: errorSimbolos });
    }

    const resultado = await moderarContenido(
      datos,
      req.file?.buffer,
      req.file?.mimetype,
    );
    return res.status(200).json(resultado);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/agendar', upload.single('imagen'), async (req, res) => {
  try {
    const { rut, negocio, textoOferta } = req.body;
    const bloques = parseBloques(req.body);

    if (!validarRUT(rut)) {
      return res.status(400).json({ error: 'El RUT ingresado no es válido.', semaforo: 'rojo' });
    }

    if (!negocio || !textoOferta) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.', semaforo: 'rojo' });
    }

    const aceptaCondiciones =
      req.body.aceptaCondiciones === 'true' || req.body.aceptaCondiciones === true;
    if (!aceptaCondiciones) {
      return res.status(400).json({
        error: 'Debes aceptar las condiciones de uso para agendar un anuncio.',
        semaforo: 'rojo',
      });
    }

    if (textoOferta.length > 150) {
      return res.status(400).json({
        error: 'El texto supera los 150 caracteres permitidos.',
        semaforo: 'rojo',
      });
    }

    const errorSimbolos = validarTextosPublicitarios(negocio, textoOferta);
    if (errorSimbolos) {
      return res.status(400).json({ error: errorSimbolos, semaforo: 'rojo' });
    }

    const errorBloques = validarBloques(bloques);
    if (errorBloques) {
      return res.status(400).json({ error: errorBloques, semaforo: 'rojo' });
    }

    const errorFactura = validarFacturacion(req.body);
    if (errorFactura) {
      return res.status(400).json({ error: errorFactura, semaforo: 'rojo' });
    }

    const errorSimbolosFactura = validarSimbolosCamposFacturacion(req.body);
    if (errorSimbolosFactura) {
      return res.status(400).json({ error: errorSimbolosFactura, semaforo: 'rojo' });
    }

    const solicitarFactura = req.body.solicitarFactura === 'true' || req.body.solicitarFactura === true;

    const contacto = req.body.contacto?.trim() || '';
    if (contacto && !/^\d+$/.test(contacto)) {
      return res.status(400).json({
        error: 'El número de contacto solo puede contener dígitos.',
        semaforo: 'rojo',
      });
    }

    const datosModeracion = extraerDatosModeracion(req.body);

    const moderacion = await moderarContenido(
      datosModeracion,
      req.file?.buffer,
      req.file?.mimetype,
    );

    if (moderacion.semaforo === 'rojo') {
      return res.status(403).json({
        estado: 'rechazado',
        semaforo: 'rojo',
        categorias: moderacion.categorias,
        mensaje: `Anuncio rechazado: ${moderacion.razon}`,
        razon: moderacion.razon,
        palabrasInfractoras: moderacion.palabrasInfractoras,
        textoSugerido: moderacion.textoSugerido,
        sugerencias: moderacion.sugerencias,
        categoriasProhibidas: CATEGORIAS_ROJO,
      });
    }

    if (moderacion.semaforo === 'amarillo') {
      return res.status(200).json({
        estado: 'revision',
        semaforo: 'amarillo',
        categorias: moderacion.categorias,
        mensaje: moderacion.razon || 'Tu anuncio requiere revisión editorial antes de emitirse.',
        razon: moderacion.razon,
        palabrasInfractoras: moderacion.palabrasInfractoras,
        textoSugerido: moderacion.textoSugerido,
        sugerencias: moderacion.sugerencias,
        categoriasRevision: CATEGORIAS_AMARILLO,
      });
    }

    const datosComunes = {
      rut,
      negocio,
      textoOferta,
      imagenBuffer: req.file?.buffer || null,
      imagenMimeType: req.file?.mimetype || null,
      redesSociales: normalizarRedes(req.body.redesSociales),
      contacto,
    };

    const tarifas = calcularTotalReserva(bloques);
    const facturacion = solicitarFactura
      ? {
          rutFactura: req.body.rutFactura,
          razonSocial: req.body.razonSocial,
          giro: req.body.giro,
          direccion: req.body.direccion,
          comuna: req.body.comuna,
          emailFactura: req.body.emailFactura,
        }
      : null;

    if (mercadoPagoActivo() && tarifas.total > 0) {
      const emailPago = req.body.emailContacto?.trim() || req.body.emailFactura?.trim() || '';
      if (!emailPago || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailPago)) {
        return res.status(400).json({
          error: 'Ingresa un correo electrónico válido para procesar el pago con Mercado Pago.',
          semaforo: 'rojo',
        });
      }

      for (const bloque of bloques) {
        reservarHorario(bloque.fechaPublicacion, bloque.horarioElegido);
      }

      try {
        const orden = guardarOrdenPendiente(DATA_DIR, {
        rut,
        negocio,
        textoOferta,
        contacto,
        redesSociales: normalizarRedes(req.body.redesSociales),
        bloques,
        tarifas,
        solicitarFactura,
        facturacion,
        emailFactura: req.body.emailFactura || '',
        emailPago: req.body.emailContacto?.trim() || req.body.emailFactura?.trim() || '',
        imagenBase64: req.file?.buffer ? req.file.buffer.toString('base64') : null,
        imagenMimeType: req.file?.mimetype || null,
      });

      const pago = await crearPreferenciaPago(orden, req);
      actualizarOrdenPendiente(DATA_DIR, orden.id, {
        preferenceId: pago.preferenceId,
      });

      return res.status(200).json({
        estado: 'pago_pendiente',
        requierePago: true,
        ordenId: orden.id,
        initPoint: pago.initPoint,
        semaforo: 'verde',
        mensaje: 'Tu anuncio fue aprobado. Completa el pago en Mercado Pago para confirmar la reserva.',
        tarifas,
      });
      } catch (errorPago) {
        liberarBloques(bloques);
        console.error('[Pago] Error al crear preferencia:', errorPago.message);
        return res.status(500).json({
          error: 'No se pudo iniciar el pago con Mercado Pago. Intenta nuevamente.',
          detalle: errorPago.message,
          semaforo: 'rojo',
        });
      }
    }

    confirmarReservaAnuncio({
      bloques,
      datosComunes,
      solicitarFactura,
      facturacion,
      rut,
      negocio,
    });

    const cantidad = bloques.length;
    const mensaje = EMISION_TV_ACTIVA
      ? cantidad === 1
        ? `Espacio confirmado con éxito para el ${bloques[0].fechaPublicacion} a las ${bloques[0].horarioElegido} (15 seg en vivo).`
        : `Se confirmaron ${cantidad} espacios publicitarios con éxito.`
      : cantidad === 1
        ? `Reserva confirmada para el ${bloques[0].fechaPublicacion} a las ${bloques[0].horarioElegido}. La emisión en TV se activará cuando el estudio esté conectado.`
        : `Se confirmaron ${cantidad} reservas. La emisión en TV se activará cuando el estudio esté conectado.`;

    return res.status(200).json({
      estado: 'exito',
      mensaje,
      semaforo: 'verde',
      bloquesConfirmados: bloques,
      totalBloques: cantidad,
      tarifas,
    });
  } catch (error) {
    console.error('[Agendar] Error:', error);
    return res.status(500).json({
      error: 'Error interno al procesar la reserva.',
    });
  }
});

async function manejarWebhookMercadoPago(req, res) {
  try {
    const topic = req.query.topic || req.query.type || req.body?.type;
    const resourceId =
      req.query.id ||
      req.query['data.id'] ||
      req.body?.data?.id ||
      req.body?.id;

    if (topic && resourceId) {
      await procesarNotificacionPago(topic, resourceId);
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('[Pago] Error webhook:', error.message);
    return res.status(200).send('OK');
  }
}

app.get('/api/pagos/webhook', manejarWebhookMercadoPago);
app.post('/api/pagos/webhook', manejarWebhookMercadoPago);

app.get('/api/pagos/orden/:id', async (req, res) => {
  try {
    const orden = cargarOrdenPendiente(DATA_DIR, req.params.id);
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada.' });
    }

    return res.json({
      id: orden.id,
      estado: orden.estado,
      tarifas: orden.tarifas,
      pagadoEn: orden.pagadoEn || null,
      bloques: orden.bloques,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/pagos/confirmar-retorno', async (req, res) => {
  try {
    const { ordenId, paymentId } = req.body || {};

    if (!ordenId || !paymentId) {
      return res.status(400).json({ error: 'Faltan ordenId o paymentId.' });
    }

    if (!mercadoPagoActivo()) {
      return res.status(503).json({ error: 'Mercado Pago no está configurado.' });
    }

    const pago = await consultarPago(paymentId);
    const referencia = pago.external_reference || pago.externalReference;

    if (referencia !== ordenId) {
      return res.status(400).json({ error: 'El pago no corresponde a esta orden.' });
    }

    if (pago.status !== 'approved') {
      return res.status(200).json({
        estado: pago.status,
        mensaje: 'El pago aún no está aprobado.',
        ordenId,
      });
    }

    const resultado = await confirmarReservaDesdeOrden(ordenId, String(paymentId));

    return res.status(200).json({
      estado: 'pagado',
      mensaje: 'Pago confirmado y reserva registrada.',
      ordenId,
      tarifas: resultado.tarifas,
      yaConfirmada: resultado.yaConfirmada,
    });
  } catch (error) {
    console.error('[Pago] Error confirmar retorno:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Error de archivo: ${err.message}` });
  }
  return res.status(500).json({ error: err.message || 'Error interno del servidor.' });
});

const distPath = path.join(__dirname, 'SIC', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor de BYNILO ADS TV corriendo en el puerto ${PORT}`);
  console.log(`Modo: ${EMISION_TV_ACTIVA ? 'transmisión TV activa' : 'solo reservas (sin PC de transmisión)'}`);
  if (EMISION_TV_ACTIVA) {
    console.log(`Carpeta Just Broadcast: ${JUST_BROADCAST_FOLDER}`);
  } else {
    console.log(`Reservas pendientes en: ${path.join(DATA_DIR, 'reservas-pendientes')}`);
  }
  console.log(`Moderación IA: ${openai ? 'activa' : 'desactivada (configura OPENAI_API_KEY)'}`);
  const mp = estadoMercadoPago();
  console.log(
    `Mercado Pago: ${mp.activo ? 'activo' : mp.tokenConfigurado ? 'token inválido o incompleto' : 'desactivado (configura MERCADOPAGO_ACCESS_TOKEN)'}`,
  );
});
