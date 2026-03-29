
export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface PharmacyLocation {
  nombre: string;
  id: string;
  direccion?: string;
  ciudad?: string;
  coordenadas?: { lat: number; lng: number };
  distancia_km?: number;
  telefono?: string;
  horario?: string;
}

export interface MedicationResult {
  nombre: string;
  nombreGenerico?: string;
  presentacion: string;
  laboratorio?: string;
  precio: number;
  disponible: boolean;
  farmacia: PharmacyLocation;
  url_producto?: string;
  timestamp: string;
  cum?: string;
}

export interface SearchResult {
  medicamento_buscado: string;
  total_resultados: number;
  farmacias_consultadas: string[];
  farmacias_sin_respuesta: string[];
  resultados: MedicationResult[];
  timestamp: string;
}

export interface InvimaRecord {
  cum: string;
  nombre_comercial: string;
  nombre_generico: string;
  laboratorio: string;
  registro_sanitario: string;
  estado_registro: string;
  principio_activo: string;
  concentracion: string;
  forma_farmaceutica: string;
  via_administracion: string;
  precio_regulado_sismed?: number;
}

export interface NearbyPharmacy {
  farmacia_id: string;
  farmacia_nombre: string;
  sede_nombre?: string;
  direccion: string;
  ciudad: string;
  coordenadas: { lat: number; lng: number };
  distancia_km: number;
  telefono?: string;
  horario?: string;
  medicamento?: {
    disponible: boolean;
    precio?: number;
    presentacion?: string;
  };
}

export interface PharmacyAdapter {
  readonly id: string;
  readonly nombre: string;
  readonly baseUrl: string;

  /**
   * Busca un medicamento por nombre en esta farmacia.
   * Retorna array vacío si no encuentra resultados.
   * Lanza error solo si hay un fallo técnico irrecuperable.
   */
  buscar(medicamento: string, ciudad?: string): Promise<MedicationResult[]>;

  /**
   * Retorna las sedes conocidas de esta farmacia (para cálculo de distancia).
   */
  obtenerSedes(ciudad?: string): Promise<PharmacyLocation[]>;
}

export interface GeoInputLocation {
  ciudad?: string;
  direccion?: string;
  barrio?: string;
  localidad?: string;
}

export interface BusquedaOpciones extends GeoInputLocation {
  latitud?: number;
  longitud?: number;
  radio_km?: number;
  max_resultados?: number;
  incluir_genericos?: boolean;
  farmacias?: string[];
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface ServerConfig {
  playwrightTimeout: number;
  httpTimeout: number;
  maxConcurrentPerPharmacy: number;
  requestDelayMs: number;
  cachePricesTtl: number;
  cacheInvimaTtl: number;
  cacheGeoTtl: number;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  transport: 'stdio' | 'http';
  port: number;
}

export interface McpError {
  codigo: string;
  mensaje: string;
  sugerencia?: string;
}

export type FormatoRespuesta = "json" | "markdown" | "compact";

export interface ResultadoAgrupado {
  nombre: string;
  presentacion: string;
  laboratorio?: string;
  precio_min: number;
  precio_max: number;
  cadena: string;
  cadena_id: string;
  num_sedes: number;
  distancia_min_km?: number;
  url_producto?: string;
  confianza: number;
  stock_disponible: boolean;
  ultima_actualizacion: string;
  sede_cercana?: {
    nombre: string;
    direccion?: string;
    coordenadas?: { lat: number; lng: number };
    horario?: string;
    distancia_km: number;
  };
}

export interface SearchResultAgrupado {
  medicamento_buscado: string;
  total_variantes: number;
  total_sedes: number;
  farmacias_consultadas: string[];
  farmacias_sin_respuesta: string[];
  resultados: ResultadoAgrupado[];
  timestamp: string;
}
