import type { PharmacyAdapter, MedicationResult, PharmacyLocation } from "../../types/index.js";
import { withRateLimit } from "../../services/rate-limiter.service.js";

/**
 * Decorador que añade rate-limiting transparente a cualquier adapter.
 * Intercepta buscar(), aplicando throttling por dominio.
 * 
 * Ejemplo:
 *   const adapter = new CruzVerdeAdapter();
 *   const rateLimited = new RateLimitedAdapterDecorator(adapter);
 *   rateLimited.buscar('acetaminofen'); // Respeta rate-limit global del dominio
 */
export class RateLimitedAdapterDecorator implements PharmacyAdapter {
  readonly id: string;
  readonly nombre: string;
  readonly baseUrl: string;

  private domain: string;

  constructor(private adapter: PharmacyAdapter) {
    this.id = adapter.id;
    this.nombre = adapter.nombre;
    this.baseUrl = adapter.baseUrl;
    try {
      const url = new URL(adapter.baseUrl);
      this.domain = url.hostname;
    } catch {
      this.domain = adapter.id;
    }
  }

  async buscar(medicamento: string, ciudad?: string): Promise<MedicationResult[]> {
    return withRateLimit(this.domain, () =>
      this.adapter.buscar(medicamento, ciudad)
    );
  }

  async obtenerSedes(ciudad?: string): Promise<PharmacyLocation[]> {
    return this.adapter.obtenerSedes(ciudad);
  }
}
