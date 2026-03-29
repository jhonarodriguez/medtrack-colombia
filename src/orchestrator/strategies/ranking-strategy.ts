import type { MedicationResult } from "../../types/index.js";

export interface RankingStrategy {
  ordenar(resultados: MedicationResult[]): MedicationResult[];
}

export class PriceThenDistanceRankingStrategy implements RankingStrategy {
  ordenar(resultados: MedicationResult[]): MedicationResult[] {
    const ordenados = [...resultados];
    ordenados.sort((a, b) => {
      if (a.precio !== b.precio) return a.precio - b.precio;
      const da = a.farmacia.distancia_km ?? Infinity;
      const db = b.farmacia.distancia_km ?? Infinity;
      return da - db;
    });
    return ordenados;
  }
}
