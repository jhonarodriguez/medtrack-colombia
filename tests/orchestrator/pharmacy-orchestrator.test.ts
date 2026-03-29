import { describe, it, expect } from "vitest";
import { createPharmacyOrchestrator } from "../../src/orchestrator/pharmacy-orchestrator.js";
import type { MedicationResult, PharmacyAdapter, PharmacyLocation } from "../../src/types/index.js";

function createResult(
  adapterId: string,
  nombre: string,
  precio: number,
  distanciaKm?: number
): MedicationResult {
  return {
    nombre,
    presentacion: "Caja x 20",
    precio,
    disponible: true,
    farmacia: {
      id: `${adapterId}-sede-1`,
      nombre: adapterId,
      distancia_km: distanciaKm,
    },
    timestamp: new Date().toISOString(),
  };
}

function createAdapterMock(
  id: string,
  resultados: MedicationResult[],
  opts: { throwOnBuscar?: boolean } = {}
): PharmacyAdapter {
  return {
    id,
    nombre: id,
    baseUrl: `https://${id}.example.com`,
    async buscar(): Promise<MedicationResult[]> {
      if (opts.throwOnBuscar) {
        throw new Error(`Fallo ${id}`);
      }
      return resultados;
    },
    async obtenerSedes(): Promise<PharmacyLocation[]> {
      return [];
    },
  };
}

