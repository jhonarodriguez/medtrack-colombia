import { describe, it, expect, beforeEach } from "vitest";
import { RateLimitedAdapterDecorator } from "../../../src/adapters/decorators/rate-limited-adapter-decorator";
import type { PharmacyAdapter, MedicationResult, PharmacyLocation } from "../../../src/types/index.js";

class MockAdapter implements PharmacyAdapter {
  readonly id = "mock";
  readonly nombre = "Mock Pharmacy";
  readonly baseUrl = "https://mock.test/api";

  async buscar(medicamento: string, ciudad?: string): Promise<MedicationResult[]> {
    return [
      {
        nombre: medicamento,
        precio: 100,
        farmacia: {
          nombre: "Mock",
          codigo: "mock",
          distancia_km: 1,
          direccion: "Test",
          telefono: "123",
          ciudad: ciudad || "Bogotá",
        },
        url: "https://mock.test",
      },
    ];
  }

  async obtenerSedes(ciudad?: string): Promise<PharmacyLocation[]> {
    return [
      {
        nombre: "Mock Sede",
        codigo: "mock",
        distancia_km: 1,
        direccion: "Test",
        telefono: "123",
        ciudad: ciudad || "Bogotá",
      },
    ];
  }
}

describe("RateLimitedAdapterDecorator", () => {
  let mockAdapter: MockAdapter;
  let rateLimitedDecorator: RateLimitedAdapterDecorator;

  beforeEach(() => {
    mockAdapter = new MockAdapter();
    rateLimitedDecorator = new RateLimitedAdapterDecorator(mockAdapter);
  });

  it("preserva id, nombre, baseUrl del adapter", () => {
    expect(rateLimitedDecorator.id).toBe("mock");
    expect(rateLimitedDecorator.nombre).toBe("Mock Pharmacy");
    expect(rateLimitedDecorator.baseUrl).toBe("https://mock.test/api");
  });

  it("ejecuta buscar sin lanzar error (rate-limit es transparente)", async () => {
    const resultados = await rateLimitedDecorator.buscar("acetaminofen", "Bogotá");
    expect(resultados).toHaveLength(1);
    expect(resultados[0].nombre).toBe("acetaminofen");
  });

  it("ejecuta obtenerSedes sin rate-limit", async () => {
    const sedes = await rateLimitedDecorator.obtenerSedes("Bogotá");
    expect(sedes).toHaveLength(1);
    expect(sedes[0].nombre).toBe("Mock Sede");
  });

  it("delega url de múltiples llamadas al mismo dominio", async () => {
    const r1 = await rateLimitedDecorator.buscar("acetaminofen");
    const r2 = await rateLimitedDecorator.buscar("ibuprofeno");
    
    // Ambas llamadas al mismo dominio "mock.test" deberían estar
    // bajo el mismo rate-limit (verificado por withRateLimit interno)
    expect(r1).toHaveLength(1);
    expect(r2).toHaveLength(1);
  });
});
