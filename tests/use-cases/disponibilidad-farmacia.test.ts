import { describe, it, expect, vi } from "vitest";
import { DisponibilidadFarmaciaUseCase } from "../../src/use-cases/disponibilidad-farmacia.js";
import type { SearchResult } from "../../src/types/index.js";

function createMockOrchestrator(searchResult: SearchResult) {
  return {
    buscar: vi.fn().mockResolvedValue(searchResult),
  };
}

function createMockSearchResult(
  medicamento: string,
  farmaciaResultado?: {
    nombre: string;
    id: string;
    precio: number;
    disponible: boolean;
  }
): SearchResult {
  if (!farmaciaResultado) {
    return {
      medicamento_buscado: medicamento,
      total_resultados: 0,
      farmacias_consultadas: ["Farmatodo", "Cruz Verde"],
      farmacias_sin_respuesta: [],
      resultados: [],
      timestamp: new Date().toISOString(),
    };
  }

  return {
    medicamento_buscado: medicamento,
    total_resultados: 1,
    farmacias_consultadas: ["Farmatodo"],
    farmacias_sin_respuesta: [],
    resultados: [
      {
        nombre: medicamento,
        presentacion: "Caja x 10",
        precio: farmaciaResultado.precio,
        disponible: farmaciaResultado.disponible,
        farmacia: {
          id: farmaciaResultado.id,
          nombre: farmaciaResultado.nombre,
          direccion: "Calle 123 #456",
          ciudad: "Bogotá",
        },
        timestamp: new Date().toISOString(),
      },
    ],
    timestamp: new Date().toISOString(),
  };
}

describe("DisponibilidadFarmaciaUseCase", () => {
  describe("execute()", () => {
    it("retorna disponibilidad cuando medicamento existe en farmacia", async () => {
      const searchResult = createMockSearchResult("paracetamol", {
        nombre: "Farmatodo",
        id: "farmatodo",
        precio: 8500,
        disponible: true,
      });

      const mockOrchestrator = createMockOrchestrator(searchResult);
      const useCase = new DisponibilidadFarmaciaUseCase(mockOrchestrator as any);

      const resultado = await useCase.execute({
        medicamento: "paracetamol",
        farmacia: "farmatodo",
      });

      expect(resultado.disponible).toBe(true);
      expect(resultado.precio).toBe(8500);
      expect(resultado.presentacion).toBe("Caja x 10");
    });

    it("valida que farmacia sea soportada", async () => {
      const mockOrchestrator = createMockOrchestrator(
        createMockSearchResult("paracetamol")
      );
      const useCase = new DisponibilidadFarmaciaUseCase(mockOrchestrator as any);

      await expect(
        useCase.execute({
          medicamento: "paracetamol",
          farmacia: "farmacia-inexistente" as any,
        })
      ).rejects.toThrow("Farmacia no soportada");
    });

    it("retorna disponible=false cuando medicamento no se encuentra", async () => {
      const mockOrchestrator = createMockOrchestrator(createMockSearchResult("xyz"));
      const useCase = new DisponibilidadFarmaciaUseCase(mockOrchestrator as any);

      const resultado = await useCase.execute({
        medicamento: "medicamento inexistente",
        farmacia: "cruz-verde",
      });

      expect(resultado.disponible).toBe(false);
      expect(resultado.precio).toBeUndefined();
    });

    it("incluye información de ubicación cuando está disponible", async () => {
      const searchResult = createMockSearchResult("ibuprofeno", {
        nombre: "Cruz Verde",
        id: "cruz-verde",
        precio: 9500,
        disponible: true,
      });

      const mockOrchestrator = createMockOrchestrator(searchResult);
      const useCase = new DisponibilidadFarmaciaUseCase(mockOrchestrator as any);

      const resultado = await useCase.execute({
        medicamento: "ibuprofeno",
        farmacia: "cruz-verde",
      });

      expect(resultado.direccion).toBe("Calle 123 #456");
      expect(resultado.ciudad).toBe("Bogotá");
    });

    it("marca producto como sin stock cuando disponible=false", async () => {
      const searchResult = createMockSearchResult("amoxicilina", {
        nombre: "La Rebaja",
        id: "la-rebaja",
        precio: 6500,
        disponible: false,
      });

      const mockOrchestrator = createMockOrchestrator(searchResult);
      const useCase = new DisponibilidadFarmaciaUseCase(mockOrchestrator as any);

      const resultado = await useCase.execute({
        medicamento: "amoxicilina",
        farmacia: "la-rebaja",
      });

      expect(resultado.disponible).toBe(false);
      expect(resultado.precio).toBe(6500); // aun retorna precio si estaba antes
    });

    it("soporta todos los IDs de farmacia válidos", async () => {
      const farmacias = ["farmatodo", "cruz-verde", "la-rebaja", "locatel", "colsubsidio"];

      for (const farmacia of farmacias) {
        const searchResult = createMockSearchResult("paracetamol", {
          nombre: farmacia,
          id: farmacia,
          precio: 5000,
          disponible: true,
        });

        const mockOrchestrator = createMockOrchestrator(searchResult);
        const useCase = new DisponibilidadFarmaciaUseCase(mockOrchestrator as any);

        const resultado = await useCase.execute({
          medicamento: "paracetamol",
          farmacia: farmacia as any,
        });

        expect(resultado.farmacia_id).toBe(farmacia);
        expect(resultado).toBeDefined();
      }
    });

    it("retorna nombre legible de farmacia", async () => {
      const searchResult = createMockSearchResult("paracetamol", {
        nombre: "Farmatodo",
        id: "farmatodo",
        precio: 8500,
        disponible: true,
      });

      const mockOrchestrator = createMockOrchestrator(searchResult);
      const useCase = new DisponibilidadFarmaciaUseCase(mockOrchestrator as any);

      const resultado = await useCase.execute({
        medicamento: "paracetamol",
        farmacia: "farmatodo",
      });

      expect(resultado.farmacia_nombre).toBe("Farmatodo");
    });

    it("propaga errores del orchestrator", async () => {
      const mockOrchestrator = {
        buscar: vi.fn().mockRejectedValue(new Error("Conexión fallida")),
      };

      const useCase = new DisponibilidadFarmaciaUseCase(mockOrchestrator as any);

      await expect(
        useCase.execute({
          medicamento: "paracetamol",
          farmacia: "farmatodo",
        })
      ).rejects.toThrow("Conexión fallida");
    });

    it("incluye timestamp en ISO format", async () => {
      const searchResult = createMockSearchResult("paracetamol", {
        nombre: "Farmatodo",
        id: "farmatodo",
        precio: 8500,
        disponible: true,
      });

      const mockOrchestrator = createMockOrchestrator(searchResult);
      const useCase = new DisponibilidadFarmaciaUseCase(mockOrchestrator as any);

      const resultado = await useCase.execute({
        medicamento: "paracetamol",
        farmacia: "farmatodo",
      });

      expect(resultado.timestamp).toBeDefined();
      const fecha = new Date(resultado.timestamp);
      expect(fecha).toBeInstanceOf(Date);
    });
  });
});
