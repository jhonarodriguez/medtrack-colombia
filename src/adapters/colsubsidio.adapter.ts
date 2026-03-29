import { VtexGraphqlBaseAdapter } from "./vtex-graphql-base.adapter.js";
import type { PharmacyLocation } from "../types/index.js";
import { SEDES_COLSUBSIDIO_BOGOTA } from "./sedes/colsubsidio-bogota.js";

/**
 * Colsubsidio - Adaptador VTEX Search GraphQL v3
 *
 * Usa el endpoint /_v/segment/graphql/v1?operationName=productSearchV3
 * con búsqueda full-text (map=ft), igual que la web de Colsubsidio.
 * El endpoint legacy /api/catalog_system devuelve resultados aleatorios
 * cuando no hay match exacto, por eso se migró al GraphQL.
 */
export class ColsubsidioAdapter extends VtexGraphqlBaseAdapter {
  readonly id = "colsubsidio";
  readonly nombre = "Colsubsidio";
  readonly baseUrl = "https://www.drogueriascolsubsidio.com";
  protected readonly domain = "drogueriascolsubsidio.com";

  protected readonly apiBase =
    "https://colsubsidio.myvtex.com/api/catalog_system/pub/products/search";

  protected getCategoryFilter(): string[] {
    return [
      "medicamento", "farmacia", "drogueria", "droguería", "salud",
    ];
  }

  protected getSedesPerCity(): Record<string, PharmacyLocation[]> {
    return {
      bogotá: SEDES_COLSUBSIDIO_BOGOTA,
    };
  }

  protected getPersistedQueryConfig(): { sha256Hash: string } {
    return {
      sha256Hash: "31d3fa494df1fc41efef6d16dd96a96e6911b8aed7a037868699a1f3f4d365de",
    };
  }
}
