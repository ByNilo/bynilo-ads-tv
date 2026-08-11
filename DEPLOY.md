# Despliegue web (sin PC de transmisión)

Publica BYNILO ADS TV en internet para que los clientes puedan **reservar espacios** y pasar moderación IA, aunque la emisión en TV aún no esté conectada.

## Cómo funciona

| Modo | Variable | Comportamiento |
|------|----------|----------------|
| **Solo reservas** (nube) | `EMISION_TV_ACTIVA=false` | Guarda reservas en `data/reservas-pendientes/` |
| **Transmisión TV** (PC estudio) | `EMISION_TV_ACTIVA=true` | Escribe en Just Broadcast y emite en vivo |

Cuando tengas el PC de transmisión, cambias a modo transmisión o sincronizas las reservas pendientes.

---

## Opción recomendada: Render.com

### 1. Subir el código a GitHub

Si aún no tienes repositorio:

```bash
git init
git add .
git commit -m "Preparar despliegue web BYNILO ADS TV"
git remote add origin https://github.com/TU_USUARIO/bynilo-ads-tv.git
git push -u origin main
```

> No subas `.env` con claves reales. Usa `.env.example` como referencia.

### 2. Crear servicio en Render

1. Entra a [render.com](https://render.com) y conecta tu repositorio de GitHub.
2. **New → Blueprint** (usa el archivo `render.yaml` del proyecto) **o** **New → Web Service** manual:
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
   - **Plan:** Free (o superior si necesitas disco persistente estable)

### 3. Variables de entorno en Render

| Variable | Valor en nube |
|----------|---------------|
| `OPENAI_API_KEY` | Tu clave de OpenAI |
| `EMISION_TV_ACTIVA` | `false` |
| `NODE_ENV` | `production` |
| `DATA_DIR` | `/var/data` |
| `ALLOWED_ORIGINS` | `https://tu-app.onrender.com` (y tu dominio custom si lo tienes) |

El archivo `render.yaml` ya incluye disco persistente de 1 GB montado en `/var/data` para conservar reservas entre reinicios.

### 4. Verificar

Abre `https://tu-app.onrender.com/api/health`. Deberías ver:

```json
{
  "status": "ok",
  "emisionTvActiva": false,
  "modo": "solo-reservas",
  "moderacionActiva": true
}
```

En la página principal verás el aviso: *"Sitio en línea… emisión en TV se activará cuando el estudio esté conectado"*.

---

## Dominio propio (ej. byniloads.cl)

1. En Render → **Settings → Custom Domains** → agrega tu dominio.
2. En tu DNS (Cloudflare, NIC Chile, etc.) crea un registro **CNAME** apuntando a la URL de Render.
3. Actualiza `ALLOWED_ORIGINS` con `https://byniloads.cl,https://www.byniloads.cl`.

Si usas **Wix** solo para la landing corporativa, enlaza un botón *"Reservar aviso"* hacia `https://byniloads.cl` (esta app).

---

## Cuando tengas el PC de transmisión

### Opción A — Servidor en el PC del estudio

1. Clona el mismo repositorio en el PC con Just Broadcast.
2. Crea `.env` con:
   ```
   EMISION_TV_ACTIVA=true
   JUST_BROADCAST_FOLDER=C:/JustBroadcast/Output
   OPENAI_API_KEY=...
   ```
3. Ejecuta `iniciar-todo.bat` o `npm start` después de `npm run build`.
4. Expón el servicio con [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/) si quieres el mismo dominio apuntando al estudio.

### Opción B — Mantener la nube y puente manual

1. Descarga las reservas desde el disco de Render (`data/reservas-pendientes/*.json`).
2. Importa cada reserva al PC de transmisión (script futuro o proceso manual).
3. Activa emisión con `EMISION_TV_ACTIVA=true` en el estudio.

---

## Probar localmente en modo solo-reservas

Copia `.env.example` a `.env` y ajusta:

```
EMISION_TV_ACTIVA=false
OPENAI_API_KEY=sk-...
```

Luego:

```bash
npm install
npm run build
npm start
```

Abre http://localhost:3000 — frontend y API en el mismo puerto (producción simulada).

---

## Reservas guardadas

Cada reserva queda en:

```
data/reservas-pendientes/<id>.json
```

Incluye negocio, texto, horario, imagen en base64 y estado `pendiente_emision`.

En Render, el disco persistente evita perderlas al reiniciar el servicio.
