/**
 * Detección de medios de comunicación (competencia / revisión editorial).
 * Complementa la moderación IA con reglas determinísticas.
 * Agrega nombres en MEDIOS_NACIONALES según necesites.
 */

const MEDIOS_NACIONALES = [
  // Televisión
  'tvn',
  'television nacional',
  'televisión nacional',
  'chilevision',
  'chilevisión',
  'chv',
  'mega',
  'mega tv',
  'canal 13',
  'canal13',
  'c13',
  'la red',
  '24 horas',
  '24horas',
  'cnn chile',
  'canal 9',
  'canal9',
  'via x',
  'viax',
  'meganoticias',
  'meganews',
  'canal n',

  // Radio
  'radio cooperativa',
  'cooperativa',
  'radio biobio',
  'biobio',
  'biobío',
  'bio bio',
  'radio bio bio',
  'adn radio',
  'radio adn',
  'adn',
  'radio duna',
  'duna',
  'radio infinita',
  'infinita',
  'radio pudahuel',
  'pudahuel',
  'radio concierto',
  'concierto',
  'radio horizonte',
  'horizonte',
  'radio corazon',
  'corazón',
  'radio romantica',
  'romántica',
  'radio agricultura',
  'agricultura',
  'radio carolina',
  'carolina',
  'radio zero',
  'zero',
  'radio disney',
  'rock and pop',
  'rock & pop',
  'beethoven',
  'digital fm',
  'imagina',
  'futuro',
  'activa',
  'fama',

  // Prensa escrita y digital
  'el mercurio',
  'mercurio',
  'la tercera',
  'tercera',
  'lun',
  'las ultimas noticias',
  'las últimas noticias',
  'ultimas noticias',
  'últimas noticias',
  'la cuarta',
  'el dinamo',
  'el dínamo',
  'el mostrador',
  'mostrador',
  'emol',
  'e mercurio online',
  'pulso',
  'df',
  'diario financiero',
  'diario estrategia',
  'estrategia',
  'la nacion',
  'la nación',
  'diario aviso',
  'diario el sur',
  'el sur',
  'diario el centro',
  'el centro',
  'diario el dia',
  'el dia',
  'el día',
  'diario el rancagüino',
  'el rancaguino',
  'diario el ovallino',
  'el ovallino',
  'diario el austral',
  'el austral',
  'diario el divisadero',
  'el divisadero',
  'diario el delfino',
  'el delfino',
  'diario el divisadero',
  'biobiochile',
  'bio bio chile',
  'soychile',
  'soy chile',
  'ciper',
  'interferencia',
  'the clinic',
  'theclinic',
  'piensa',
  'piensa chile',
  'ex-ante',
  'exante',

  // Medios regionales Valparaíso — competencia BYNILO ADS TV
  'quilpue tv',
  'quilpué tv',
  'quilpuetv',
  'vtv television',
  'vtv televisión',
  'vtv tv',
  'vtv',
  'g5 tv',
  'g5tv',
  'g5 noticias',
  'g5noticias',
  'ucv tv',
  'ucvtv',
  'ucv television',
  'ucv televisión',
  'girovisual tv',
  'girovisualtv',
  'giro visual',
  'girovisual',
  'tvn red valparaiso',
  'tvn red valparaíso',
  'red valparaiso',
  'red valparaíso',
  'el observador',
  'soyvalparaiso',
  'soy valparaiso',
  'soy valparaíso',
  'diario la quinta de valparaiso',
  'diario la quinta de valparaíso',
  'la quinta de valparaiso',
  'la quinta de valparaíso',
  'tuopinas',
  'tuopinas.cl',
  'tu opinas',
  'diario el epicentro',
  'el epicentro',
  'valparaiso informa',
  'valparaíso informa',
  'alertas marga marga',
  'alerta marga marga',
  'emergencias marga marga',
  'prensa marga marga',
  'comunal de quilpue',
  'comunal de quilpué',
  'comunal de villa alemana',
  'marga marga online',
  'marga marga',
  'el quijote de marga marga',
  'el quijote marga marga',
  'conecta valparaiso',
  'conecta valparaíso',
  'la region hoy',
  'la región hoy',
  'el martutino',
  'martutino',
  'gran valparaiso',
  'gran valparaíso',
  'radio festival',
  'radio biobio valparaiso',
  'radio biobío valparaíso',
  'radio bio bio valparaiso',
  'el marga',
  'alerta noticias',
  'alertas noticias',

  // Agencias y portales
  'agencia de noticias',
  'agencia informativa',
  'portal informativo',
  'portal de noticias',
  'sitio de noticias',
  'medio digital',
  'medio informativo',
  'redaccion',
  'redacción',
  'sala de prensa',
  'prensa chile',
];

