import type { PharmacyAdapter, MedicationResult, PharmacyLocation } from "../types/index.js";
import { TextualRelevanceStrategy } from "./strategies/relevance-strategy.js";
import type { RelevanceStrategy } from "./strategies/relevance-strategy.js";

/**
 * Clase base para todos los adaptadores.
 * 
 * Responsabilidades:
 * - Define interfaz PharmacyAdapter (id, nombre, baseUrl, buscar, obtenerSedes)
 * - Provee métodos abstractos buscarInterno/obtenerSedesInterno
 * - Aplic​a filtro de relevancia mediante Strategy inyectable
 * - Helpers de logging (log, logError, timestamp)
 * 
 */
export abstract class BaseAdapter implements PharmacyAdapter {
  abstract readonly id: string;
  abstract readonly nombre: string;
  abstract readonly baseUrl: string;
  
  protected relevanceStrategy: RelevanceStrategy = new TextualRelevanceStrategy();

  /**
   * Implementación específica de búsqueda para cada farmacia.
   * Los decoradores (cache, rate-limit, logging) se aplican en adapter-registry.ts
   * cuando se crea la instancia del adapter.
   */
  protected abstract buscarInterno(
    medicamento: string,
    ciudad?: string
  ): Promise<MedicationResult[]>;
  
  protected abstract obtenerSedesInterno(
    ciudad?: string
  ): Promise<PharmacyLocation[]>;
  
  /**
   * Método público que aplica filtro de relevancia a resultados.
   * Los decoradores interceptan este método ANTES de ejecutar.
   */
  async buscar(medicamento: string, ciudad?: string): Promise<MedicationResult[]> {
    const resultados = await this.buscarInterno(medicamento, ciudad);
    // Aplica estrategia de relevancia: descartar productos poco relevantes
    return this.relevanceStrategy.filtrar(resultados, medicamento);
  }

  async obtenerSedes(ciudad?: string): Promise<PharmacyLocation[]> {
    return this.obtenerSedesInterno(ciudad);
  }

  /**
   * Permite inyectar una estrategia de relevancia diferente (útil para testing).
   */
  setRelevanceStrategy(strategy: RelevanceStrategy): void {
    this.relevanceStrategy = strategy;
  }

  protected timestamp(): string {
    return new Date().toISOString();
  }

  protected log(mensaje: string): void {
    process.stderr.write(`[${this.id}] ${mensaje}\n`);
  }

  protected logError(mensaje: string, err: unknown): void {
    const detalle = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[${this.id}] ERROR ${mensaje}: ${detalle}\n`);
  }
}
