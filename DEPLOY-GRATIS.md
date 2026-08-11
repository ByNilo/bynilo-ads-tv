# Despliegue gratis para pruebas externas

Guía paso a paso usando **solo servicios gratuitos** (OpenAI es lo único de pago).

---

## Qué obtienes (gratis)

| Servicio | Costo | Nota |
|----------|-------|------|
| GitHub | $0 | Guardar el código |
| Render Free | $0 | Hosting del sitio |
| OpenAI | ~$0,0002/reserva | Único costo variable |

### Limitaciones en fase de pruebas (aceptables)

- La app **se duerme** tras ~15 min sin visitas → la primera carga tarda ~1 min.
- Las reservas se guardan en disco **temporal** → se pierden si Render reinicia el servicio.
- Para pruebas externas con amigos/clientes piloto, esto suele ser suficiente.

---

## Paso 1 — Instalar Git (solo una vez)

En tu PC **no está instalado Git**. Descárgalo e instálalo:

1. Ve a https://git-scm.com/download/win
2. Descarga e instala (siguiente, siguiente… deja las opciones por defecto).
3. **Cierra y vuelve a abrir** PowerShell o Cursor después de instalar.

Verifica:

```powershell
git --version
```

---

## Paso 2 — Crear cuenta en GitHub (gratis)

1. Ve a https://github.com/signup
2. Crea tu cuenta (gratis).
3. Confirma el correo si te lo piden.

---

## Paso 3 — Subir el proyecto a GitHub

### 3.1 Crear repositorio vacío en GitHub

1. En GitHub → botón **+** → **New repository**
2. Nombre sugerido: `bynilo-ads-tv`
3. **Private** o **Public** (ambos gratis)
4. **No** marques “Add README”
5. Clic en **Create repository**

Copia la URL que te muestra, algo como:
`https://github.com/TU_USUARIO/bynilo-ads-tv.git`

### 3.2 Subir desde tu PC

Abre PowerShell en la carpeta del proyecto:

```powershell
cd "C:\Users\ASUS TUF\Desktop\Publicidad-en-vivo-main"

git init
git add .
git commit -m "BYNILO ADS TV - despliegue pruebas externas"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/bynilo-ads-tv.git
git push -u origin main
```

> **Importante:** `.env` **no** se sube (está en `.gitignore`). La clave OpenAI la pondrás solo en Render.

Si GitHub pide login, usa tu usuario y un **Personal Access Token** como contraseña:
GitHub → Settings → Developer settings → Personal access tokens → Generate new token.

---

## Paso 4 — Crear cuenta en Render (gratis)

1. Ve a https://render.com
2. **Get Started for Free**
3. Regístrate con tu cuenta de **GitHub** (más fácil para conectar el repo).

---

## Paso 5 — Crear el servicio web en Render

### Opción A — Blueprint (recomendada)

1. Render → **New +** → **Blueprint**
2. Conecta el repositorio `bynilo-ads-tv`
3. Render detectará `render.yaml` automáticamente
4. Clic en **Apply**

### Opción B — Manual

1. **New +** → **Web Service**
2. Conecta el repo de GitHub
3. Configura:

| Campo | Valor |
|-------|--------|
| Name | `bynilo-ads-tv` |
| Region | Oregon (US West) o el más cercano |
| Branch | `main` |
| Runtime | Node |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Instance Type | **Free** |

4. Clic en **Create Web Service**

---

## Paso 6 — Variables de entorno en Render

En tu servicio → **Environment** → **Add Environment Variable**:

| Key | Value |
|-----|--------|
| `OPENAI_API_KEY` | `sk-proj-...` (tu clave real) |
| `EMISION_TV_ACTIVA` | `false` |
| `NODE_ENV` | `production` |
| `DATA_DIR` | `./data` |

Guarda. Render **redesplegará** solo automáticamente.

> `OPENAI_API_KEY` es lo único que pagas: unos centavos por cada reserva que pase moderación.

---

## Paso 7 — Esperar el deploy

1. Pestaña **Logs** → verás `npm install`, `npm run build`, luego `Servidor de BYNILO ADS TV corriendo...`
2. Cuando termine, Render te da una URL tipo:
   `https://bynilo-ads-tv.onrender.com`

---

## Paso 8 — Probar que funciona

### Health check

Abre en el navegador:
```
https://TU-APP.onrender.com/api/health
```

Debes ver algo como:

```json
{
  "status": "ok",
  "emisionTvActiva": false,
  "modo": "solo-reservas",
  "moderacionActiva": true
}
```

### Sitio completo

Abre:
```
https://TU-APP.onrender.com
```

- Debe aparecer el banner amarillo: *“Sitio en línea… emisión en TV se activará…”*
- Prueba llenar el formulario con una reserva de prueba
- Si OpenAI tiene crédito, la moderación IA debe funcionar

### Compartir con testers

Envía la URL `https://TU-APP.onrender.com` a quien quieras que pruebe.

**Aviso para testers:** la primera visita después de inactividad puede tardar ~1 minuto (el servidor “despierta”).

---

## Paso 9 — (Opcional) Dominio propio más adelante

Solo cuando salgas de pruebas. Por ahora la URL `.onrender.com` es gratis y suficiente.

---

## Resumen de costos en fase de pruebas

| Concepto | Costo |
|----------|--------|
| GitHub | $0 |
| Render Free | $0 |
| URL `.onrender.com` | $0 |
| OpenAI (~50 pruebas) | ~$0,01 |
| OpenAI (~500 pruebas) | ~$0,10 |

---

## Cuando tengas el PC de transmisión

1. En el PC del estudio: `EMISION_TV_ACTIVA=true` y carpeta Just Broadcast.
2. Opcional: subir a plan de pago en Render o migrar a VPS para reservas permanentes.

---

## Problemas frecuentes

| Problema | Solución |
|----------|----------|
| Build falla | Revisa **Logs** en Render; suele ser falta de dependencias → vuelve a hacer push |
| `moderacionActiva: false` | Falta o está mal `OPENAI_API_KEY` en Environment |
| Error 429 OpenAI | Sin créditos en la cuenta OpenAI → recarga saldo |
| Sitio muy lento al abrir | Normal en plan Free tras inactividad; espera ~1 min |
| Reservas desaparecieron | Render reinició el contenedor; normal en pruebas sin disco de pago |
