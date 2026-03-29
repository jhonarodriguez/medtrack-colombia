import axios from "axios";
import { cacheService, TTL } from "./cache.service.js";
import { geocodificarConGoogle } from "./google-maps.service.js";
import type { Coordenadas } from "../types/index.js";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  type: string;
}

// ─── Geocodificación via Nominatim (OSM) ──────────────────────────────────────

/**
 * Geocodifica el nombre de una ciudad colombiana a coordenadas GPS.
 * Usa Nominatim (OpenStreetMap) — gratuito, sin API key.
 * Respeta el límite de 1 req/segundo de la ToS de Nominatim.
 * Resultados cacheados 7 días.
 */
export async function geocodificarCiudad(ciudad: string): Promise<Coordenadas | null> {
  const key = `geo:ciudad:${ciudad.toLowerCase().trim()}`;
  const cached = cacheService.get<Coordenadas | null>(key);
  if (cached !== undefined) return cached;

  try {
    const resp = await axios.get<NominatimResult[]>(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: `${ciudad}, Colombia`,
          format: "json",
          limit: 3,
          countrycodes: "co",
          featuretype: "city",
        },
        headers: {
          "User-Agent": "mcp-medicamentos-colombia/1.0 (github.com/medicamentos-colombia)",
          "Accept-Language": "es",
        },
        timeout: 8000,
      }
    );

    if (!Array.isArray(resp.data) || resp.data.length === 0) {
      cacheService.set<Coordenadas | null>(key, null, 3600);
      return null;
    }
    
    const mejor =
      resp.data.find((r) => r.type === "city" || r.type === "administrative") ??
      resp.data[0];

    const coordenadas: Coordenadas = {
      lat: parseFloat(mejor.lat),
      lng: parseFloat(mejor.lon),
    };

    cacheService.set(key, coordenadas, TTL.GEO);
    return coordenadas;
  } catch {
    return null;
  }
}

/**
 * Geocodifica una ubicación flexible (dirección/barrio/localidad/ciudad).
 * Intenta primero Google Maps (si API key está configurada), luego fallback a Nominatim.
 * Soporta: dirección + ciudad, barrio + ciudad, localidad + ciudad, solo ciudad.
 * Resultados cacheados 7 días.
 * Retorna {lat, lng} o null si no se puede geocodificar.
 */
export async function geocodificarUbicacion(ubicacion: {
  direccion?: string;
  barrio?: string;
  localidad?: string;
  ciudad?: string;
}): Promise<Coordenadas | null> {
  
  let resultado = await geocodificarConGoogle(ubicacion);
  if (resultado) {
    return resultado;
  }
  
  return await geocodificarConNominatim(ubicacion);
}

/**
 * Geocodifica con Nominatim (OpenStreetMap).
 * Fallback cuando Google no está disponible o falla.
 */
async function geocodificarConNominatim(ubicacion: {
  direccion?: string;
  barrio?: string;
  localidad?: string;
  ciudad?: string;
}): Promise<Coordenadas | null> {
  const { direccion, barrio, localidad, ciudad } = ubicacion;
  
  let query: string | null = null;

  if (direccion && ciudad) {
    query = `${direccion}, ${barrio || localidad || ciudad}, Colombia`;
  } else if (barrio && ciudad) {
    query = `${barrio}, ${ciudad}, Colombia`;
  } else if (localidad && ciudad) {
    query = `${localidad}, ${ciudad}, Colombia`;
  } else if (ciudad) {
    return geocodificarCiudad(ciudad);
  }

  if (!query) return null;

  const cacheKey = `geo:nominatim:${query.toLowerCase().trim()}`;
  const cached = cacheService.get<Coordenadas | null>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const resp = await axios.get<NominatimResult[]>(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: query,
          format: "json",
          limit: 1,
          countrycodes: "co",
        },
        headers: {
          "User-Agent": "mcp-medicamentos-colombia/1.0 (github.com/medicamentos-colombia)",
          "Accept-Language": "es",
        },
        timeout: 8000,
      }
    );

    if (!Array.isArray(resp.data) || resp.data.length === 0) {
      cacheService.set<Coordenadas | null>(cacheKey, null, 3600);
      if (ciudad) return geocodificarCiudad(ciudad);
      return null;
    }

    const coordenadas: Coordenadas = {
      lat: parseFloat(resp.data[0].lat),
      lng: parseFloat(resp.data[0].lon),
    };

    cacheService.set(cacheKey, coordenadas, TTL.GEO);
    return coordenadas;
  } catch {
    if (ciudad) return geocodificarCiudad(ciudad);
    return null;
  }
}

/**
 * Calcula la distancia en km entre dos puntos usando la fórmula de Haversine.
 * Retorna valor redondeado a 1 decimal.
 */
export function calcularDistanciaKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}
