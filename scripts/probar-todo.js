/**
 * Prueba integral del sistema BYNILO ADS TV
 * Ejecutar con: node scripts/probar-todo.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUTPUT = process.env.JUST_BROADCAST_FOLDER || 'C:/JustBroadcast/Output';
let passed = 0;
let failed = 0;

function log(icon, msg) {
  console.log(`${icon} ${msg}`);
}

function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : {} });
        } catch {
          resolve({ status: res.statusCode, data: { raw: data } });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function multipartBody(fields) {
  const boundary = '----TestBoundary';
  const parts = Object.entries(fields).flatMap(([name, value]) => [
    `--${boundary}`,
    `Content-Disposition: form-data; name="${name}"`,
    '',
    value,
  ]);
  parts.push(`--${boundary}--`);
  return {
    body: parts.join('\r\n'),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    log('✅', name);
  } catch (err) {
    failed++;
    log('❌', `${name} — ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log('\n══════════════════════════════════════════');
  console.log('  PRUEBA INTEGRAL — BYNILO ADS TV');
  console.log('══════════════════════════════════════════\n');

  // 1. Health
  await test('Backend responde en /api/health', async () => {
    const res = await httpRequest({ hostname: 'localhost', port: 3000, path: '/api/health', method: 'GET' });
    assert(res.status === 200, `Status ${res.status}`);
    assert(res.data.status === 'ok', 'status !== ok');
    assert(res.data.intervaloSegundos === 45, 'intervalo incorrecto');
    console.log('   →', JSON.stringify(res.data));
  });

  // 2. Horarios (grilla 45 seg)
  await test('API /api/horarios devuelve espacios cada 45 seg', async () => {
    const res = await httpRequest({ hostname: 'localhost', port: 3000, path: '/api/horarios', method: 'GET' });
    assert(res.status === 200, `Status ${res.status}`);
    assert(res.data.intervaloSegundos === 45, 'intervalo incorrecto');
    assert(res.data.duracionEmisionSegundos === 15, 'duración emisión incorrecta');
    assert(res.data.horas?.length === 17, 'debe haber 17 horas (7-23)');
    assert(res.data.horas[0].hora === '07', 'primera hora debe ser 07');
    assert(res.data.horas[0].espacios[0].valor === '07:05:15', 'primer bloque debe ser 07:05:15');
    assert(res.data.horas[0].totalEspacios > 0, 'debe tener espacios por hora');
    assert(res.data.dias?.length === 14, 'debe haber 14 días disponibles');
    assert(res.data.fechaConsulta, 'debe incluir fechaConsulta');
    console.log(`   → ${res.data.dias.length} días, hora 18 ej: ${res.data.horas.find(h => h.hora === '18')?.espacios.slice(0, 3).map(e => e.valor).join(', ')}`);
  });

  // 4. Frontend
  await test('Frontend responde en puerto 5173', async () => {
    const res = await new Promise((resolve, reject) => {
      http.get('http://localhost:5173', (r) => resolve(r.statusCode)).on('error', reject);
    });
    assert(res === 200, `Status ${res}`);
  });

  // 5. RUT inválido
  await test('Rechaza RUT inválido (semáforo rojo)', async () => {
    const body = 'rut=11.111.111-0&negocio=Test&textoOferta=Hola&aceptaCondiciones=true&bloques=' + encodeURIComponent(JSON.stringify([{ fechaPublicacion: '2026-12-01', horarioElegido: '13:00:15' }]));
    const res = await httpRequest(
      { hostname: 'localhost', port: 3000, path: '/api/agendar', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) } },
      body,
    );
    assert(res.status === 400, `Status ${res.status}`);
    assert(res.data.semaforo === 'rojo', 'semaforo !== rojo');
  });

  // 6. Texto muy largo
  await test('Rechaza texto mayor a 150 caracteres', async () => {
    const largo = 'A'.repeat(151);
    const { body, contentType } = multipartBody({
      rut: '12.345.678-5',
      negocio: 'Test',
      textoOferta: largo,
      aceptaCondiciones: 'true',
      bloques: JSON.stringify([{ fechaPublicacion: '2026-12-01', horarioElegido: '13:00:15' }]),
    });
    const res = await httpRequest(
      { hostname: 'localhost', port: 3000, path: '/api/agendar', method: 'POST', headers: { 'Content-Type': contentType, 'Content-Length': Buffer.byteLength(body) } },
      body,
    );
    assert(res.status === 400, `Status ${res.status}`);
  });

  // 7. Sin aceptar condiciones
  await test('Rechaza agendar sin aceptar condiciones', async () => {
    const { body, contentType } = multipartBody({
      rut: '12.345.678-5',
      negocio: 'Test',
      textoOferta: 'Oferta de prueba',
      bloques: JSON.stringify([{ fechaPublicacion: '2026-12-01', horarioElegido: '13:00:15' }]),
    });
    const res = await httpRequest(
      { hostname: 'localhost', port: 3000, path: '/api/agendar', method: 'POST', headers: { 'Content-Type': contentType, 'Content-Length': Buffer.byteLength(body) } },
      body,
    );
    assert(res.status === 400, `Status ${res.status}`);
    assert(res.data.semaforo === 'rojo', 'semaforo !== rojo');
  });

  // 8. Agendar válido
  await test('Agenda anuncio válido (semáforo verde)', async () => {
    const horariosRes = await httpRequest({ hostname: 'localhost', port: 3000, path: '/api/horarios', method: 'GET' });
    const horaConEspacio = horariosRes.data.horas.find((h) =>
      h.espacios.some((e) => e.disponible),
    );
    assert(horaConEspacio, 'No hay horarios disponibles');
    const horario = horaConEspacio.espacios.find((e) => e.disponible).valor;

    const { body, contentType } = multipartBody({
      rut: '12.345.678-5',
      negocio: 'Panadería El Sol',
      textoOferta: 'Pan amasado recién horneado — promo del día',
      aceptaCondiciones: 'true',
      bloques: JSON.stringify([{
        fechaPublicacion: horariosRes.data.fechaConsulta,
        horarioElegido: horario,
      }]),
    });
    const res = await httpRequest(
      { hostname: 'localhost', port: 3000, path: '/api/agendar', method: 'POST', headers: { 'Content-Type': contentType, 'Content-Length': Buffer.byteLength(body) } },
      body,
    );
    console.log('   →', JSON.stringify(res.data));
    assert(res.status === 200, `Status ${res.status}`);
    assert(res.data.semaforo === 'verde', `semaforo=${res.data.semaforo} (reinicia backend si moderación está activa sin API key)`);
    assert(res.data.estado === 'exito', `estado=${res.data.estado}`);
  });

  // 6. Carpeta Just Broadcast
  await test('Carpeta C:/JustBroadcast/Output existe', async () => {
    assert(fs.existsSync(OUTPUT), `No existe ${OUTPUT}`);
  });

  // 7. Proxy frontend → backend
  await test('Proxy Vite conecta frontend con backend', async () => {
    const res = await new Promise((resolve, reject) => {
      http.get('http://localhost:5173/api/health', (r) => {
        let d = '';
        r.on('data', (c) => { d += c; });
        r.on('end', () => resolve({ status: r.statusCode, data: JSON.parse(d) }));
      }).on('error', reject);
    });
    assert(res.status === 200, `Status ${res.status}`);
    assert(res.data.status === 'ok', 'proxy no devolvió ok');
  });

  console.log('\n══════════════════════════════════════════');
  console.log(`  Resultado: ${passed} OK / ${failed} FAIL`);
  console.log('══════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Error fatal:', err.message);
  process.exit(1);
});
