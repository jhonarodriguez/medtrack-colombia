import { VtexGraphqlBaseAdapter, type GraphQLVtexProduct } from "./vtex-graphql-base.adapter.js";
import type { PharmacyLocation } from "../types/index.js";
import { SEDES_LOCATEL_BOGOTA } from "./sedes/locatel-bogota.js";

export class LocatelAdapter extends VtexGraphqlBaseAdapter {
  readonly id = "locatel";
  readonly nombre = "Locatel";
  readonly baseUrl = "https://www.locatelcolombia.com";
  protected readonly domain = "locatelcolombia.com";
  protected readonly apiBase = "https://www.locatelcolombia.com/_v/segment/graphql/v1";

  protected getCategoryFilter(): string[] {
    return ["drogueria", "droguería", "medicamento", "farmacia", "salud"];
  }

  protected getSedesPerCity(): Record<string, PharmacyLocation[]> {
    return { bogotá: SEDES_LOCATEL_BOGOTA };
  }

  protected getPersistedQueryConfig() {
    return {
      sha256Hash: "31d3fa494df1fc41efef6d16dd96a96e6911b8aed7a037868699a1f3f4d365de",
      operationName: "productSearchV3",
    };
  }

  protected override buildSearchVariables(medicamento: string): Record<string, unknown> {
    return {
      hideUnavailableItems: false,
      skusFilter: "ALL_AVAILABLE",
      simulationBehavior: "default",
      installmentCriteria: "MAX_WITHOUT_INTEREST",
      productOriginVtex: false,
      map: "ft",
      query: medicamento,
      orderBy: "OrderByScoreDESC",
      from: 0,
      to: 19,
      selectedFacets: [{ key: "ft", value: medicamento }],
      fullText: medicamento,
      facetsBehavior: "Static",
      categoryTreeBehavior: "default",
      withFacets: false,
      variant: "null-null",
    };
  }

  protected override buildNombre(producto: GraphQLVtexProduct, _presentacion: string): string {
    return producto.productName;
  }
}
