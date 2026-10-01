const fs = require('fs');
const path = require('path');

function obtenerCarpetaOrdenes(dataDir) {
  const carpeta = path.join(dataDir, 'ordenes-pendientes');
  if (!fs.existsSync(carpeta)) {
    fs.mkdirSync(carpeta, { recursive: true });
  }
  return carpeta;
}

function guardarOrdenPendiente(dataDir, orden) {
  const carpeta = obtenerCarpetaOrdenes(dataDir);
  const id = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const archivo = path.join(carpeta, `${id}.json`);

  const payload = {
    id,
    estado: 'pendiente_pago',
    creadoEn: new Date().toISOString(),
    ...orden,
  };

  fs.writeFileSync(archivo, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`[Pago] Orden pendiente creada: ${archivo}`);
  return payload;
}

function cargarOrdenPendiente(dataDir, id) {
  const archivo = path.join(obtenerCarpetaOrdenes(dataDir), `${id}.json`);
  if (!fs.existsSync(archivo)) return null;
  return JSON.parse(fs.readFileSync(archivo, 'utf8'));
}

function actualizarOrdenPendiente(dataDir, id, cambios) {
  const orden = cargarOrdenPendiente(dataDir, id);
  if (!orden) return null;

  const actualizada = { ...orden, ...cambios, actualizadoEn: new Date().toISOString() };
  const archivo = path.join(obtenerCarpetaOrdenes(dataDir), `${id}.json`);
  fs.writeFileSync(archivo, JSON.stringify(actualizada, null, 2), 'utf8');
  return actualizada;
}

module.exports = {
  guardarOrdenPendiente,
  cargarOrdenPendiente,
  actualizarOrdenPendiente,
};
