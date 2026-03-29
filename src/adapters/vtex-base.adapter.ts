import { BaseAdapter } from "./base-adapter.js";
import { fetchJson } from "../scrapers/cheerio-scraper.js";
import type { MedicationResult, PharmacyLocation } from "../types/index.js";

export interface VtexCommertialOffer {
  Price: number;
  ListPrice?: number;
  IsAvailable: boolean;
  AvailableQuantity: number;
}

export interface VtexSeller {
  sellerId?: string;
  sellerDefault: boolean;
  commertialOffer: VtexCommertialOffer;
}

export interface VtexItem {
  itemId?: string;
  name: string;
  nameComplete: string;
  complementName: string;
  ean?: string;
  measurementUnit?: string;
  sellers: VtexSeller[];
}

export interface VtexProduct {
  productId?: string;
  productName: string;
  brand: string;
  link: string;
  description?: string;
  categories: string[];
  items: VtexItem[];
}

/**
 * Template Method pattern: consolidar búsqueda VTEX para La Rebaja, Locatel, Colsubsidio.
 * Cada subclass implementa:
 * - getCategoryFilter(): palabras clave para filtrar medicamentos
 * - getSedesPerCity(): mapa de sedes por ciudad
 * - buildProductUrl(link): construcción específica de URL
 */
export abstract class VtexBaseAdapter extends BaseAdapter {
    
  protected abstract readonly apiBase: string;
  
  protected abstract getCategoryFilter(): string[];
  
  protected abstract getSedesPerCity(): Record<string, PharmacyLocation[]>;
  
  protected buildProductUrl(link: string): string {
    return `${this.baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;
  }

  protected async buscarInterno(
    medicamento: string,
    ciudad?: string
  ): Promise<MedicationResult[]> {
    this.log(`Buscando "${medicamento}"${ciudad ? ` en ${ciudad}` : ""}...`);

    let productos: VtexProduct[];
    try {
      productos = await fetchJson<VtexProduct[]>(
        `${this.apiBase}?q=${encodeURIComponent(medicamento)}&_from=0&_to=19`
      );
    } catch (err) {
      this.logError(`Fallo al consultar API VTEX`, err);
      return [];
    }

    if (!Array.isArray(productos) || productos.length === 0) {
      this.log(`Sin resultados para "${medicamento}"`);
      return [];
    }

    const productosFiltrados = productos.filter((p) =>
      this.esMedicamento(p.categories)
    );

    if (productosFiltrados.length === 0) {
      this.log(`Sin resultados de medicamentos para "${medicamento}"`);
      return [];
    }

    const sede = this.seleccionarSede(ciudad);
    const resultados: MedicationResult[] = [];

    for (const producto of productosFiltrados) {
      const item = producto.items?.[0];
      if (!item) continue;

      const oferta = this.extraerOferta(item);
      if (!oferta || oferta.Price <= 0) continue;

      resultados.push({
        nombre: producto.productName,
        presentacion: item.complementName || item.nameComplete || item.name,
        laboratorio: producto.brand || undefined,
        precio: Math.round(oferta.Price),
        disponible: oferta.IsAvailable && oferta.AvailableQuantity > 0,
        farmacia: { ...sede },
        url_producto: this.buildProductUrl(producto.link),
        timestamp: this.timestamp(),
      });
    }

    this.log(`Encontrados ${resultados.length} resultados para "${medicamento}"`);
    return resultados;
  }

  protected async obtenerSedesInterno(ciudad?: string): Promise<PharmacyLocation[]> {
    const sedesPorCiudad = this.getSedesPerCity();

    if (!ciudad) {
      return Object.values(sedesPorCiudad).flat();
    }

    const key = ciudad.toLowerCase();
    const sedes = sedesPorCiudad[key];

    if (sedes) return sedes;
    
    for (const [k, v] of Object.entries(sedesPorCiudad)) {
      if (k.includes(key) || key.includes(k)) return v;
    }

    return [];
  }
  

  /** Determina si una lista de categorías corresponde a medicamentos/farmacia */
  private esMedicamento(categorias: string[]): boolean {
    if (!categorias?.length) return true;
    const texto = categorias.join(" ").toLowerCase();
    const filtro = this.getCategoryFilter();
    return filtro.some((keyword) => texto.includes(keyword.toLowerCase()));
  }

  /** Extrae la comercial offer del primer seller disponible */
  protected extraerOferta(item: VtexItem): VtexCommertialOffer | null {
    const seller =
      item.sellers?.find((s) => s.sellerDefault) ?? item.sellers?.[0];
    return seller?.commertialOffer ?? null;
  }

  /** Selecciona la sede por ciudad, fallback a primera disponible */
  protected seleccionarSede(ciudad?: string): PharmacyLocation {
    const sedesPorCiudad = this.getSedesPerCity();
    const todasLasSedes = Object.values(sedesPorCiudad).flat();

    if (!todasLasSedes.length) {
      throw new Error(`${this.id}: No hay sedes configuradas`);
    }

    if (!ciudad) return todasLasSedes[0];

    const searchKey = ciudad.toLowerCase();
    const match = todasLasSedes.find(
      (s) => s.ciudad?.toLowerCase() === searchKey
    );
    return match ?? todasLasSedes[0];
  }
}
