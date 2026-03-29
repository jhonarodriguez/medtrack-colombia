import { describe, it, expect, beforeEach, vi } from "vitest";
import { ComparePricesUseCase, type ComparePricesOutput } from "../../src/use-cases/compare-prices.js";
import type { SearchResult } from "../../src/types/index.js";

// ─── Mock orchestra ─────────────────────────────────────────────────────────

function createMockOrchestrator(searchResult: SearchResult) {
  return {
    buscar: vi.fn().mockResolvedValue(searchResult),
  };
}

function createMockSearchResult(
  medicamento: string,
  resultados: Array<{
    nombre: string;
    precio: number;
    presentacion: string;
    farmacia_nombre: string;
    disponible?: boolean;
    laboratorio?: string;
    distancia_km?: number;
  }>
): SearchResult {
  const todasLasFarmacias = ["Farmatodo", "Cruz Verde", "La Rebaja", "Locatel", "Colsubsidio"];
  const farmaciasConResultado = [...new Set(resultados.map((r) => r.farmacia_nombre))];
  const farmaciaSinRespuesta = todasLasFarmacias.filter((f) => !farmaciasConResultado.includes(f));

  return {
    medicamento_buscado: medicamento,
    total_resultados: resultados.length,
    farmacias_consultadas: farmaciasConResultado,
    farmacias_sin_respuesta: farmaciaSinRespuesta,
    resultados: resultados.map((r, i) => ({
      nombre: r.nombre,
      presentacion: r.presentacion,
      precio: r.precio,
      disponible: r.disponible ?? true,
      laboratorio: r.laboratorio,
      farmacia: {
        id: `farm-${i}`,
        nombre: r.farmacia_nombre,
        distancia_km: r.distancia_km,
      },
      timestamp: new Date().toISOString(),
    })),
    timestamp: new Date().toISOString(),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ComparePricesUseCase", () => {
  let useCase: ComparePricesUseCase;

  describe("execute()", () => {
    it("retorna estructura completa de comparación con estadísticas", async () => {
      const searchResult = createMockSearchResult("paracetamol 500mg", [
        { nombre: "Dolex 500mg", precio: 8500, presentacion: "Caja x 10", farmacia_nombre: "Farmatodo" },
        { nombre: "Tafirol 500mg", precio: 7200, presentacion: "Caja x 10", farmacia_nombre: "Cruz Verde" },
        { nombre: "Acetaminofén 500mg", precio: 9100, presentacion: "Blíster x 12", farmacia_nombre: "La Rebaja" },
      ]);

      const mockOrchestrator = createMockOrchestrator(searchResult);
      useCase = new ComparePricesUseCase(mockOrchestrator as any);

      const resultado = await useCase.execute({ nombre: "paracetamol 500mg" });

      expect(resultado).toMatchObject({
        medicamento_buscado: "paracetamol 500mg",
        total_resultados: 3,
        precio_minimo: 7200,
        precio_maximo: 9100,
        diferencia_pesos: 1900,
        diferencia_porcentaje: 26.4,
      });
      expect(resultado.comparativa).toHaveLength(3);
      // Verificar que está ordenado por precio
      expect(resultado.comparativa[0].precio).toBe(7200);
      expect(resultado.comparativa[1].precio).toBe(8500);
      expect(resultado.comparativa[2].precio).toBe(9100);
    });

    it("agrupa comparativa ordenada por precio ascendente", async () => {
      const searchResult = createMockSearchResult("ibuprofeno 400mg", [
        { nombre: "Profenid 400", precio: 12000, presentacion: "Caja x 20", farmacia_nombre: "Locatel" },
        { nombre: "Actron 400", precio: 9500, presentacion: "Caja x 20", farmacia_nombre: "Farmatodo" },
        { nombre: "Ibupirac 400", precio: 10200, presentacion: "Caja x 20", farmacia_nombre: "Colsubsidio" },
      ]);

      const mockOrchestrator = createMockOrchestrator(searchResult);
      useCase = new ComparePricesUseCase(mockOrchestrator as any);

      const resultado = await useCase.execute({ nombre: "ibuprofeno 400mg" });

      expect(resultado.comparativa).toHaveLength(3);
      expect(resultado.comparativa[0].farmacia).toBe("Farmatodo");
      expect(resultado.comparativa[0].precio).toBe(9500);
      expect(resultado.comparativa[1].farmacia).toBe("Colsubsidio");
      expect(resultado.comparativa[1].precio).toBe(10200);
      expect(resultado.comparativa[2].farmacia).toBe("Locatel");
      expect(resultado.comparativa[2].precio).toBe(12000);
    });

    it("calcula correctamente diferencia porcentual", async () => {
      const searchResult = createMockSearchResult("vitamina c 500mg", [
        { nombre: "Vit C Suplemento", precio: 10000, presentacion: "Frasco x 60", farmacia_nombre: "Farmatodo" },
        { nombre: "Vitamina C", precio: 20000, presentacion: "Frasco x 60", farmacia_nombre: "Cruz Verde" },
      ]);

      const mockOrchestrator = createMockOrchestrator(searchResult);
      useCase = new ComparePricesUseCase(mockOrchestrator as any);

      const resultado = await useCase.execute({ nombre: "vitamina c 500mg" });

      expect(resultado.diferencia_pesos).toBe(10000);
      expect(resultado.diferencia_porcentaje).toBe(100); // 100% de diferencia (doble precio)
    });

    it("incluye información de laboratorio en comparativa", async () => {
      const searchResult = createMockSearchResult("metformina 500mg", [
        {
          nombre: "Metformina 500",
          precio: 15000,
          presentacion: "Caja x 30",
          farmacia_nombre: "Farmatodo",
          laboratorio: "Teva",
        },
        {
          nombre: "Diabex 500",
          precio: 18000,
          presentacion: "Caja x 30",
          farmacia_nombre: "La Rebaja",
          laboratorio: "Novartis",
        },
      ]);

      const mockOrchestrator = createMockOrchestrator(searchResult);
      useCase = new ComparePricesUseCase(mockOrchestrator as any);

      const resultado = await useCase.execute({ nombre: "metformina 500mg" });

      expect(resultado.comparativa[0].laboratorio).toBe("Teva");
      expect(resultado.comparativa[1].laboratorio).toBe("Novartis");
    });

    it("incluye distancia en comparativa cuando está disponible", async () => {
      const searchResult = createMockSearchResult("amoxicilina 500mg", [
        {
          nombre: "Amoxicilina 500",
          precio: 6500,
          presentacion: "Caja x 12",
          farmacia_nombre: "Farmatodo",
          distancia_km: 2.5,
        },
        {
          nombre: "Amoxicilina 500",
          precio: 7000,
          presentacion: "Caja x 12",
          farmacia_nombre: "Cruz Verde",
          distancia_km: 5.2,
        },
      ]);

      const mockOrchestrator = createMockOrchestrator(searchResult);
      useCase = new ComparePricesUseCase(mockOrchestrator as any);

      const resultado = await useCase.execute({ nombre: "amoxicilina 500mg" });

      expect(resultado.comparativa[0].distancia_km).toBe(2.5);
      expect(resultado.comparativa[1].distancia_km).toBe(5.2);
    });

    it("marca disponibilidad correctamente", async () => {
      const searchResult = createMockSearchResult("omeprazol 20mg", [
        {
          nombre: "Omeprazol 20",
          precio: 11000,
          presentacion: "Caja x 14",
          farmacia_nombre: "Farmatodo",
          disponible: true,
        },
        {
          nombre: "Omeprazol 20",
          precio: 12000,
          presentacion: "Caja x 14",
          farmacia_nombre: "La Rebaja",
          disponible: false,
        },
      ]);

      const mockOrchestrator = createMockOrchestrator(searchResult);
      useCase = new ComparePricesUseCase(mockOrchestrator as any);

      const resultado = await useCase.execute({ nombre: "omeprazol 20mg" });

      expect(resultado.comparativa[0].disponible).toBe(true);
      expect(resultado.comparativa[1].disponible).toBe(false);
    });

    it("propaga errores del orchestrator", async () => {
      const mockOrchestrator = {
        buscar: vi.fn().mockRejectedValue(new Error("Fallo de conexión")),
      };

      useCase = new ComparePricesUseCase(mockOrchestrator as any);

      await expect(useCase.execute({ nombre: "cualquier medicamento" })).rejects.toThrow(
        "Fallo de conexión"
      );
    });

    it("registra farmacias sin respuesta en salida", async () => {
      const searchResult = createMockSearchResult("enalapril 10mg", [
        { nombre: "Enalapril 10", precio: 8000, presentacion: "Caja x 30", farmacia_nombre: "Farmatodo" },
      ]);

      const mockOrchestrator = createMockOrchestrator(searchResult);
      useCase = new ComparePricesUseCase(mockOrchestrator as any);

      const resultado = await useCase.execute({ nombre: "enalapril 10mg" });

      expect(resultado.farmacias_sin_respuesta).toContain("Cruz Verde");
      expect(resultado.farmacias_sin_respuesta).toContain("La Rebaja");
      expect(resultado.farmacias_sin_respuesta).toHaveLength(4); // Todas excepto Farmatodo
    });

    it("retorna comparativa vacía si búsqueda retorna sin resultados", async () => {
      const searchResult: SearchResult = {
        medicamento_buscado: "medicamento inexistente",
        total_resultados: 0,
        farmacias_consultadas: ["Farmatodo", "Cruz Verde", "La Rebaja", "Locatel", "Colsubsidio"],
        farmacias_sin_respuesta: [],
        resultados: [],
        timestamp: new Date().toISOString(),
      };

      const mockOrchestrator = createMockOrchestrator(searchResult);
      useCase = new ComparePricesUseCase(mockOrchestrator as any);

      const resultado = await useCase.execute({ nombre: "medicamento inexistente" });

      expect(resultado.total_resultados).toBe(0);
      expect(resultado.comparativa).toHaveLength(0);
      expect(resultado.precio_minimo).toBe(Infinity);
    });
  });
});
