import { BaseAdapter } from "./base-adapter.js";
import { fetchJson } from "../scrapers/cheerio-scraper.js";
import type { MedicationResult, PharmacyLocation } from "../types/index.js";
import { SEDES_CAFAM_BOGOTA } from "./sedes/cafam-bogota.js";

interface CafamProduct {
  name: string;
  manufacturer_name?: string;
  price_amount: number;
  regular_price_amount?: number;
  url: string;
  active: string;
  reference?: string;
}

interface CafamSearchResponse {
  products: CafamProduct[];
}

export class CafamAdapter extends BaseAdapter {
  readonly id = "cafam";
  readonly nombre = "Droguerías Cafam";
  readonly baseUrl = "https://www.drogueriascafam.com.co";
  protected readonly domain = "drogueriascafam.com.co";

  protected async buscarInterno(medicamento: string): Promise<MedicationResult[]> {
    const url = `${this.baseUrl}/index.php?controller=search&s=${encodeURIComponent(medicamento)}&resultsPerPage=20&ajax=1&json=1`;

    let data: CafamSearchResponse;
    try {
      data = await fetchJson<CafamSearchResponse>(url, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
    } catch (err) {
      this.logError(`Fallo al consultar API Cafam`, err);
      return [];
    }

    const products = data?.products;
    if (!Array.isArray(products) || products.length === 0) {
      this.log(`Sin resultados para "${medicamento}"`);
      return [];
    }

    const sede = this.seleccionarSede();
    const resultados: MedicationResult[] = [];

    for (const p of products) {
      if (p.active !== "1" || p.price_amount <= 0) continue;

      resultados.push({
        nombre: p.name,
        presentacion: p.name,
        laboratorio: p.manufacturer_name || undefined,
        precio: p.price_amount,
        disponible: true,
        farmacia: { ...sede },
        url_producto: p.url,
        timestamp: this.timestamp(),
      });
    }

    this.log(`Encontrados ${resultados.length} resultados para "${medicamento}"`);
    return resultados;
  }

  protected async obtenerSedesInterno(ciudad?: string): Promise<PharmacyLocation[]> {
    if (!ciudad) return SEDES_CAFAM_BOGOTA;
    const key = ciudad.toLowerCase();
    if (key.includes("bogot")) return SEDES_CAFAM_BOGOTA;
    return SEDES_CAFAM_BOGOTA;
  }

  private seleccionarSede(): PharmacyLocation {
    return SEDES_CAFAM_BOGOTA[0];
  }
}
