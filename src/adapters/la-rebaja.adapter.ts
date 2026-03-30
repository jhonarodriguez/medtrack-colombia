import { VtexGraphqlBaseAdapter, type GraphQLVtexProduct } from "./vtex-graphql-base.adapter.js";
import type { PharmacyLocation } from "../types/index.js";
import { SEDES_LA_REBAJA_BOGOTA } from "./sedes/la-rebaja-bogota.js";

export class LaRebajaAdapter extends VtexGraphqlBaseAdapter {
  readonly id = "la-rebaja";
  readonly nombre = "La Rebaja";
  readonly baseUrl = "https://www.larebajavirtual.com";
  protected readonly domain = "larebajavirtual.com";

  protected readonly apiBase =
    "https://www.larebajavirtual.com/_v/segment/graphql/v1";

  protected getCategoryFilter(): string[] {
    return [
      "medicamento", "farmacia", "salud", "droguería", "droguer",
      "analg", "antibiótico", "vitamin", "suplemento", "inyectable",
    ];
  }

  protected getSedesPerCity(): Record<string, PharmacyLocation[]> {
    return {
      bogotá: SEDES_LA_REBAJA_BOGOTA,
    };
  }

  protected getPersistedQueryConfig(): { sha256Hash: string; operationName: string } {
    return {
      sha256Hash: "3eca26a431d4646a8bbce2644b78d3ca734bf8b4ba46afe4269621b64b0fb67d",
      operationName: "productSuggestions",
    };
  }

  protected override extractProducts(data: Record<string, unknown>): GraphQLVtexProduct[] {
    const suggestions = data?.productSuggestions as { products?: GraphQLVtexProduct[] } | undefined;
    return suggestions?.products ?? [];
  }

  protected override buildSearchVariables(medicamento: string): Record<string, unknown> {
    return {
      productOriginVtex: true,
      simulationBehavior: "default",
      hideUnavailableItems: false,
      advertisementOptions: {
        showSponsored: true,
        sponsoredCount: 2,
        repeatSponsoredProducts: false,
        advertisementPlacement: "autocomplete",
      },
      fullText: medicamento,
      count: 10,
      shippingOptions: [],
      variant: "null-null",
      origin: "autocomplete",
    };
  }

  protected override buildPresentacion(producto: GraphQLVtexProduct): string {
    return (
      producto.specificationGroups
        ?.find((g) => g.name === "Pum")
        ?.specifications?.find((s) => s.name === "Presentacionunidadmedida")
        ?.values?.[0] ?? producto.productName
    );
  }

  protected override buildNombre(producto: GraphQLVtexProduct, _presentacion: string): string {
    return producto.productName;
  }

  protected override buildProductUrl(link: string): string {
    if (!link) return "";
    const match = link.match(/\/([^/]+\/p)$/);
    if (match) return `${this.baseUrl}/${match[1]}`;
    return link;
  }
}
