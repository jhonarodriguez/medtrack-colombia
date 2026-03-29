import pLimit from "p-limit";

// Cada farmacia tiene su propio limitador para no saturar un solo sitio.

const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_PER_PHARMACY ?? "2");
const DELAY_MS = parseInt(process.env.REQUEST_DELAY_MS ?? "1000");

const limiters = new Map<string, ReturnType<typeof pLimit>>();

function getLimiter(domain: string): ReturnType<typeof pLimit> {
  let limiter = limiters.get(domain);
  if (!limiter) {
    limiter = pLimit(MAX_CONCURRENT);
    limiters.set(domain, limiter);
  }
  return limiter;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ejecuta una función respetando el límite de concurrencia por dominio
 * y aplicando un delay entre llamadas al mismo dominio.
 */
export async function withRateLimit<T>(
  domain: string,
  fn: () => Promise<T>
): Promise<T> {
  const limiter = getLimiter(domain);
  return limiter(async () => {
    await delay(DELAY_MS);
    return fn();
  });
}
