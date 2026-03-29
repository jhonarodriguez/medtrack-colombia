import type { DisponibilidadFarmaciaInput } from "../tools/schemas.js";
import type { MedicationResult } from "../types/index.js";
import { pharmacyOrchestrator } from "../orchestrator/pharmacy-orchestrator.js";
import { createDefaultAdapters } from "../orchestrator/adapter-registry.js";

export interface DisponibilidadFarmaciaOutput {
  medicamento: string;
  farmacia_id: string;
  farmacia_nombre: string;
  disponible: boolean;
  precio?: number;
  presentacion?: string;
  laboratorio?: string;
  direccion?: string;
  ciudad?: string;
  telefono?: string;
  horario?: string;
  url_producto?: string;
  timestamp: string;
}

/**
 * Use case para verificar disponibilidad en una farmacia específica.
 * Reutiliza el pipeline de búsqueda filtrando por adaptador.
 *
 * Responsabilidades (SRP):
 * - Validar que la farmacia está soportada
 * - Llamar orchestrator.buscar() filtrando esa farmacia
 * - Retornar resultado formateado de disponibilidad (o no encontrado)
 */
export class DisponibilidadFarmaciaUseCase {
  private farmaciaMap = new Map([
    ["farmatodo", "farmatodo"],
    ["cruz-verde", "cruz-verde"],
    ["la-rebaja", "la-rebaja"],
    ["locatel", "locatel"],
    ["colsubsidio", "colsubsidio"],
  ]);

  constructor(private orchestrator = pharmacyOrchestrator) {}

  async execute(input: DisponibilidadFarmaciaInput): Promise<DisponibilidadFarmaciaOutput> {
    const farmaciaId = this.farmaciaMap.get(input.farmacia);
    if (!farmaciaId) {
      throw new Error(
        `Farmacia no soportada: ${input.farmacia}. ` +
          `Opciones: farmatodo, cruz-verde, la-rebaja, locatel, colsubsidio`
      );
    }
    const searchResult = await this.orchestrator.buscar(input.medicamento, {
      max_resultados: 1,
    });

    const resultado = searchResult.resultados.find(
      (r) => r.farmacia.id.toLowerCase().includes(farmaciaId.toLowerCase())
    );

    if (!resultado) {
      return {
        medicamento: input.medicamento,
        farmacia_id: farmaciaId,
        farmacia_nombre: this.getNombreFarmacia(farmaciaId),
        disponible: false,
        timestamp: new Date().toISOString(),
      };
    }
    
    return {
      medicamento: input.medicamento,
      farmacia_id: farmaciaId,
      farmacia_nombre: resultado.farmacia.nombre,
      disponible: resultado.disponible,
      precio: resultado.precio,
      presentacion: resultado.presentacion,
      laboratorio: resultado.laboratorio,
      direccion: resultado.farmacia.direccion,
      ciudad: resultado.farmacia.ciudad,
      telefono: resultado.farmacia.telefono,
      horario: resultado.farmacia.horario,
      url_producto: resultado.url_producto,
      timestamp: resultado.timestamp,
    };
  }

  private getNombreFarmacia(id: string): string {
    const nombres: Record<string, string> = {
      farmatodo: "Farmatodo",
      "cruz-verde": "Cruz Verde",
      "la-rebaja": "La Rebaja",
      locatel: "Locatel",
      colsubsidio: "Colsubsidio",
    };
    return nombres[id] || id;
  }
}

export const disponibilidadFarmaciaUseCase = new DisponibilidadFarmaciaUseCase();
