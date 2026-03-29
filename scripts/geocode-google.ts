/**
 * Re-geocodifica todas las sedes usando Google Maps Geocoding API.
 * Uso: npx tsx scripts/geocode-google.ts
 */

import axios from "axios";
import { writeFileSync } from "fs";
import { SEDES_CRUZ_VERDE_BOGOTA } from "../src/adapters/sedes/cruz-verde-bogota.js";
import { SEDES_FARMATODO_BOGOTA } from "../src/adapters/sedes/farmatodo-bogota.js";
import type { PharmacyLocation } from "../src/types/index.js";

const API_KEY = process.env.GOOGLE_MAPS_KEY ?? "";
const BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

// Bogotá bounding box
const BBOX = { latMin: 4.4, latMax: 4.9, lngMin: -74.3, lngMax: -73.9 };

function enBogota(lat: number, lng: number): boolean {
  return lat >= BBOX.latMin && lat <= BBOX.latMax && lng >= BBOX.lngMin && lng <= BBOX.lngMax;
}

async function geocodificar(direccion: string, nombre: string): Promise<{ lat: number; lng: number } | null> {
  const query = `${direccion}, Bogotá, Colombia`;
  try {
    const resp = await axios.get(BASE_URL, {
      params: { address: query, key: API_KEY, region: "co", language: "es" },
      timeout: 10000,
    });

    const results = resp.data?.results;
    if (!results?.length) return null;

    const loc = results[0].geometry.location;
    const lat = loc.lat as number;
    const lng = loc.lng as number;

    if (!enBogota(lat, lng)) {
      console.log(`  ⚠️  Fuera de Bogotá: ${results[0].formatted_address}`);
      return null;
    }

    return { lat, lng };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ✗ Error: ${msg}`);
    return null;
  }
}

async function procesarSedes(
  sedes: PharmacyLocation[],
  label: string
): Promise<PharmacyLocation[]> {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`${label} — ${sedes.length} sedes`);
  console.log("─".repeat(60));

  const resultado: PharmacyLocation[] = [];
  let ok = 0, fail = 0;

  for (let i = 0; i < sedes.length; i++) {
    const sede = sedes[i];
    process.stdout.write(`[${i + 1}/${sedes.length}] ${sede.nombre}... `);

    const coords = await geocodificar(sede.direccion, sede.nombre);

    if (coords) {
      console.log(`✓ (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`);
      resultado.push({ ...sede, coordenadas: coords });
      ok++;
    } else {
      console.log(`✗ — manteniendo coords anteriores`);
      resultado.push(sede);
      fail++;
    }

    // 50ms entre requests (Google permite hasta 50 rps)
    if (i < sedes.length - 1) await new Promise((r) => setTimeout(r, 50));
  }

  console.log(`\nResultado: ${ok} ✓  ${fail} ✗`);
  return resultado;
}

function generarArchivo(
  sedes: PharmacyLocation[],
  exportName: string,
  comment: string
): string {
  return `import type { PharmacyLocation } from "../../types/index.js";

// ${comment}
// Fuente: sitio oficial (2026-03-28)
// Coordenadas: Google Maps Geocoding API
export const ${exportName}: PharmacyLocation[] = ${JSON.stringify(sedes, null, 2)};
`;
}

async function main() {
  if (!API_KEY) {
    console.error("Falta la API key. Pásala como: GOOGLE_MAPS_KEY=<key> npx tsx scripts/geocode-google.ts");
    process.exit(1);
  }

  console.log("Google Maps Geocoding — Sedes de farmacias en Bogotá");
  console.log(`API Key: ${API_KEY.slice(0, 8)}...`);

  // ── Cruz Verde ──────────────────────────────────────────────────────────────
  const cruzVerdeFinal = await procesarSedes(SEDES_CRUZ_VERDE_BOGOTA, "Cruz Verde Bogotá");
  writeFileSync(
    "./src/adapters/sedes/cruz-verde-bogota.ts",
    generarArchivo(cruzVerdeFinal, "SEDES_CRUZ_VERDE_BOGOTA", "Sedes de Cruz Verde en Bogotá"),
    "utf-8"
  );
  console.log("→ Archivo guardado: src/adapters/sedes/cruz-verde-bogota.ts");

  // ── Farmatodo ───────────────────────────────────────────────────────────────
  const farmatodoFinal = await procesarSedes(SEDES_FARMATODO_BOGOTA, "Farmatodo Bogotá");
  writeFileSync(
    "./src/adapters/sedes/farmatodo-bogota.ts",
    generarArchivo(farmatodoFinal, "SEDES_FARMATODO_BOGOTA", "Sedes de Farmatodo en Bogotá"),
    "utf-8"
  );
  console.log("→ Archivo guardado: src/adapters/sedes/farmatodo-bogota.ts");

  console.log("\n✅ Geocodificación completada. Ejecuta `npm run build` para compilar.");
}

main().catch(console.error);
