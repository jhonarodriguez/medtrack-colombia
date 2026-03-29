import type { PharmacyAdapter, MedicationResult, PharmacyLocation } from "../../types/index.js";

/**
 * Decorador que añade logging transparente a cualquier adapter.
 * Intercepta buscar() y obtenerSedes(), registrando entrada/salida en stderr.
 * 
 * Ejemplo:
 *   const adapter = new CruzVerdeAdapter();
 *   const logged = new LoggingAdapterDecorator(adapter);
 *   logged.buscar('acetaminofen'); // Registra en stderr
 */
export class LoggingAdapterDecorator implements PharmacyAdapter {
  readonly id: string;
  readonly nombre: string;
  readonly baseUrl: string;

  constructor(private adapter: PharmacyAdapter) {
    this.id = adapter.id;
    this.nombre = adapter.nombre;
    this.baseUrl = adapter.baseUrl;
  }

  async buscar(medicamento: string, ciudad?: string): Promise<MedicationResult[]> {
    const inicio = Date.now();
    this.log(`buscar('${medicamento}', ciudad='${ciudad ?? "all"}') iniciado`);

    try {
      const resultados = await this.adapter.buscar(medicamento, ciudad);
      const duracion = Date.now() - inicio;
      this.log(`buscar('${medicamento}') completado en ${duracion}ms → ${resultados.length} resultados`);
      return resultados;
    } catch (err) {
      const duracion = Date.now() - inicio;
      this.logError(`buscar('${medicamento}') falló en ${duracion}ms`, err);
      throw err;
    }
  }

  async obtenerSedes(ciudad?: string): Promise<PharmacyLocation[]> {
    const inicio = Date.now();
    this.log(`obtenerSedes(ciudad='${ciudad ?? "all"}') iniciado`);

    try {
      const sedes = await this.adapter.obtenerSedes(ciudad);
      const duracion = Date.now() - inicio;
      this.log(`obtenerSedes() completado en ${duracion}ms → ${sedes.length} sedes`);
      return sedes;
    } catch (err) {
      const duracion = Date.now() - inicio;
      this.logError(`obtenerSedes() falló en ${duracion}ms`, err);
      throw err;
    }
  }

  private log(mensaje: string): void {
    process.stderr.write(`[${this.id}] ${mensaje}\n`);
  }

  private logError(mensaje: string, err: unknown): void {
    const detalle = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[${this.id}] ERROR ${mensaje}: ${detalle}\n`);
  }
}
