import { VtexBaseAdapter } from "./vtex-base.adapter.js";
import type { PharmacyLocation } from "../types/index.js";
import { SEDES_LOCATEL_BOGOTA } from "./sedes/locatel-bogota.js";

/**
 * Locatel - Adaptador VTEX
 * 
 * Extiende VtexBaseAdapter con configuración específica:
 * - API: https://locatelcolombia.myvtex.com/api/catalog_system...
 * - Filtro: busca "droguería" en categorías
 * - Sedes: hardcodeadas localmente
 * - URL: construye como ${baseUrl}${link...}
 */
export class LocatelAdapter extends VtexBaseAdapter {
  readonly id = "locatel";
  readonly nombre = "Locatel";
  readonly baseUrl = "https://www.locatelcolombia.com";
  protected readonly domain = "locatelcolombia.myvtex.com";

  protected readonly apiBase =
    "https://locatelcolombia.myvtex.com/api/catalog_system/pub/products/search";

  protected getCategoryFilter(): string[] {
    return [
      "drogueria", "droguería", "medicamento", "farmacia", "salud",
    ];
  }

  protected getSedesPerCity(): Record<string, PharmacyLocation[]> {
    return {
      bogotá: SEDES_LOCATEL_BOGOTA,
    };
  }

  protected buildProductUrl(link: string): string {
    return `${this.baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;
  }
}
