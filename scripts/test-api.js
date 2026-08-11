const http = require('http');

function request(path, body, contentType) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: 'localhost', port: 3000, path, method: 'POST', headers: { 'Content-Type': contentType, 'Content-Length': Buffer.byteLength(body) } },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('=== Test 1: Health ===');
  const health = await new Promise((resolve, reject) => {
    http.get('http://localhost:3000/api/health', (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
  console.log(health);

  console.log('\n=== Test 2: RUT inválido ===');
  const invalid = await request('/api/agendar', 'rut=11.111.111-0&negocio=Test&textoOferta=Hola&horarioElegido=13:00', 'application/x-www-form-urlencoded');
  console.log(invalid.status, invalid.data);

  console.log('\n=== Test 3: Agendar válido (multipart) ===');
  const boundary = '----TestBoundary';
  const fields = { rut: '12.345.678-5', negocio: 'Panaderia El Sol', textoOferta: 'Pan amasado recien horneado', horarioElegido: '13:00' };
  const parts = Object.entries(fields).flatMap(([name, value]) => [`--${boundary}`, `Content-Disposition: form-data; name="${name}"`, '', value]);
  parts.push(`--${boundary}--`);
  const body = parts.join('\r\n');
  const valid = await request('/api/agendar', body, `multipart/form-data; boundary=${boundary}`);
  console.log(valid.status, valid.data);
}

main().catch(console.error);
