import { BaseAdapter } from "./base-adapter.js";
import axios from "axios";
import type { MedicationResult, PharmacyLocation } from "../types/index.js";
import { SEDES_FARMATODO_BOGOTA } from "./sedes/farmatodo-bogota.js";
import { env } from "../config/env.js";

const ALGOLIA_APP_ID = env.ALGOLIA_APP_ID;
const ALGOLIA_API_KEY = env.ALGOLIA_API_KEY;
const ALGOLIA_INDEX = env.ALGOLIA_INDEX;
const ALGOLIA_URL = `https://${ALGOLIA_APP_ID.toLowerCase()}-dsn.algolia.net/1/indexes/*/queries`;

interface AlgoliaHit {
  objectID: string;
  description: string;
  brand: string;
  supplier: string;
  offerPrice: number;
  fullPrice: number; 
  calculatedPrice: number;
  stock: number;
  without_stock: boolean;
  url: string;
  departments: string[];
  Categoría: string;
  genéricos: string | null;
  presentación: string | null;
  requirePrescription: boolean;
}

const SEDES_POR_CIUDAD: Record<string, PharmacyLocation[]> = {
  bogotá: SEDES_FARMATODO_BOGOTA,
};

export class FarmatodoAdapter extends BaseAdapter {
  readonly id = "farmatodo";
  readonly nombre = "Farmatodo";
  readonly baseUrl = "https://www.farmatodo.com.co";
  protected readonly domain = "farmatodo.com.co";

  protected async buscarInterno(
    medicamento: string,
    ciudad?: string
  ): Promise<MedicationResult[]> {
    this.log(`Buscando "${medicamento}"${ciudad ? ` en ${ciudad}` : ""}...`);

    let hits: AlgoliaHit[];

    try {
      const response = await axios.post<{ results: { hits: AlgoliaHit[] }[] }>(
        ALGOLIA_URL,
        {
          requests: [
            {
              indexName: ALGOLIA_INDEX,
              params: new URLSearchParams({
                query: medicamento,
                hitsPerPage: "20",
                filters: "departments:'Salud y medicamentos' OR Categoría:'Salud y medicamentos'",
              }).toString(),
            },
          ],
        },
        {
          headers: {
            "X-Algolia-Application-Id": ALGOLIA_APP_ID,
            "X-Algolia-API-Key": ALGOLIA_API_KEY,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );
      hits = response.data?.results?.[0]?.hits ?? [];
    } catch (err) {
      this.logError("Fallo al consultar Algolia", err);
      return [];
    }

    if (hits.length === 0) {
      try {
        const response = await axios.post<{ results: { hits: AlgoliaHit[] }[] }>(
          ALGOLIA_URL,
          {
            requests: [
              {
                indexName: ALGOLIA_INDEX,
                params: new URLSearchParams({
                  query: medicamento,
                  hitsPerPage: "20",
                }).toString(),
              },
            ],
          },
          {
            headers: {
              "X-Algolia-Application-Id": ALGOLIA_APP_ID,
              "X-Algolia-API-Key": ALGOLIA_API_KEY,
              "Content-Type": "application/json",
            },
            timeout: 10000,
          }
        );
        hits = response.data?.results?.[0]?.hits ?? [];
      } catch {
        return [];
      }
    }

    const sede = this.seleccionarSede(ciudad);
    const resultados: MedicationResult[] = [];

    for (const hit of hits) {
      const precio = this.extraerPrecio(hit);
      if (precio <= 0) continue;

      resultados.push({
        nombre: hit.description,
        nombreGenerico: hit.genéricos ?? undefined,
        presentacion: hit.presentación ?? this.extraerPresentacion(hit.description),
        laboratorio: hit.supplier ?? undefined,
        precio,
        disponible: !hit.without_stock && hit.stock > 0,
        farmacia: { ...sede },
        url_producto: hit.url
          ? `${this.baseUrl}/producto/${hit.url}`
          : `${this.baseUrl}/search?q=${encodeURIComponent(medicamento)}`,
        timestamp: this.timestamp(),
      });
    }

    this.log(`Encontrados ${resultados.length} resultados para "${medicamento}"`);
    return resultados;
  }

  protected async obtenerSedesInterno(ciudad?: string): Promise<PharmacyLocation[]> {
    if (!ciudad) return Object.values(SEDES_POR_CIUDAD).flat();
    return SEDES_POR_CIUDAD[ciudad.toLowerCase()] ?? [];
  }

  private extraerPrecio(hit: AlgoliaHit): number {
    // Preferir offerPrice si existe y es mayor a 0
    if (hit.offerPrice > 0) return hit.offerPrice;
    if (hit.fullPrice > 0) return hit.fullPrice;
    if (hit.calculatedPrice > 0) return hit.calculatedPrice;
    return 0;
  }

  private extraerPresentacion(descripcion: string): string {
    const match = descripcion.match(/(?:caja|frasco|tubo|ampolla|sobre|blíster|vial)\s.+/i);
    return match ? match[0] : descripcion;
  }

  private seleccionarSede(ciudad?: string): PharmacyLocation {
    if (ciudad) {
      const sedes = SEDES_POR_CIUDAD[ciudad.toLowerCase()];
      if (sedes?.length) return sedes[0];
    }
    return SEDES_FARMATODO_BOGOTA[0];
  }
}
