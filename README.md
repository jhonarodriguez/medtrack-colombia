# MedTrack Colombia

Servidor MCP (Model Context Protocol) para buscar medicamentos en farmacias colombianas en tiempo real. Permite a cualquier LLM compatible con MCP consultar precios, comparar farmacias y encontrar disponibilidad cercana a tu ubicación.

**Farmacias soportadas:** Farmatodo · Cruz Verde · La Rebaja · Locatel · Colsubsidio

---

## Instalación rápida

No necesitas clonar nada. Agrega esto a tu configuración de Claude Desktop:

```json
{
  "mcpServers": {
    "medtrack-colombia": {
      "command": "npx",
      "args": ["-y", "medtrack-colombia"]
    }
  }
}
```

Eso es todo. La primera vez descarga e instala automáticamente.

---

## Herramientas disponibles

### `buscar_medicamento`
Busca un medicamento en todas las farmacias disponibles simultáneamente y retorna resultados ordenados por precio. Con coordenadas GPS también ordena por distancia.

```
nombre: "acetaminofén" | "Dolex" | "ibuprofeno 400mg"
ciudad?: "Bogotá" | "Medellín" | "Cali"
direccion?: "Cra 7 #72-30"
barrio?: "Chapinero"
localidad?: "Usaquén"
latitud?: 4.6097
longitud?: -74.0817
radio_km?: 1          # default: 1
max_resultados?: 20   # default: 20
formato?: "json" | "compact" | "markdown"  # default: "json"
```

### `comparar_precios`
Tabla comparativa de precios entre todas las farmacias, con ahorro máximo calculado.

```
nombre: "ibuprofeno"
ciudad?: "Bogotá"
incluir_genericos?: true  # default: true
formato?: "json" | "compact" | "markdown"
```

### `farmacias_cercanas`
Farmacias dentro de un radio, opcionalmente filtrando por disponibilidad de un medicamento.

```
latitud?: 4.6097
longitud?: -74.0817
ciudad?: "Bogotá"
direccion?: "Calle 100 # 15-20"
medicamento?: "paracetamol"
radio_km?: 1
formato?: "json" | "compact" | "markdown"
```

### `info_medicamento`
Información oficial del registro INVIMA: registro sanitario, principio activo, laboratorio, concentración y precio SISMED.

```
nombre: "Dolex"
cum?: "20049"
```

### `disponibilidad_farmacia`
Disponibilidad y precio de un medicamento en una cadena específica.

```
medicamento: "loratadina"
farmacia: "farmatodo" | "cruz-verde" | "la-rebaja" | "locatel" | "colsubsidio"
```

### Parámetro `formato`
| Valor | Descripción | Tokens aprox. |
|---|---|---|
| `json` | JSON compacto agrupado por cadena (default) | ~200-400 |
| `compact` | Tabla markdown top-10 | ~400-800 |
| `markdown` | Tabla completa con ubicaciones | ~1,500-4,000 |

---

## Instalación

### Requisitos
- Node.js 20+

### Desde npm

```bash
npm install -g medtrack-colombia
```

### Desde repositorio (desarrollo)

```bash
git clone https://github.com/TU_USUARIO/medtrack-colombia.git
cd medtrack-colombia
npm install
npm run build
```

---

## Configuración

Copia el archivo de variables de entorno:

```bash
cp .env.example .env
```

El servidor funciona **sin ninguna configuración adicional** usando las credenciales de Algolia incluidas (solo lectura, para Farmatodo) y Nominatim para geocodificación.

### Variables de entorno opcionales

| Variable | Default | Descripción |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | _(vacío)_ | Mejora precisión de geocodificación (barrios, localidades). Sin esta key usa Nominatim gratis. |
| `PLAYWRIGHT_TIMEOUT` | `20000` | Timeout scrapers en ms |
| `HTTP_TIMEOUT` | `10000` | Timeout HTTP en ms |
| `CACHE_PRICES_TTL` | `1800` | Cache de precios en segundos (30 min) |
| `LOG_LEVEL` | `info` | `error` \| `warn` \| `info` \| `debug` |
| `TRANSPORT` | `stdio` | `stdio` para uso local, `http` para despliegue cloud |
| `PORT` | `3000` | Puerto cuando `TRANSPORT=http` |

### Google Maps API (opcional pero recomendada)

