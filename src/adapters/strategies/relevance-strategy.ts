import type { MedicationResult } from "../../types/index.js";

/**
 * Strategy para filtrado de relevancia de medicamentos por coincidencia con búsqueda.
 * Define cómo determinar si un producto es relevante para una consulta.
 */
export interface RelevanceStrategy {
  /**
   * Filtra medicamentos: ¿este producto es relevante para la búsqueda?
   * @param nombreProducto nombre del medicamento
   * @param query búsqueda del usuario
   * @returns true si el producto es relevante
   */
  esRelevante(nombreProducto: string, query: string): boolean;

  /**
   * Filtra un array de resultados, manteniendo solo los relevantes
   */
  filtrar(resultados: MedicationResult[], query: string): MedicationResult[];
}

/**
 * Strategy por defecto: coincidencia textual simple.
 * Descarta resultados si ninguna palabra de la búsqueda aparece en el nombre.
 * Normaliza tildes para que "acetaminofen" coincida con "Acetaminofén".
 */
export class TextualRelevanceStrategy implements RelevanceStrategy {
  private normalizar(texto: string): string {
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  esRelevante(nombreProducto: string, query: string): boolean {
    const palabras = this.normalizar(query)
      .split(/\s+/)
      .filter((p) => p.length >= 3);

    if (palabras.length === 0) return true;

    const nombre = this.normalizar(nombreProducto);
    return palabras.some((p) => nombre.includes(p));
  }

  filtrar(resultados: MedicationResult[], query: string): MedicationResult[] {
    return resultados.filter((r) => this.esRelevante(r.nombre, query));
  }
}

/**
 * Strategy stub para testing: acepta todo sin filtro.
 * Útil para mocks y casos de prueba.
 */
export class NoOpRelevanceStrategy implements RelevanceStrategy {
  esRelevante(): boolean {
    return true;
  }

  filtrar(resultados: MedicationResult[]): MedicationResult[] {
    return resultados;
  }
}