/** Palabras clave que indican rubro de medio de comunicación */
const PALABRAS_CLAVE_MEDIOS = [
  'noticias',
  'noticiero',
  'noticias24',
  'informativo',
  'informativos',
  'informador',
  'informadores',
  'diario',
  'periodico',
  'periódico',
  'prensa',
  'matinal',
  'televisivo',
  'televisiva',
  'canal de tv',
  'canal de television',
  'canal de televisión',
  'canal tv',
  'programa de tv',
  'programa de television',
  'programa de televisión',
  'programa radial',
  'programa de radio',
  'locutor',
  'locutora',
  'periodista',
  'periodistas',
  'corresponsal',
  'cronica',
  'crónica',
  'editorial',
  'redaccion',
  'redacción',
  'streaming informativo',
  'portal noticioso',
  'medio de comunicacion',
  'medio de comunicación',
  'medios de comunicacion',
  'medios de comunicación',
  'cadena radial',
  'emisora',
  'emisora radial',
  'radio fm',
  'radio am',
  'radio online',
  'radio en vivo',
  'tv en vivo',
  'tv online',
  'canal informativo',
  'canal noticioso',
  'canal de noticias',
  'revista informativa',
  'revista digital',
  'podcast informativo',
  'podcast de noticias',
];

/** Términos cortos que solo coinciden como palabra completa (evita falsos positivos) */
const PALABRAS_EXACTAS_MEDIOS = ['radio', 'television', 'televisión', 'canal', 'fm', 'am', 'tv'];

function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9@.\s_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactar(texto) {
  return normalizar(texto).replace(/[\s@./_-]+/g, '');
}

function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function contienePalabraExacta(texto, palabra) {
  const re = new RegExp(`(^|[\\s@./_-])${escaparRegex(palabra)}($|[\\s@./_-])`, 'i');
  return re.test(` ${texto} `);
}

function extraerTextoBusqueda(datos) {
  const partes = [
    datos.negocio,
    datos.textoOferta,
    datos.redesSociales,
    datos.contacto,
  ];

  if (datos.facturacion) {
    partes.push(
      datos.facturacion.razonSocial,
      datos.facturacion.giro,
      datos.facturacion.direccion,
    );
  }

  return normalizar(partes.filter(Boolean).join(' '));
}

function detectarMedioComunicacion(datos) {
  const texto = extraerTextoBusqueda(datos);
  const compacto = compactar(texto);
  const coincidencias = [];

  if (!texto) {
    return { detectado: false, coincidencias: [], razon: '' };
  }

  for (const medio of MEDIOS_NACIONALES) {
    const normMedio = normalizar(medio);
    const compactoMedio = compactar(medio);
    if (texto.includes(normMedio) || compacto.includes(compactoMedio)) {
      coincidencias.push(medio);
    }
  }

  for (const palabra of PALABRAS_CLAVE_MEDIOS) {
    const norm = normalizar(palabra);
    const comp = compactar(palabra);
    if (texto.includes(norm) || compacto.includes(comp)) {
      coincidencias.push(palabra);
    }
  }

  for (const palabra of PALABRAS_EXACTAS_MEDIOS) {
    if (contienePalabraExacta(texto, palabra)) {
      coincidencias.push(palabra);
    }
  }

  const unicas = [...new Set(coincidencias)];

  if (unicas.length === 0) {
    return { detectado: false, coincidencias: [], razon: '' };
  }

  const etiquetas = unicas.slice(0, 4).join(', ');
  const razon =
    unicas.length === 1
      ? `El anuncio coincide con un medio de comunicación o portal informativo (${etiquetas}). Requiere revisión editorial antes de emitirse en BYNILO ADS TV.`
      : `El anuncio coincide con medios de comunicación o términos del rubro informativo (${etiquetas}). Requiere revisión editorial antes de emitirse en BYNILO ADS TV.`;

  return {
    detectado: true,
    coincidencias: unicas,
    razon,
  };
}

module.exports = {
  MEDIOS_NACIONALES,
  PALABRAS_CLAVE_MEDIOS,
  detectarMedioComunicacion,
  normalizarMedio: normalizar,
};