Sin Google Maps el servidor funciona, pero la geocodificación de barrios y localidades de Bogotá puede ser menos precisa.

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un proyecto y habilita **Geocoding API**
3. Crea una API key en **Credentials**
4. Agrégala al `.env`:

```
GOOGLE_MAPS_API_KEY=AIzaSyD_tu_key_aqui
```

---

## Conectar a Claude Desktop

Edita el archivo de configuración de Claude Desktop:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

### Si clonaste el repositorio

```json
{
  "mcpServers": {
    "medicamentos-colombia": {
      "command": "node",
      "args": ["C:/ruta/absoluta/medtrack-colombia/dist/index.js"],
      "env": {
        "GOOGLE_MAPS_API_KEY": "tu_key_aqui"
      }
    }
  }
}
```

### Si instalaste con npm global

```json
{
  "mcpServers": {
    "medicamentos-colombia": {
      "command": "medtrack-colombia"
    }
  }
}
```

Reinicia Claude Desktop después de guardar el archivo.

---

## Conectar a Cursor

En **Cursor → Settings → MCP**, agrega:

```json
{
  "mcpServers": {
    "medicamentos-colombia": {
      "command": "node",
      "args": ["C:/ruta/absoluta/medtrack-colombia/dist/index.js"]
    }
  }
}
```

---

## Conectar a otros clientes MCP

Cualquier cliente compatible con MCP (Claude Code CLI, Continue, Cline, etc.) puede conectarse usando el transporte stdio estándar:

```bash
node /ruta/a/medtrack-colombia/dist/index.js
```

---

## Despliegue como servidor HTTP (acceso remoto)

Para compartir el servidor con un equipo o desplegarlo en la nube:

```bash
# .env
TRANSPORT=http
PORT=3000
```

```bash
npm run build
npm start
```

El servidor queda disponible en `http://localhost:3000/mcp`. Deployable en Railway, Render, Fly.io u otro servicio con soporte Node.js.

---

## Ejemplos de uso

Una vez conectado a Claude Desktop o Cursor, puedes hacer preguntas como:

> "¿Cuánto cuesta el Advil Children en farmacias cerca de la Calle 77 # 64-42 en Bogotá?"

> "Compara precios de ibuprofeno 400mg en Bogotá"

> "¿Qué farmacias hay dentro de 500 metros de mis coordenadas 4.6097, -74.0817 con omeprazol disponible?"

> "Información del registro INVIMA del Dolex"

---

## Desarrollo

```bash
npm run dev        # hot-reload con ts-node
npm test           # tests con vitest
npm run lint       # type-check
npm run build      # compilar a dist/
```

### Estructura del proyecto

```
src/
├── server.ts                    # Definición de tools MCP
├── orchestrator/
│   ├── pharmacy-orchestrator.ts  # Búsqueda paralela + ranking
│   └── adapter-registry.ts       # Pipeline Cache→RateLimit→Logging
├── adapters/
│   ├── farmatodo.adapter.ts      # Algolia API
│   ├── cruz-verde.adapter.ts     # REST API
│   ├── colsubsidio.adapter.ts    # VTEX GraphQL
│   ├── la-rebaja.adapter.ts      # VTEX GraphQL
│   ├── locatel.adapter.ts        # VTEX REST
│   └── sedes/                    # Coordenadas de sucursales en Bogotá
├── services/
│   ├── geo.service.ts            # Geocodificación + distancia Haversine
│   ├── cache.service.ts          # node-cache con TTL por tipo
│   └── format-response.service.ts # Agrupación y formateo de resultados
└── use-cases/                    # Lógica de negocio por tool
```

### Agregar una nueva farmacia

1. Crea `src/adapters/<cadena>-adapter.ts` implementando `PharmacyAdapter`
2. Agrega coordenadas en `src/adapters/sedes/<cadena>-bogota.ts`
3. Regístrala en `src/orchestrator/adapter-registry.ts`

---

## Limitaciones conocidas

- Las sedes con coordenadas actualmente cubren **Bogotá**. Búsquedas en otras ciudades funcionan sin filtro por distancia.
- Cruz Verde requiere sesión web válida; si falla la sesión, se excluye del resultado sin bloquear las demás farmacias.
- Drogas La Economía no está integrada en tiempo real en esta versión.

---

## Licencia

MIT
