# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # Compile TypeScript to dist/
npm run dev            # Run with hot-reload (ts-node/esm, no build needed)
npm start              # Run compiled dist/index.js
npm test               # Run all tests (vitest)
npm run test:watch     # Run tests in watch mode
npm run lint           # Type-check only (tsc --noEmit), no eslint config
npm run clean          # Delete dist/
```

To run a single test file:
```bash
npx vitest run tests/adapters/decorators/cache-adapter-decorator.test.ts
```

## Architecture Overview

This is an MCP (Model Context Protocol) server that exposes 5 tools for searching drug prices across Colombian pharmacy chains. It runs over stdio (default) or HTTP.

### Request Flow

```
MCP Client (Claude Desktop / Cursor)
  → server.ts (MCP SDK, routes tool calls)
    → tools/ (Zod validation + orchestration)
      → orchestrator/pharmacy-orchestrator.ts (parallel search + ranking)
        → adapter-registry.ts (wraps each adapter in Cache→RateLimit→Logging)
          → adapters/ (5 pharmacy scrapers)
            → scrapers/cheerio-scraper.ts or playwright-scraper.ts
```

### MCP Tools

| Tool | Purpose |
|------|---------|
| `buscar_medicamento` | Main search: parallel query across all pharmacies, ranked by price then distance |
| `comparar_precios` | Comparative summary with min/max/savings |
| `farmacias_cercanas` | Find nearby pharmacies (with optional drug filter) |
| `info_medicamento` | INVIMA registration lookup (local hardcoded MVP) |
| `disponibilidad_farmacia` | Check availability at a specific chain |

### Pharmacy Adapters (`src/adapters/`)

Each implements `PharmacyAdapter` interface:

- **FarmatodoAdapter** — Algolia search API (credentials in `.env`)
- **CruzVerdeAdapter** — REST API with cookie-based session auth
- **LaRebajaAdapter**, **LocatelAdapter**, **ColsubsidioAdapter** — extend `VtexBaseAdapter` (Template Method pattern; same VTEX commerce API, different base URLs)

### Decorator Pipeline (`src/adapters/decorators/`)

Adapters are composed at runtime in `adapter-registry.ts`:
```
CacheAdapterDecorator → RateLimitedAdapterDecorator → LoggingAdapterDecorator → ConcreteAdapter
```
All three decorators implement `PharmacyAdapter`, so they're interchangeable.

### Key Services

- **`geo.service.ts`** — Geocodes addresses via Nominatim (free) or Google Maps (optional). Implements Haversine distance calculation.
- **`cache.service.ts`** — `node-cache` wrapper with per-key TTL. Prices: 30min, geo/INVIMA: 7 days.
- **`rate-limiter.service.ts`** — Per-domain request throttling to avoid IP blocks.

### Strategies (`src/orchestrator/strategies/`, `src/adapters/strategies/`)

- **RankingStrategy** — Sorts results by price ascending, then distance.
- **RelevanceFilterStrategy** — Filters results by word-matching with NFD accent normalization (so "acetaminofen" matches "Acetaminofén").

## Environment Variables

Copy `.env.example` to `.env`. Required for production:
- `ALGOLIA_APP_ID` / `ALGOLIA_API_KEY` — Farmatodo search (read-only keys, already in `.env.example`)
- `GOOGLE_MAPS_API_KEY` — Optional; omit to use free Nominatim geocoding

Key optional tuning vars: `PLAYWRIGHT_TIMEOUT`, `HTTP_TIMEOUT`, `MAX_CONCURRENT_PER_PHARMACY`, `REQUEST_DELAY_MS`, `CACHE_PRICES_TTL`, `LOG_LEVEL`, `TRANSPORT` (stdio|http), `PORT`.

## Module System

The project uses `"module": "Node16"` (ESM). All local imports **must** include the `.js` extension even in `.ts` source files (e.g., `import { foo } from './foo.js'`). This is a TypeScript Node16 ESM requirement.

## Testing

Tests live in `tests/` mirroring `src/` structure. Vitest is used (not Jest). Tests mock external HTTP calls — adapters, Nominatim, Playwright — so they run offline without `.env`.

Notable test files:
- `orchestrator/pharmacy-orchestrator.test.ts` — integration-style test of the full orchestration flow
- `services/geo.service.test.ts` — covers Haversine calculation and Nominatim geocoding
- `adapters/decorators/` — each decorator tested independently

## Adding a New Pharmacy

1. Create `src/adapters/<chain>-adapter.ts` implementing `PharmacyAdapter` (or extend `VtexBaseAdapter` if VTEX-based)
2. Add hardcoded `sedes` (branch locations) in `src/adapters/sedes/<chain>-sedes.ts`
3. Register in `src/orchestrator/adapter-registry.ts` inside `createDefaultAdapters()`
4. Add to `src/config/` if new API credentials are needed
