// Grilla según master:
// - Horario de emisión: 07:00 a 00:00 hrs
// - Bloques de 15 seg cada 45 seg (15 emisión + 30 pausa)
// - Ventanas por hora: minuto 5–25 y minuto 35–50
// - Primer bloque de cada ventana inicia en XX:05:15 y XX:35:15

const INTERVALO_SEG = 45;
const DURACION_EMISION_SEG = 15;
const OFFSET_INICIO_SEG = 15;
const HORA_INICIO = 7;
const HORA_FIN = 24; // 00:00 hrs (exclusivo → última hora catalogada: 23)

const VENTANAS_MINUTOS = [
  { minInicio: 5, minFin: 25 },
  { minInicio: 35, minFin: 50 },
];

function pad(n) {
  return String(n).padStart(2, '0');
}

function segundosAHoraString(totalSeg) {
  const h = Math.floor(totalSeg / 3600) % 24;
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = totalSeg % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function generarEspaciosPorHora(hora) {
  const espacios = [];

  for (const ventana of VENTANAS_MINUTOS) {
    let totalSeg = hora * 3600 + ventana.minInicio * 60 + OFFSET_INICIO_SEG;
    const limiteSeg = hora * 3600 + (ventana.minFin + 1) * 60;

    while (totalSeg < limiteSeg) {
      const minuto = Math.floor((totalSeg % 3600) / 60);
      if (minuto >= ventana.minInicio && minuto <= ventana.minFin) {
        espacios.push(segundosAHoraString(totalSeg));
      }
      totalSeg += INTERVALO_SEG;
    }
  }

  return espacios;
}

function generarEspaciosDelDia() {
  const espacios = [];
  for (let h = HORA_INICIO; h < HORA_FIN; h++) {
    espacios.push(...generarEspaciosPorHora(h));
  }
  return espacios;
}

function generarCatalogoHoras() {
  const horas = [];
  for (let h = HORA_INICIO; h < HORA_FIN; h++) {
    const espacios = generarEspaciosPorHora(h);
    horas.push({
      hora: pad(h),
      etiqueta: h === 0 ? '0 hrs' : `${h} hrs`,
      totalEspacios: espacios.length,
      espacios,
    });
  }
  return horas;
}

function parseHorario(horario) {
  const partes = horario.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!partes) return null;

  const h = parseInt(partes[1], 10);
  const m = parseInt(partes[2], 10);
  const s = parseInt(partes[3], 10);

  if (h < HORA_INICIO || h >= HORA_FIN) return null;
  if (m < 0 || m > 59 || s < 0 || s > 59) return null;

  return { h, m, s, totalSeg: h * 3600 + m * 60 + s };
}

function esHorarioEnGrilla(horario) {
  const parsed = parseHorario(horario);
  if (!parsed) return false;

  const espaciosValidos = generarEspaciosPorHora(parsed.h);
  return espaciosValidos.includes(horario);
}

function agruparPorHora(espacios) {
  return espacios.reduce((acc, espacio) => {
    const hora = espacio.slice(0, 2);
    if (!acc[hora]) acc[hora] = [];
    acc[hora].push(espacio);
    return acc;
  }, {});
}

function formatearEtiqueta(horario) {
  return horario;
}

function formatearFechaLocal(fecha) {
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
}

function parseFecha(fechaStr) {
  const partes = fechaStr?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!partes) return null;

  const y = parseInt(partes[1], 10);
  const m = parseInt(partes[2], 10);
  const d = parseInt(partes[3], 10);
  const fecha = new Date(y, m - 1, d);

  if (
    fecha.getFullYear() !== y ||
    fecha.getMonth() !== m - 1 ||
    fecha.getDate() !== d
  ) {
    return null;
  }

  return fecha;
}

function crearFechaEmision(fechaStr, horarioStr) {
  const fecha = parseFecha(fechaStr);
  const parsed = parseHorario(horarioStr);
  if (!fecha || !parsed) return null;

  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate(),
    parsed.h,
    parsed.m,
    parsed.s,
    0,
  );
}

function claveReserva(fechaStr, horarioStr) {
  return `${fechaStr}|${horarioStr}`;
}

function generarDiasDisponibles(cantidad = 14, ahora = new Date()) {
  const nombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const dias = [];

  for (let i = 0; i < cantidad; i++) {
    const fecha = new Date(ahora);
    fecha.setHours(0, 0, 0, 0);
    fecha.setDate(fecha.getDate() + i);

    const valor = formatearFechaLocal(fecha);
    dias.push({
      valor,
      etiqueta: `${nombres[fecha.getDay()]} ${fecha.getDate()} ${meses[fecha.getMonth()]}`,
      esHoy: i === 0,
    });
  }

  return dias;
}

function esEspacioFuturo(fechaStr, horarioStr, ahora = new Date()) {
  const fecha = crearFechaEmision(fechaStr, horarioStr);
  return !!fecha && fecha > ahora;
}

function filtrarEspaciosFuturos(espacios, fechaStr, ahora = new Date()) {
  return espacios.filter((espacio) => esEspacioFuturo(fechaStr, espacio, ahora));
}

module.exports = {
  INTERVALO_SEG,
  DURACION_EMISION_SEG,
  OFFSET_INICIO_SEG,
  HORA_INICIO,
  HORA_FIN,
  VENTANAS_MINUTOS,
  generarEspaciosDelDia,
  generarEspaciosPorHora,
  generarCatalogoHoras,
  parseHorario,
  parseFecha,
  crearFechaEmision,
  claveReserva,
  generarDiasDisponibles,
  formatearFechaLocal,
  esHorarioEnGrilla,
  agruparPorHora,
  esEspacioFuturo,
  filtrarEspaciosFuturos,
  formatearEtiqueta,
};
