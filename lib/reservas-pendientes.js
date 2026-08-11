const fs = require('fs');
const path = require('path');

function obtenerCarpetaReservas(dataDir) {
  const carpeta = path.join(dataDir, 'reservas-pendientes');
  if (!fs.existsSync(carpeta)) {
    fs.mkdirSync(carpeta, { recursive: true });
  }
  return carpeta;
}

function guardarReservaPendiente(dataDir, reserva) {
  const carpeta = obtenerCarpetaReservas(dataDir);
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const archivo = path.join(carpeta, `${id}.json`);

  const payload = {
    id,
    registradoEn: new Date().toISOString(),
    rut: reserva.rut || '',
    negocio: reserva.negocio,
    textoOferta: reserva.textoOferta,
    contacto: reserva.contacto || '',
    redesSociales: reserva.redesSociales || '',
    fechaPublicacion: reserva.fechaPublicacion,
    horarioElegido: reserva.horarioElegido,
    imagenBase64: reserva.imagenBuffer ? reserva.imagenBuffer.toString('base64') : null,
    imagenMimeType: reserva.imagenMimeType || null,
    estado: 'pendiente_emision',
  };

  fs.writeFileSync(archivo, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`[Reserva] Guardada pendiente de emisión TV: ${archivo}`);
  return payload;
}

function listarReservasPendientes(dataDir) {
  const carpeta = obtenerCarpetaReservas(dataDir);
  return fs
    .readdirSync(carpeta)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const contenido = fs.readFileSync(path.join(carpeta, f), 'utf8');
      return JSON.parse(contenido);
    });
}

module.exports = {
  guardarReservaPendiente,
  listarReservasPendientes,
};
