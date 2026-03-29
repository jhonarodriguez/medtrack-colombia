import type { PharmacyAdapter, MedicationResult, PharmacyLocation } from "../../types/index.js";
import { cacheService } from "../../services/cache.service.js";

export interface CacheTTLConfig {
  precios: number;
  sedes: number;
}

/**
 * Decorador que añade caching transparente a cualquier adapter.
 * Intercepta buscar() y obtenerSedes(), guardando resultados en caché.
 * 
 * Ejemplo:
 *   const adapter = new CruzVerdeAdapter();
 *   const cached = new CacheAdapterDecorator(adapter, { precios: 3600, sedes: 86400 });
 *   cached.buscar('acetaminofen'); // Usa caché
 */
export class CacheAdapterDecorator implements PharmacyAdapter {
  readonly id: string;
  readonly nombre: string;
  readonly baseUrl: string;

  constructor(
    private adapter: PharmacyAdapter,
    private ttlConfig: CacheTTLConfig
  ) {
    this.id = adapter.id;
    this.nombre = adapter.nombre;
    this.baseUrl = adapter.baseUrl;
  }

  async buscar(medicamento: string, ciudad?: string): Promise<MedicationResult[]> {
    const cacheKey = `${this.id}:buscar:${medicamento.toLowerCase()}:${ciudad ?? "all"}`;

    const cached = cacheService.get<MedicationResult[]>(cacheKey);
    if (cached !== undefined) return cached;

    const resultados = await this.adapter.buscar(medicamento, ciudad);
    if (resultados.length > 0) {
      cacheService.set(cacheKey, resultados, this.ttlConfig.precios);
    }
    return resultados;
  }

  async obtenerSedes(ciudad?: string): Promise<PharmacyLocation[]> {
    const cacheKey = `${this.id}:sedes:${ciudad ?? "all"}`;
    
    return cacheService.getOrSet(
      cacheKey,
      () => this.adapter.obtenerSedes(ciudad),
      this.ttlConfig.sedes
    );
  }
}