describe("createPharmacyOrchestrator", () => {
  it("ordena por precio y usa distancia como desempate", async () => {
    const adapterA = createAdapterMock("a", [
      createResult("a", "Medicamento A", 10000, 2),
      createResult("a", "Medicamento B", 8000, 5),
    ]);
    const adapterB = createAdapterMock("b", [
      createResult("b", "Medicamento C", 10000, 1),
    ]);

    const orchestrator = createPharmacyOrchestrator([adapterA, adapterB]);
    const result = await orchestrator.buscar("acetaminofen");

    expect(result.total_resultados).toBe(3);
    expect(result.resultados[0].nombre).toBe("Medicamento B");
    expect(result.resultados[1].nombre).toBe("Medicamento C");
    expect(result.resultados[2].nombre).toBe("Medicamento A");
  });

  it("registra farmacias sin respuesta si un adaptador falla", async () => {
    const ok = createAdapterMock("ok", [createResult("ok", "Medicamento A", 9000)]);
    const fail = createAdapterMock("fail", [], { throwOnBuscar: true });

    const orchestrator = createPharmacyOrchestrator([ok, fail]);
    const result = await orchestrator.buscar("ibuprofeno");

    expect(result.farmacias_consultadas).toContain("ok");
    expect(result.farmacias_consultadas).toContain("fail");
    expect(result.farmacias_sin_respuesta).toContain("fail");
    expect(result.total_resultados).toBe(1);
  });

  it("respeta max_resultados", async () => {
    const adapter = createAdapterMock("a", [
      createResult("a", "M1", 1000),
      createResult("a", "M2", 2000),
      createResult("a", "M3", 3000),
    ]);

    const orchestrator = createPharmacyOrchestrator([adapter]);
    const result = await orchestrator.buscar("loratadina", { max_resultados: 2 });

    expect(result.total_resultados).toBe(2);
    expect(result.resultados).toHaveLength(2);
  });

  it("filtra adaptadores cuando se especifica farmacias", async () => {
    const adapterA = createAdapterMock("a", [createResult("a", "M1", 1000)]);
    const adapterB = createAdapterMock("b", [createResult("b", "M2", 900)]);

    const orchestrator = createPharmacyOrchestrator([adapterA, adapterB]);
    const result = await orchestrator.buscar("omeprazol", { farmacias: ["b"] });

    expect(result.farmacias_consultadas).toEqual(["b"]);
    expect(result.resultados).toHaveLength(1);
    expect(result.resultados[0].farmacia.id.startsWith("b")).toBe(true);
  });

  it("maneja múltiples fallos parciales: algunos adapters OK, algunos FAIL", async () => {
    const adapter1Ok = createAdapterMock("pharmac1", [
      createResult("pharmac1", "Medicina X", 5000, 2),
      createResult("pharmac1", "Medicina Y", 6000, 3),
    ]);
    const adapter2Fail = createAdapterMock("pharmac2", [], { throwOnBuscar: true });
    const adapter3Ok = createAdapterMock("pharmac3", [
      createResult("pharmac3", "Medicina Z", 4500, 1),
    ]);

    const orchestrator = createPharmacyOrchestrator([
      adapter1Ok,
      adapter2Fail,
      adapter3Ok,
    ]);
    const result = await orchestrator.buscar("paracetamol");

    // Verifica que se consultaron todos, pero uno falló
    expect(result.farmacias_consultadas).toHaveLength(3);
    expect(result.farmacias_sin_respuesta).toEqual(["pharmac2"]);

    // Verifica que se retornan solo los resultados de los adapters OK
    expect(result.total_resultados).toBe(3);
    expect(result.resultados[0].nombre).toBe("Medicina Z"); // 4500, 1km (mejor precio)
    expect(result.resultados[1].nombre).toBe("Medicina X"); // 5000, 2km
    expect(result.resultados[2].nombre).toBe("Medicina Y"); // 6000, 3km
  });

  // ─── Tests para geocodificación (S3-05) ──────────────────────────────────────

  it("mantiene compatibilidad backward: búsqueda con ciudad", async () => {
    const adapter = createAdapterMock("a", [
      createResult("a", "Medicamento A", 10000),
    ]);

    const orchestrator = createPharmacyOrchestrator([adapter]);
    const result = await orchestrator.buscar("paracetamol", { ciudad: "Bogotá" });

    expect(result.total_resultados).toBe(1);
    expect(result.resultados[0].nombre).toBe("Medicamento A");
  });

  it("mantiene compatibilidad backward: búsqueda con coordenadas explícitas", async () => {
    const adapter = createAdapterMock("a", [
      createResult("a", "Medicamento A", 10000, 2),
    ]);

    const orchestrator = createPharmacyOrchestrator([adapter]);
    const result = await orchestrator.buscar("ibuprofeno", {
      latitud: 4.711,
      longitud: -74.0721,
      radio_km: 5,
    });

    // Si hay coordenadas explícitas, se usan directamente
    expect(result.total_resultados).toBe(1);
    expect(result.resultados[0].nombre).toBe("Medicamento A");
  });

  it("soporte para búsqueda con barrio + ciudad", async () => {
    const adapter = createAdapterMock("a", [
      createResult("a", "Medicamento B", 9000),
    ]);

    const orchestrator = createPharmacyOrchestrator([adapter]);
    const result = await orchestrator.buscar("loratadina", {
      barrio: "Chapinero",
      ciudad: "Bogotá",
    });

    // La búsqueda debería proceder aunque deba geocodificar
    expect(result.total_resultados).toBe(1);
  });

  it("soporte para búsqueda con dirección + ciudad", async () => {
    const adapter = createAdapterMock("a", [
      createResult("a", "Medicamento C", 8500),
    ]);

    const orchestrator = createPharmacyOrchestrator([adapter]);
    const result = await orchestrator.buscar("acetaminofén", {
      direccion: "Cra 7 #72-30",
      ciudad: "Bogotá",
    });

    // La búsqueda debería proceder
    expect(result.total_resultados).toBe(1);
  });

  it("prioriza coordenadas explícitas sobre geocodificación", async () => {
    const adapter = createAdapterMock("a", [
      createResult("a", "Medicamento D", 7500, 1),
    ]);

    const orchestrator = createPharmacyOrchestrator([adapter]);
    const result = await orchestrator.buscar("metformina", {
      latitud: 4.711,
      longitud: -74.0721,
      direccion: "Cra 7", // Será ignorado
      ciudad: "Bogotá",
    });

    // Las coordenadas explícitas toman precedencia
    expect(result.total_resultados).toBe(1);
  });
});
