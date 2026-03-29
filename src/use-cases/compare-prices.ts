import type { SearchResult, MedicationResult } from "../types/index.js";
import { pharmacyOrchestrator } from "../orchestrator/pharmacy-orchestrator.js";
import type { CompararPreciosInput } from "../tools/schemas.js";

export interface ComparePricesOutput {
  medicamento_buscado: string;
  total_resultados: number;
  farmacias_consultadas: string[];
  farmacias_sin_respuesta: string[];
  comparativa: ComparativaEntry[];
  precio_minimo: number;
  precio_maximo: number;
  diferencia_pesos: number;
  diferencia_porcentaje: number;
  timestamp: string;
}

export interface ComparativaEntry {
  farmacia: string;
  producto: string;
  presentacion: string;
  precio: number;
  disponible: boolean;
  laboratorio?: string;
  distancia_km?: number;
  url_producto?: string;
}

/**
 * Use case para comparar precios de medicamentos entre farmacias.
 * Reutiliza el pipeline de búsqueda sin duplicar lógica.
 *
 * Responsabilidades (SRP):
 * - Recibir input validado (nombre, ciudad, incluir_genericos)
 * - Llamar al orchestrator de búsqueda
 * - Enriquecer resultados con análisis comparativo (min, max, diferencia)
 * - Retornar estructura de comparación agrupada por farmacia
 */
export class ComparePricesUseCase {
  constructor(private orchestrator = pharmacyOrchestrator) {}

  async execute(input: CompararPreciosInput): Promise<ComparePricesOutput> {
    const searchResult = await this.orchestrator.buscar(input.nombre, {
      ciudad: input.ciudad,
      max_resultados: 50,
    });
    
    const comparativa = this.enriquecerComparativa(searchResult);
    
    const precios = comparativa.map((e) => e.precio);
    const precioMinimo = Math.min(...precios);
    const precioMaximo = Math.max(...precios);
    const diferenciaPesos = precioMaximo - precioMinimo;
    const diferenciaPorcentaje =
      precioMinimo > 0 ? ((diferenciaPesos / precioMinimo) * 100).toFixed(1) : 0;

    return {
      medicamento_buscado: searchResult.medicamento_buscado,
      total_resultados: searchResult.total_resultados,
      farmacias_consultadas: searchResult.farmacias_consultadas,
      farmacias_sin_respuesta: searchResult.farmacias_sin_respuesta,
      comparativa,
      precio_minimo: precioMinimo,
      precio_maximo: precioMaximo,
      diferencia_pesos: diferenciaPesos,
      diferencia_porcentaje: Number(diferenciaPorcentaje),
      timestamp: searchResult.timestamp,
    };
  }

  private enriquecerComparativa(resultado: SearchResult): ComparativaEntry[] {
    return resultado.resultados
      .map((r: MedicationResult) => ({
        farmacia: r.farmacia.nombre,
        producto: r.nombre,
        presentacion: r.presentacion,
        precio: r.precio,
        disponible: r.disponible,
        laboratorio: r.laboratorio,
        distancia_km: r.farmacia.distancia_km,
        url_producto: r.url_producto,
      }))
      .sort((a, b) => a.precio - b.precio);
  }
}

export const comparePricesUseCase = new ComparePricesUseCase();
