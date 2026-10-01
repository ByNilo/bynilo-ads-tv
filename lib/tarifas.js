/**
 * Bloques tarifarios BYNILO ADS TV — precio por espacio de 15 segundos.
 * Los horarios se evalúan según la hora de inicio del espacio (HH:MM:SS).
 */

const BLOQUES_TARIFARIOS = [
  {
    id: 'matinal',
    nombre: 'Bloque Matinal',
    horaInicio: '06:00',
    horaFin: '13:00',
    precio: 1000,
  },
  {
    id: 'tarde',
    nombre: 'Bloque de la Tarde',
    horaInicio: '13:00',
    horaFin: '18:30',
    precio: 1000,
  },
  {
    id: 'acceso',
    nombre: 'Bloque de Acceso (Vespertino)',
    horaInicio: '18:30',
    horaFin: '21:00',
    precio: 1500,
  },
  {
    id: 'prime',
    nombre: 'Bloque Prime (Estelar)',
    horaInicio: '21:00',
    horaFin: '00:30',
    precio: 2000,
    cruzaMedianoche: true,
  },
  {
    id: 'trasnoche',
    nombre: 'Bloque de Trasnoche',
    horaInicio: '00:30',
    horaFin: '06:00',
    precio: 1000,
  },
];

function parseHoraMinutos(horaStr) {
  const partes = horaStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!partes) return null;
  const h = parseInt(partes[1], 10);
  const m = parseInt(partes[2], 10);
  const s = partes[3] ? parseInt(partes[3], 10) : 0;
  if (h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59) return null;
  return h * 3600 + m * 60 + s;
}

function horarioASegundos(horario) {
  return parseHoraMinutos(horario);
}

function obtenerBloqueTarifarioPorHorario(horario) {
  const segundos = horarioASegundos(horario);
  if (segundos === null) return null;

  // Prime: 21:00–00:30 (incluye madrugada antes de 00:30)
  if (segundos >= 21 * 3600 || segundos < 30 * 60) {
    return BLOQUES_TARIFARIOS.find((b) => b.id === 'prime');
  }
  // Trasnoche: 00:30–06:00
  if (segundos >= 30 * 60 && segundos < 6 * 3600) {
    return BLOQUES_TARIFARIOS.find((b) => b.id === 'trasnoche');
  }
  // Matinal: 06:00–13:00
  if (segundos >= 6 * 3600 && segundos < 13 * 3600) {
    return BLOQUES_TARIFARIOS.find((b) => b.id === 'matinal');
  }
  // Tarde: 13:00–18:30
  if (segundos >= 13 * 3600 && segundos < 18.5 * 3600) {
    return BLOQUES_TARIFARIOS.find((b) => b.id === 'tarde');
  }
  // Acceso: 18:30–21:00
  if (segundos >= 18.5 * 3600 && segundos < 21 * 3600) {
    return BLOQUES_TARIFARIOS.find((b) => b.id === 'acceso');
  }

  return null;
}

function obtenerTarifaEspacio(horario) {
  const bloque = obtenerBloqueTarifarioPorHorario(horario);
  if (!bloque) {
    return {
      bloqueId: null,
      bloqueNombre: 'Sin tarifa',
      precio: 0,
      precioFormateado: '$0',
    };
  }

  return {
    bloqueId: bloque.id,
    bloqueNombre: bloque.nombre,
    precio: bloque.precio,
    precioFormateado: formatearPrecioCLP(bloque.precio),
  };
}

function formatearPrecioCLP(monto) {
  return `$${Number(monto).toLocaleString('es-CL')}`;
}

function calcularTotalReserva(bloques) {
  const detalle = (bloques || []).map((bloque) => {
    const tarifa = obtenerTarifaEspacio(bloque.horarioElegido || bloque.horario);
    return {
      fechaPublicacion: bloque.fechaPublicacion || bloque.fecha,
      horarioElegido: bloque.horarioElegido || bloque.horario,
      ...tarifa,
    };
  });

  const total = detalle.reduce((suma, item) => suma + item.precio, 0);

  return {
    detalle,
    total,
    totalFormateado: formatearPrecioCLP(total),
    cantidad: detalle.length,
  };
}

function obtenerResumenTarifas() {
  return BLOQUES_TARIFARIOS.map((bloque) => ({
    id: bloque.id,
    nombre: bloque.nombre,
    horaInicio: bloque.horaInicio,
    horaFin: bloque.horaFin,
    precio: bloque.precio,
    precioFormateado: formatearPrecioCLP(bloque.precio),
    etiqueta: `${bloque.nombre}: ${bloque.horaInicio} a ${bloque.horaFin} hrs. (${formatearPrecioCLP(bloque.precio)})`,
  }));
}

module.exports = {
  BLOQUES_TARIFARIOS,
  obtenerBloqueTarifarioPorHorario,
  obtenerTarifaEspacio,
  calcularTotalReserva,
  formatearPrecioCLP,
  obtenerResumenTarifas,
};
