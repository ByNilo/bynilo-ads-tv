# BYNILO ADS TV — Publicidad en Vivo

Plataforma publicitaria BYNILO ADS TV con backend Express, moderación IA (OpenAI Vision) y salida a Just Broadcast.

## Estructura del proyecto

```
Publicidad-en-vivo-main/
├── server.js          # Backend Express
├── package.json
├── .env.example
└── SIC/               # Frontend React (Vite)
    └── src/
        ├── App.jsx
        ├── api.js
        └── components/
            └── FormularioAnuncio.jsx
```

## Requisitos

- Node.js 18+
- Cuenta OpenAI con API key (para moderación)
- Just Broadcast configurado para leer `C:/JustBroadcast/Output`

## Inicio rápido (Windows)

Doble clic en **`iniciar-todo.bat`** para levantar backend y frontend a la vez.

| Script | Descripción |
|--------|-------------|
| `iniciar-todo.bat` | Backend + Frontend |
| `iniciar-backend.bat` | Solo backend (puerto 3000) |
| `iniciar-frontend.bat` | Solo frontend (puerto 5173) |

> El proyecto incluye Node.js portable en `.tools/node` — no necesitas instalar Node por separado.

## Pruebas de API

Con el backend corriendo:

```bash
node scripts/test-api.js
```

## Endpoints del backend

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado del servidor e intervalo de emisión |
| POST | `/api/moderar` | Solo moderación (texto + imagen) |
| POST | `/api/agendar` | Validar RUT, moderar y agendar emisión |

## Flujo al presionar "Confirmar"

1. Valida RUT chileno (Módulo 11)
2. Valida texto (máx. 150 caracteres)
3. Envía texto e imagen a OpenAI Vision API
4. Aplica semáforo de moderación:
   - **Rojo:** política, alcohol, religión, sexual, casinos, funas, discriminación → rechazado
   - **Amarillo:** medios de comunicación → revisión editorial
   - **Verde:** aprobado → escribe archivos en Just Broadcast
5. Programa la emisión respetando el intervalo de **45 segundos** (15s banner + 30s pausa)

## Archivos Just Broadcast

Se escriben en `C:/JustBroadcast/Output/`:

- `negocio.txt` — nombre del negocio
- `oferta.txt` — texto de la oferta
- `imagen.jpg` — imagen del anuncio (si se subió)

Los archivos se limpian automáticamente tras 15 segundos de emisión.

## Despliegue web (sin PC de transmisión)

Para publicar el sitio en internet **antes** de tener el estudio conectado, usa modo solo-reservas:

```
EMISION_TV_ACTIVA=false
```

Guía paso a paso (Render, dominio, activación futura de TV): **[DEPLOY.md](./DEPLOY.md)**

Guía **100% gratis** para pruebas externas: **[DEPLOY-GRATIS.md](./DEPLOY-GRATIS.md)**

