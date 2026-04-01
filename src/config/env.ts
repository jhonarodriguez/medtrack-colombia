/**
 * Configuración centralizada para secretos y claves API.
 * Cargar desde variables de entorno (process.env) con validación y fallbacks.
 *
 * Warning: Los fallbacks aquí son PÚBLICOS (Algolia read-only keys, etc).
 * Nunca commitar secrets reales a git.
 */

export const env = {
  ALGOLIA_APP_ID: process.env.ALGOLIA_APP_ID || "VCOJEYD2PO",
  ALGOLIA_API_KEY: process.env.ALGOLIA_API_KEY || "eb9544fe7bfe7ec4c1aa5e5bf7740feb",
  ALGOLIA_INDEX: process.env.ALGOLIA_INDEX || "products-colombia",
  
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  
  CACHE_TTL_PRECIOS: parseInt(process.env.CACHE_TTL_PRECIOS || "3600", 10),
  CACHE_TTL_SEDES: parseInt(process.env.CACHE_TTL_SEDES || "86400", 10),
  
  RATE_LIMIT_REQUESTS_PER_MINUTE: parseInt(
    process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || "30",
    10
  ),
  
  NODE_ENV: process.env.NODE_ENV || "development",
  isDevelopment: process.env.NODE_ENV !== "production",
  isProduction: process.env.NODE_ENV === "production",
};

export function validateEnv(): void {
  const requiredVars = ["ALGOLIA_APP_ID", "ALGOLIA_API_KEY"];
  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0 && env.isProduction) {
    throw new Error(
      `Variables de entorno requeridas no están configuradas: ${missing.join(", ")}\n` +
        `Configura estas variables en tu .env o variables de entorno del sistema.`
    );
  }

  if (missing.length > 0) {
    console.warn(
      `⚠️  Variables de entorno faltando (usando fallbacks): ${missing.join(", ")}\n` +
        `En producción, esto causará un error.`
    );
  }
}
