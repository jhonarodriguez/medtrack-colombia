import { BaseAdapter } from "./base-adapter.js";
import axios, { type AxiosInstance } from "axios";
import type { MedicationResult, PharmacyLocation } from "../types/index.js";
import { SEDES_CRUZ_VERDE_BOGOTA } from "./sedes/cruz-verde-bogota.js";

interface CruzVerdePrice {
  "price-list-col"?: number;
  "price-sale-col"?: number;
}

interface CruzVerdeHit {
  productId: string;
  productName: string;
  brand: string;
  prices: CruzVerdePrice;
  stock: number;
  storePickup: boolean;
  homeDelivery: boolean;
  pageURL: string;
}

interface CruzVerdeSearchResponse {
  total: number;
  count: number;
  hits: CruzVerdeHit[];
}

const SEDES_POR_CIUDAD: Record<string, PharmacyLocation[]> = {
  bogotá: SEDES_CRUZ_VERDE_BOGOTA,
};

export class CruzVerdeAdapter extends BaseAdapter {
  readonly id = "cruz-verde";
  readonly nombre = "Cruz Verde";
  readonly baseUrl = "https://www.cruzverde.com.co";
  protected readonly domain = "cruzverde.com.co";

  private readonly apiBase = "https://api.cruzverde.com.co";
  private sessionCookie: string | null = null;
  private sessionObtainedAt = 0;
  private readonly SESSION_TTL_MS = 25 * 60 * 1000; // 25 minutos

  protected async buscarInterno(
    medicamento: string,
    ciudad?: string
  ): Promise<MedicationResult[]> {
    this.log(`Buscando "${medicamento}"${ciudad ? ` en ${ciudad}` : ""}...`);

    const cookie = await this.obtenerSesion();
    if (!cookie) return [];

    let hits: CruzVerdeHit[];
    try {
      const res = await axios.get<CruzVerdeSearchResponse>(
        `${this.apiBase}/product-service/products/search`,
        {
          params: { q: medicamento, count: 20 },
          headers: { Cookie: cookie },
          timeout: 12000,
        }
      );
      hits = res.data?.hits ?? [];
    } catch (err) {
      if (axios.isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403)) {
        this.sessionCookie = null;
        const newCookie = await this.obtenerSesion();
        if (!newCookie) return [];
        try {
          const res = await axios.get<CruzVerdeSearchResponse>(
            `${this.apiBase}/product-service/products/search`,
            { params: { q: medicamento, count: 20 }, headers: { Cookie: newCookie }, timeout: 12000 }
          );
          hits = res.data?.hits ?? [];
        } catch {
          return [];
        }
      } else {
        this.logError("Fallo al buscar en Cruz Verde", err);
        return [];
      }
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
        nombre: hit.productName,
        nombreGenerico: undefined,
        presentacion: hit.productName,
        laboratorio: hit.brand ?? undefined,
        precio,
        disponible: hit.homeDelivery || hit.storePickup,
        farmacia: { ...sede },
        url_producto: hit.pageURL
          ? `${this.baseUrl}/${hit.pageURL}/${hit.productId}.html`
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

  private async obtenerSesion(): Promise<string | null> {
    const ahora = Date.now();
    if (this.sessionCookie && ahora - this.sessionObtainedAt < this.SESSION_TTL_MS) {
      return this.sessionCookie;
    }

    try {
      const res = await axios.post(
        `${this.apiBase}/customer-service/login`,
        { authType: "guest" },
        { headers: { "Content-Type": "application/json" }, timeout: 10000 }
      );
      const setCookie = res.headers["set-cookie"]?.[0];
      if (!setCookie) throw new Error("No se recibió cookie de sesión");
      this.sessionCookie = setCookie.split(";")[0];
      this.sessionObtainedAt = ahora;
      return this.sessionCookie;
    } catch (err) {
      this.logError("Fallo al obtener sesión de Cruz Verde", err);
      return null;
    }
  }

  private extraerPrecio(hit: CruzVerdeHit): number {
    const salePrice = hit.prices?.["price-sale-col"];
    const listPrice = hit.prices?.["price-list-col"];
    if (salePrice && salePrice > 0) return salePrice;
    if (listPrice && listPrice > 0) return listPrice;
    return 0;
  }

  private seleccionarSede(ciudad?: string): PharmacyLocation {
    if (ciudad) {
      const sedes = SEDES_POR_CIUDAD[ciudad.toLowerCase()];
      if (sedes?.length) return sedes[0];
    }
    return SEDES_CRUZ_VERDE_BOGOTA[0];
  }
}
