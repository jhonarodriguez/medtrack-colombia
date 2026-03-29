import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LoggingAdapterDecorator } from "../../../src/adapters/decorators/logging-adapter-decorator";
import type { PharmacyAdapter, MedicationResult, PharmacyLocation } from "../../../src/types/index.js";

class MockAdapter implements PharmacyAdapter {
  readonly id = "mock";
  readonly nombre = "Mock Pharmacy";
  readonly baseUrl = "https://mock.test";

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

class ErrorAdapter implements PharmacyAdapter {
  readonly id = "error";
  readonly nombre = "Error Pharmacy";
  readonly baseUrl = "https://error.test";

  async buscar(): Promise<MedicationResult[]> {
    throw new Error("Mock error from buscar");
  }

  async obtenerSedes(): Promise<PharmacyLocation[]> {
    throw new Error("Mock error from obtenerSedes");
  }
}

describe("LoggingAdapterDecorator", () => {
  let mockStderr: any;

  beforeEach(() => {
    mockStderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true as any);
  });

  afterEach(() => {
    mockStderr.mockRestore();
  });

  it("preserva id, nombre, baseUrl del adapter", () => {
    const mockAdapter = new MockAdapter();
    const logged = new LoggingAdapterDecorator(mockAdapter);

    expect(logged.id).toBe("mock");
    expect(logged.nombre).toBe("Mock Pharmacy");
    expect(logged.baseUrl).toBe("https://mock.test");
  });

  it("registra entrada y salida exitosa de buscar", async () => {
    const mockAdapter = new MockAdapter();
    const logged = new LoggingAdapterDecorator(mockAdapter);

    const resultados = await logged.buscar("acetaminofen", "Bogotá");
    
    expect(resultados).toHaveLength(1);
    
    // Verificar que se registraron mensajes
    const calls = mockStderr.mock.calls;
    const mensajes = calls.map((c: any) => c[0]).join("");
    
    expect(mensajes).toContain("buscar('acetaminofen'");
    expect(mensajes).toContain("completado");
    expect(mensajes).toContain("1 resultados");
  });

  it("registra entrada y salida exitosa de obtenerSedes", async () => {
    const mockAdapter = new MockAdapter();
    const logged = new LoggingAdapterDecorator(mockAdapter);

    const sedes = await logged.obtenerSedes("Bogotá");
    
    expect(sedes).toHaveLength(1);
    
    const calls = mockStderr.mock.calls;
    const mensajes = calls.map((c: any) => c[0]).join("");
    
    expect(mensajes).toContain("obtenerSedes");
    expect(mensajes).toContain("completado");
    expect(mensajes).toContain("1 sedes");
  });

  it("registra error cuando buscar falla", async () => {
    const errorAdapter = new ErrorAdapter();
    const logged = new LoggingAdapterDecorator(errorAdapter);

    await expect(logged.buscar("test")).rejects.toThrow("Mock error from buscar");
    
    const calls = mockStderr.mock.calls;
    const mensajes = calls.map((c: any) => c[0]).join("");
    
    expect(mensajes).toContain("ERROR");
    expect(mensajes).toContain("Mock error from buscar");
  });

  it("registra error cuando obtenerSedes falla", async () => {
    const errorAdapter = new ErrorAdapter();
    const logged = new LoggingAdapterDecorator(errorAdapter);

    await expect(logged.obtenerSedes()).rejects.toThrow("Mock error from obtenerSedes");
    
    const calls = mockStderr.mock.calls;
    const mensajes = calls.map((c: any) => c[0]).join("");
    
    expect(mensajes).toContain("ERROR");
    expect(mensajes).toContain("Mock error from obtenerSedes");
  });
});
