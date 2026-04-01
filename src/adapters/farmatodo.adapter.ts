import { BaseAdapter } from "./base-adapter.js";
import axios from "axios";
import type { MedicationResult, PharmacyLocation } from "../types/index.js";
import { SEDES_FARMATODO_BOGOTA } from "./sedes/farmatodo-bogota.js";
import { env } from "../config/env.js";

const ALGOLIA_APP_ID = env.ALGOLIA_APP_ID;
const ALGOLIA_API_KEY = env.ALGOLIA_API_KEY;
const ALGOLIA_INDEX = env.ALGOLIA_INDEX;
const ALGOLIA_URL = "https://api-search.farmatodo.com/1/indexes/*/queries";

interface AlgoliaHit {
  objectID: string;
  mediaDescription: string;
  marca: string;
  supplier: string;
  offerPrice: number;
  fullPrice: number;
  outofstore: boolean;
  hasStock: boolean;
  url: string;
  presentación: string | null;
  requirePrescription: string;
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
              query: medicamento,
              params: new URLSearchParams({
                hitsPerPage: "24",
                filters: "outofstore:false  AND NOT rms_class:SAMPLING",
                facets: "marca,categorie,subCategory,fullPrice,Prime",
                page: "0",
                optionalFilters:
                  '[["stores_with_stock:26","stores_with_stock:20","stores_with_stock:67","stores_with_stock:3","stores_with_stock:85","stores_with_stock:24","stores_with_stock:31","stores_with_stock:88","stores_with_stock:81","stores_with_stock:83","stores_with_stock:89","stores_with_stock:15","stores_with_stock:54","stores_with_stock:1122"]]',
                clickAnalytics: "true",
                userToken: "anonymous-8d066b1d-2899-47c0-b23c-447ddb52b1f1",
              }).toString(),
            },
          ],
        },
        {
          headers: {
            "X-Algolia-Application-Id": ALGOLIA_APP_ID,
            "X-Algolia-API-Key": ALGOLIA_API_KEY,
            "Content-Type": "application/json",
            "x-custom-city": "BOG",
            "x-anonymous": "true",
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
      this.log(`Sin resultados para "${medicamento}"`);
      return [];
    }

    const sede = this.seleccionarSede(ciudad);
    const resultados: MedicationResult[] = [];

    for (const hit of hits) {
      const precio = this.extraerPrecio(hit);
      if (precio <= 0) continue;

      resultados.push({
        nombre: hit.mediaDescription,
        presentacion: hit.presentación ?? this.extraerPresentacion(hit.mediaDescription),
        laboratorio: hit.supplier ?? undefined,
        precio,
        disponible: !hit.outofstore && hit.hasStock,
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
    if (hit.offerPrice > 0) return hit.offerPrice;
    if (hit.fullPrice > 0) return hit.fullPrice;
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
