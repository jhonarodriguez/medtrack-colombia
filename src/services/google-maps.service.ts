import axios from "axios";
import { cacheService, TTL } from "./cache.service.js";
import type { Coordenadas } from "../types/index.js";

interface GoogleGeocodeResult {
    results: Array<{
        geometry: {
            location: {
                lat: number;
                lng: number;
            };
            bounds?: {
                northeast: { lat: number; lng: number };
                southwest: { lat: number; lng: number };
            };
        };
        formatted_address: string;
        address_components: Array<{
            long_name: string;
            short_name: string;
            types: string[];
        }>;
    }>;
    status: "OK" | "ZERO_RESULTS" | "OVER_QUERY_LIMIT" | "REQUEST_DENIED" | "INVALID_REQUEST" | "UNKNOWN_ERROR";
}

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Geocodifica una ubicación flexible usando Google Maps Geocoding API.
 * Soporta: dirección completa, barrio, localidad, ciudad.
 * Resultados cacheados 7 días.
 * Retorna {lat, lng} o null si Google no está disponible o falla.
 */
export async function geocodificarConGoogle(ubicacion: {
    direccion?: string;
    barrio?: string;
    localidad?: string;
    ciudad?: string;
}): Promise<Coordenadas | null> {
    process.stderr.write(`Intentando geocodificar con Google: ${JSON.stringify(ubicacion)}... con GOOGLE_API_KEY: ${GOOGLE_API_KEY}\n `);
    if (!GOOGLE_API_KEY) {
        return null;
    }

    const { direccion, barrio, localidad, ciudad } = ubicacion;

    let query: string | null = null;

    const partesRaw = [direccion, barrio, localidad, ciudad]
        .map((v) => v?.trim())
        .filter((v): v is string => Boolean(v && v.length > 0));

    if (partesRaw.length === 0) {
        return null;
    }
    
    const partesUnicas = partesRaw.filter(
        (valor, idx, arr) =>
            arr.findIndex((x) => x.toLowerCase() === valor.toLowerCase()) === idx
    );

    query = `${partesUnicas.join(", ")}, Colombia`;

    process.stderr.write(`Consulta de geocodificación a Google: "${query}"\n`);

    const cacheKey = `geo:google:${query.toLowerCase().trim()}`;
    process.stderr.write(`Cache key para Google geocoding: ${cacheKey}\n`);
    const cached = cacheService.get<Coordenadas | null>(cacheKey);
    process.stderr.write(`Resultado cache para Google geocoding: ${cached ? JSON.stringify(cached) : "null"}\n`);
    if (cached !== undefined) return cached;

    try {
        const response = await axios.get<GoogleGeocodeResult>(
            "https://maps.googleapis.com/maps/api/geocode/json",
            {
                params: {
                    address: query,
                    key: GOOGLE_API_KEY,
                    region: "co",
                    language: "es",
                },
                timeout: 8000,
            }
        );

        process.stderr.write(`Respuesta de Google geocoding: status=${response.data.status}, results=${response.data.results.length}\n`);

        if (response.data.status !== "OK" || response.data.results.length === 0) {
            cacheService.set<Coordenadas | null>(cacheKey, null, 3600);
            return null;
        }
        process.stderr.write(`Ubicación encontrada: ${JSON.stringify(response.data.results[0].geometry.location)}\n`);
        const location = response.data.results[0].geometry.location;

        if (!isInColombia(location.lat, location.lng)) {
            cacheService.set<Coordenadas | null>(cacheKey, null, 3600);
            return null;
        }

        const coordenadas: Coordenadas = {
            lat: location.lat,
            lng: location.lng,
        };

        process.stderr.write(`Coordenadas geocodificadas con Google: ${JSON.stringify(coordenadas)}\n`);

        cacheService.set(cacheKey, coordenadas, TTL.GEO);
        return coordenadas;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            cacheService.set<Coordenadas | null>(cacheKey, null, 60);
        }
        return null;
    }
}

/**
 * Valida que las coordenadas estén dentro de los límites de Colombia.
 * Colombia: roughly -4.5 a 13.5 latitud, -82 a -66 longitud.
 */
function isInColombia(lat: number, lng: number): boolean {
    const LAT_MIN = -4.5;
    const LAT_MAX = 13.5;
    const LNG_MIN = -82;
    const LNG_MAX = -66;

    return lat >= LAT_MIN && lat <= LAT_MAX && lng >= LNG_MIN && lng <= LNG_MAX;
}

/**
 * Revierte coordenadas a dirección.
 * Útil para validar resultados o mostrar dirección leíble al usuario.
 */
export async function reverseGeocodeConGoogle(
    lat: number,
    lng: number
): Promise<string | null> {
    if (!GOOGLE_API_KEY) {
        return null;
    }

    const cacheKey = `geo:reverse:${lat.toFixed(4)}:${lng.toFixed(4)}`;
    const cached = cacheService.get<string | null>(cacheKey);
    if (cached !== undefined) return cached;

    try {
        const response = await axios.get<GoogleGeocodeResult>(
            "https://maps.googleapis.com/maps/api/geocode/json",
            {
                params: {
                    latlng: `${lat},${lng}`,
                    key: GOOGLE_API_KEY,
                    language: "es",
                },
                timeout: 8000,
            }
        );

        if (response.data.status !== "OK" || response.data.results.length === 0) {
            cacheService.set<string | null>(cacheKey, null, 3600);
            return null;
        }

        const address = response.data.results[0].formatted_address;
        cacheService.set(cacheKey, address, TTL.GEO);
        return address;
    } catch {
        return null;
    }
}
