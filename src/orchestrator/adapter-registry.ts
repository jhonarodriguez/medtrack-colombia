import type { PharmacyAdapter } from "../types/index.js";
import { LaRebajaAdapter } from "../adapters/la-rebaja.adapter.js";
import { FarmatodoAdapter } from "../adapters/farmatodo.adapter.js";
import { CruzVerdeAdapter } from "../adapters/cruz-verde.adapter.js";
import { LocatelAdapter } from "../adapters/locatel.adapter.js";
import { ColsubsidioAdapter } from "../adapters/colsubsidio.adapter.js";
import { CafamAdapter } from "../adapters/cafam.adapter.js";
import { CacheAdapterDecorator, type CacheTTLConfig } from "../adapters/decorators/cache-adapter-decorator.js";
import { RateLimitedAdapterDecorator } from "../adapters/decorators/rate-limited-adapter-decorator.js";
import { LoggingAdapterDecorator } from "../adapters/decorators/logging-adapter-decorator.js";
import { TTL } from "../services/cache.service.js";

/**
 * Registro de adaptadores activos por defecto.
 * 
 * Cada adapter obtiene:
 * - Cache (CacheAdapterDecorator)
 * - Rate-limit (RateLimitedAdapterDecorator)
 * - Logging (LoggingAdapterDecorator)
 */
function wrapWithDecorators(adapter: PharmacyAdapter): PharmacyAdapter {
  const ttlConfig: CacheTTLConfig = {
    precios: TTL.PRECIOS,
    sedes: TTL.SEDES,
  };

  // Composición de decoradores: Cache → RateLimit → Logging
  // El orden importa: primero cache (más rápido), luego rate-limit, luego logging
  const cached = new CacheAdapterDecorator(adapter, ttlConfig);
  const rateLimited = new RateLimitedAdapterDecorator(cached);
  const logged = new LoggingAdapterDecorator(rateLimited);

  return logged;
}

export function createDefaultAdapters(): PharmacyAdapter[] {
  return [
    wrapWithDecorators(new LaRebajaAdapter()),
    wrapWithDecorators(new FarmatodoAdapter()),
    wrapWithDecorators(new CruzVerdeAdapter()),
    wrapWithDecorators(new LocatelAdapter()),
    wrapWithDecorators(new ColsubsidioAdapter()),
    wrapWithDecorators(new CafamAdapter()),
    // Drogas La Economia: pendiente de implementacion
  ];
}
