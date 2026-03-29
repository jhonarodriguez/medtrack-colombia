import { VtexGraphqlBaseAdapter } from "./vtex-graphql-base.adapter.js";
import type { PharmacyLocation } from "../types/index.js";
import { SEDES_LA_REBAJA_BOGOTA } from "./sedes/la-rebaja-bogota.js";

/**
 * La Rebaja - Adaptador VTEX GraphQL persisted query
 *
 * Reutiliza VtexGraphqlBaseAdapter para evitar duplicar la lógica
 * de construcción de variables/extensiones y mapeo de productos.
 * - Sedes: se importan de archivo
 */
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

  protected getPersistedQueryConfig(): { sha256Hash: string } {
    return {
      sha256Hash: "069177eb2c038ccb948b55ca406e13189adcb5addcb00c25a8400450d20e0108",
    };
  }
}
