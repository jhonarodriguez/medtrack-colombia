import { fetchJson } from "../scrapers/cheerio-scraper.js";
import type { MedicationResult, PharmacyLocation } from "../types/index.js";
import { VtexBaseAdapter } from "./vtex-base.adapter.js";

interface GraphQLPriceRange {
  sellingPrice?: { lowPrice?: number; highPrice?: number };
  listPrice?: { lowPrice?: number; highPrice?: number };
}

interface GraphQLSpecification {
  name: string;
  originalName: string;
  values: string[];
}

interface GraphQLSpecGroup {
  name: string;
  originalName: string;
  specifications: GraphQLSpecification[];
}

export interface GraphQLVtexProduct {
  productName: string;
  brand?: string;
  link?: string;
  categories?: string[];
  priceRange?: GraphQLPriceRange;
  specificationGroups?: GraphQLSpecGroup[];
}

interface GraphQLSearchResponse<TProduct extends GraphQLVtexProduct> {
  data?: {
    productSearch?: {
      products?: TProduct[];
    };
  };
}

interface PersistedQueryConfig {
  sha256Hash: string;
  operationName?: string;
  sender?: string;
  provider?: string;
}

/**
 * Base reusable para farmacias VTEX que usan GraphQL + persisted query.
 */
export abstract class VtexGraphqlBaseAdapter extends VtexBaseAdapter {
  protected abstract getPersistedQueryConfig(): PersistedQueryConfig;

  protected buildSearchVariables(medicamento: string): Record<string, unknown> {
    return {
      hideUnavailableItems: false,
      skusFilter: "ALL",
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

  protected buildPresentacion(producto: GraphQLVtexProduct): string {
    return (
      producto.specificationGroups
        ?.find((g) => g.originalName === "Filtros")
        ?.specifications?.find((s) => s.originalName === "Presentación")
        ?.values?.[0] ?? producto.productName
    );
  }

  protected buildNombre(producto: GraphQLVtexProduct, presentacion: string): string {
    return `${producto.productName} - ${presentacion}`;
  }

  protected buildGraphqlEndpoint(params: URLSearchParams): string {
    return `${this.baseUrl}/_v/segment/graphql/v1?${params}`;
  }

  protected override async buscarInterno(
    medicamento: string,
    ciudad?: string
  ): Promise<MedicationResult[]> {
    this.log(`Buscando "${medicamento}" con persisted GraphQL...`);

    const pq = this.getPersistedQueryConfig();
    const operationName = pq.operationName ?? "productSearchV3";
    const sender = pq.sender ?? "vtex.store-resources@0.x";
    const provider = pq.provider ?? "vtex.search-graphql@0.x";

    const variables = this.buildSearchVariables(medicamento);
    const variablesB64 = Buffer.from(JSON.stringify(variables)).toString("base64");

    const extensions = JSON.stringify({
      persistedQuery: {
        version: 1,
        sha256Hash: pq.sha256Hash,
        sender,
        provider,
      },
      variables: variablesB64,
    });

    const params = new URLSearchParams({
      workspace: "master",
      maxAge: "short",
      appsEtag: "remove",
      domain: "store",
      locale: "es-CO",
      operationName,
      variables: "{}",
      extensions,
    });

    let productos: GraphQLVtexProduct[];
    try {
      const resp = await fetchJson<GraphQLSearchResponse<GraphQLVtexProduct>>(
        this.buildGraphqlEndpoint(params)
      );
      productos = resp?.data?.productSearch?.products ?? [];
    } catch (err) {
      this.logError("Fallo al consultar GraphQL VTEX", err);
      return [];
    }

    if (productos.length === 0) {
      this.log(`Sin resultados para "${medicamento}"`);
      return [];
    }

    const sede: PharmacyLocation = this.seleccionarSede(ciudad);
    const resultados: MedicationResult[] = [];

    for (const producto of productos) {
      const precio = Math.round(producto.priceRange?.sellingPrice?.lowPrice ?? 0);
      if (precio <= 0) continue;

      const presentacion = this.buildPresentacion(producto);
      const nombre = this.buildNombre(producto, presentacion);

      resultados.push({
        nombre,
        presentacion,
        laboratorio: producto.brand || undefined,
        precio,
        disponible: true,
        farmacia: { ...sede },
        url_producto: this.buildProductUrl(producto.link ?? ""),
        timestamp: this.timestamp(),
      });
    }

    this.log(`Encontrados ${resultados.length} resultados para "${medicamento}"`);
    return resultados;
  }
}
