import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CacheAdapterDecorator } from "../../../src/adapters/decorators/cache-adapter-decorator";
import type { PharmacyAdapter, MedicationResult, PharmacyLocation } from "../../../src/types/index.js";
import { cacheService } from "../../../src/services/cache.service";

// Mock adapter para testing
class MockAdapter implements PharmacyAdapter {
  readonly id = "mock";
  readonly nombre = "Mock Pharmacy";
  readonly baseUrl = "https://mock.test";

  callCount = 0;

  async buscar(medicamento: string, ciudad?: string): Promise<MedicationResult[]> {
    this.callCount++;
    return [
      {
        nombre: `${medicamento} - resultado ${this.callCount}`,
        precio: 100 * this.callCount,
        farmacia: {
          nombre: "Mock Farmacia",
          codigo: "mock",
          distancia_km: 1.5,
          direccion: "Calle Mock 123",
          telefono: "1234567",
          ciudad: ciudad || "Bogotá",
        },
        url: "https://mock.test",
      },
    ];
  }

  async obtenerSedes(ciudad?: string): Promise<PharmacyLocation[]> {
    this.callCount++;
    return [
      {
        nombre: "Mock Sede 1",
        codigo: "mock1",
        distancia_km: 1.5,
        direccion: "Calle Mock 123",
        telefono: "1234567",
        ciudad: ciudad || "Bogotá",
      },
    ];
  }
}

describe("CacheAdapterDecorator", () => {
  let mockAdapter: MockAdapter;
  let cacheDecorator: CacheAdapterDecorator;

  beforeEach(() => {
    // Limpiar caché global antes de cada test
    cacheService.flush();
    
    mockAdapter = new MockAdapter();
    cacheDecorator = new CacheAdapterDecorator(mockAdapter, {
      precios: 3600,
      sedes: 86400,
    });
  });

  it("preserva id, nombre, baseUrl del adapter", () => {
    expect(cacheDecorator.id).toBe("mock");
    expect(cacheDecorator.nombre).toBe("Mock Pharmacy");
    expect(cacheDecorator.baseUrl).toBe("https://mock.test");
  });

  it("cachea resultados de buscar (segunda llamada no ejecuta adapter)", async () => {
    const medicamento = "acetaminofen";
    
    const primera = await cacheDecorator.buscar(medicamento, "Bogotá");
    expect(mockAdapter.callCount).toBe(1);
    expect(primera[0].precio).toBe(100);

    const segunda = await cacheDecorator.buscar(medicamento, "Bogotá");
    expect(mockAdapter.callCount).toBe(1); // No incrementa: viene del caché
    expect(segunda[0].precio).toBe(100); // Mismo resultado
  });

  it("cachea resultados de obtenerSedes", async () => {
    const ciudad = "Bogotá";

    const primera = await cacheDecorator.obtenerSedes(ciudad);
    expect(mockAdapter.callCount).toBe(1);

    const segunda = await cacheDecorator.obtenerSedes(ciudad);
    expect(mockAdapter.callCount).toBe(1); // No incrementa: viene del caché
    expect(segunda[0].nombre).toBe("Mock Sede 1");
  });

  it("diferencia caché por medicamento y ciudad", async () => {
    const primera = await cacheDecorator.buscar("acetaminofen", "Bogotá");
    expect(mockAdapter.callCount).toBe(1);

    const segunda = await cacheDecorator.buscar("ibuprofeno", "Bogotá");
    expect(mockAdapter.callCount).toBe(2); // Diferente medicamento

    const tercera = await cacheDecorator.buscar("acetaminofen", "Medellín");
    expect(mockAdapter.callCount).toBe(3); // Diferente ciudad

    // Repite primera: desde caché
    const cuarta = await cacheDecorator.buscar("acetaminofen", "Bogotá");
    expect(mockAdapter.callCount).toBe(3); // Sin cambio
  });
});
