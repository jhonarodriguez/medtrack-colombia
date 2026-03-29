import type {
  PharmacyAdapter,
  MedicationResult,
  PharmacyLocation,
  SearchResult,
  BusquedaOpciones,
  Coordenadas,
} from "../types/index.js";
import { calcularDistanciaKm, geocodificarCiudad, geocodificarUbicacion } from "../services/geo.service.js";
import { createDefaultAdapters } from "./adapter-registry.js";
import {
  PriceThenDistanceRankingStrategy,
  type RankingStrategy,
} from "./strategies/ranking-strategy.js";

export interface PharmacyOrchestrator {
  buscar(medicamento: string, opciones?: BusquedaOpciones): Promise<SearchResult>;
  listarFarmacias(): { id: string; nombre: string }[];
  obtenerTodasLasSedes(ciudad?: string): Promise<PharmacyLocation[]>;
}

export function createPharmacyOrchestrator(adapters: PharmacyAdapter[]): PharmacyOrchestrator {
  const adapterList = [...adapters];
  const rankingStrategy: RankingStrategy = new PriceThenDistanceRankingStrategy();

  /**
   * Normaliza las opciones de búsqueda geocodificando ubicaciones flexibles.
   * Prioridad: coordenadas explícitas > geocodificación de dirección/barrio > ciudad > búsqueda nacional
   */
  async function normalizarUbicacion(
    opciones: BusquedaOpciones
  ): Promise<{ latitud?: number; longitud?: number; ciudad?: string }> {
    const { latitud, longitud, ciudad, direccion, barrio, localidad } = opciones;

    if (latitud !== undefined && longitud !== undefined) {
      return { latitud, longitud, ciudad };
    }

    if (direccion || barrio || localidad) {
      const coordenadas = await geocodificarUbicacion({
        direccion,
        barrio,
        localidad,
        ciudad,
      });
      if (coordenadas) {
        return { latitud: coordenadas.lat, longitud: coordenadas.lng, ciudad };
      }
    }

    if (ciudad) {
      const coordenadas = await geocodificarCiudad(ciudad);
      if (coordenadas) {
        return { latitud: coordenadas.lat, longitud: coordenadas.lng, ciudad };
      }
    }

    return { ciudad };
  }

  return {
    /**
     * Consulta todos los adaptadores en paralelo y combina los resultados.
     * Si un adaptador falla, se registra en farmacias_sin_respuesta pero
     * los demás continúan normalmente.
     * Soporta geocodificación automática de ubicaciones (dirección/barrio/localidad).
     */
    async buscar(medicamento: string, opciones: BusquedaOpciones = {}): Promise<SearchResult> {
      const opcionesNormalizadas = await normalizarUbicacion(opciones);

      const {
        ciudad = opcionesNormalizadas.ciudad,
        latitud = opcionesNormalizadas.latitud,
        longitud = opcionesNormalizadas.longitud,
        radio_km = 1,
        max_resultados = 20,
        farmacias,
      } = opciones;

      const adaptersActivos = farmacias
        ? adapterList.filter((a) => farmacias.includes(a.id))
        : adapterList;

      const promesas = adaptersActivos.map(async (adapter) => {
        try {
          const resultados = await adapter.buscar(medicamento, ciudad);
          return { adapterId: adapter.id, resultados, error: null };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          process.stderr.write(`[orchestrator] ${adapter.id} falló: ${msg}\n`);
          return { adapterId: adapter.id, resultados: [] as MedicationResult[], error: msg };
        }
      });

      const settled = await Promise.all(promesas);

      const farmaciasConsultadas: string[] = [];
      const farmaciasSinRespuesta: string[] = [];
      let todosResultados: MedicationResult[] = [];

      for (const { adapterId, resultados, error } of settled) {
        farmaciasConsultadas.push(adapterId);
        if (error) {
          farmaciasSinRespuesta.push(adapterId);
        } else {
          todosResultados = todosResultados.concat(resultados);
        }
      }

      if (latitud !== undefined && longitud !== undefined) {

        const sedesCercanasPorAdapter = new Map<string, (PharmacyLocation & { distancia_km: number })[]>();
        await Promise.all(
          adaptersActivos.map(async (adapter) => {
            const sedes = await adapter.obtenerSedes().catch(() => [] as PharmacyLocation[]);
            const cercanas = sedes
              .filter((s) => s.coordenadas !== undefined)
              .map((s) => ({
                ...s,
                distancia_km: calcularDistanciaKm(latitud, longitud, s.coordenadas!.lat, s.coordenadas!.lng),
              }))
              .filter((s) => s.distancia_km <= radio_km)
              .sort((a, b) => a.distancia_km - b.distancia_km);
            sedesCercanasPorAdapter.set(adapter.id, cercanas);
          })
        );

        const expandidos: MedicationResult[] = [];
        for (const r of todosResultados) {
          const adapterId = adaptersActivos.find((a) => r.farmacia.id.startsWith(a.id))?.id;
          const sedes = adapterId ? (sedesCercanasPorAdapter.get(adapterId) ?? []) : [];

          if (sedes.length === 0) {
            if (!r.farmacia.coordenadas) expandidos.push(r);
            continue;
          }

          for (const sede of sedes) {
            expandidos.push({ ...r, farmacia: { ...sede } });
          }
        }

        const dedup = new Map<string, MedicationResult>();
        for (const r of expandidos) {
          const variante = r.url_producto ?? r.presentacion ?? r.nombre;
          const key = `${r.farmacia.id}::${variante}`;
          const existente = dedup.get(key);
          if (!existente || r.precio < existente.precio) dedup.set(key, r);
        }
        todosResultados = [...dedup.values()];
      }

      todosResultados = rankingStrategy.ordenar(todosResultados);

      const limiteInterno = (latitud !== undefined && longitud !== undefined)
        ? Math.min(max_resultados * 20, 500)
        : max_resultados;
      const resultadosFinales = todosResultados.slice(0, limiteInterno);

      return {
        medicamento_buscado: medicamento,
        total_resultados: resultadosFinales.length,
        farmacias_consultadas: farmaciasConsultadas,
        farmacias_sin_respuesta: farmaciasSinRespuesta,
        resultados: resultadosFinales,
        timestamp: new Date().toISOString(),
      };
    },

    listarFarmacias(): { id: string; nombre: string }[] {
      return adapterList.map((a) => ({ id: a.id, nombre: a.nombre }));
    },

    async obtenerTodasLasSedes(ciudad?: string): Promise<PharmacyLocation[]> {
      const resultados = await Promise.allSettled(
        adapterList.map((a) => a.obtenerSedes(ciudad))
      );
      return resultados
        .filter(
          (r): r is PromiseFulfilledResult<PharmacyLocation[]> =>
            r.status === "fulfilled"
        )
        .flatMap((r) => r.value);
    },
  };
}

export const pharmacyOrchestrator = createPharmacyOrchestrator(createDefaultAdapters());
