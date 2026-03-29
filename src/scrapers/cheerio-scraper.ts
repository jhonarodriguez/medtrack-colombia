import axios, { type AxiosRequestConfig } from "axios";
import * as cheerio from "cheerio";

const TIMEOUT = parseInt(process.env.HTTP_TIMEOUT ?? "10000");

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; mcp-medicamentos-colombia/0.1; +https://github.com/mcp-medicamentos-colombia)",
  "Accept-Language": "es-CO,es;q=0.9",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

export type CheerioRoot = ReturnType<typeof cheerio.load>;

const httpClient = axios.create({
  timeout: TIMEOUT,
  headers: DEFAULT_HEADERS,
});

/**
 * Descarga HTML de una URL y retorna un root de Cheerio listo para parsear.
 */
export async function fetchHtml(
  url: string,
  config?: AxiosRequestConfig
): Promise<CheerioRoot> {
  const response = await httpClient.get<string>(url, {
    ...config,
    responseType: "text",
  });
  return cheerio.load(response.data);
}

/**
 * Hace una petición GET y retorna el JSON parseado.
 * Útil para APIs REST de farmacias (VTEX, etc.).
 */
export async function fetchJson<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await httpClient.get<T>(url, {
    ...config,
    headers: {
      ...DEFAULT_HEADERS,
      Accept: "application/json",
      ...config?.headers,
    },
  });
  return response.data;
}

/**
 * Normaliza un texto de precio colombiano a número entero COP.
 * Ejemplos: "$9.400", "9,400.00", "9400" → 9400
 */
export function parsePrecioCOP(texto: string): number {
  const limpio = texto
    .replace(/[^\d.,]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const num = parseFloat(limpio);
  return isNaN(num) ? 0 : Math.round(num);
}
