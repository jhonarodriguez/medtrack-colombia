/**
 * Busca todas las sedes de Locatel en Bogotá usando Google Maps Places API (New).
 * Uso: GOOGLE_MAPS_KEY=<key> npx tsx scripts/fetch-locatel.ts
 */
import axios from "axios";
import { writeFileSync } from "fs";

const KEY = process.env.GOOGLE_MAPS_KEY ?? "";
const BOGOTA_BBOX = { latMin: 4.4, latMax: 4.9, lngMin: -74.3, lngMax: -73.9 };

function enBogota(lat: number, lng: number) {
  return lat >= BOGOTA_BBOX.latMin && lat <= BOGOTA_BBOX.latMax
    && lng >= BOGOTA_BBOX.lngMin && lng <= BOGOTA_BBOX.lngMax;
}

async function searchText(query: string, pageToken?: string) {
  const body: Record<string, unknown> = {
    textQuery: query,
    languageCode: "es",
    pageSize: 20,
    locationBias: {
      rectangle: {
        low: { latitude: 4.4, longitude: -74.3 },
        high: { latitude: 4.9, longitude: -73.9 },
      },
    },
  };
  if (pageToken) body.pageToken = pageToken;

  const resp = await axios.post(
    "https://places.googleapis.com/v1/places:searchText",
    body,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": KEY,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.id,nextPageToken",
      },
      timeout: 12000,
    }
  );
  return resp.data;
}

async function main() {
  if (!KEY) { console.error("Falta GOOGLE_MAPS_KEY"); process.exit(1); }

  const sedes: { nombre: string; direccion: string; lat: number; lng: number }[] = [];
  const seenIds = new Set<string>();

  const queries = [
    "Locatel Bogotá",
    "Droguería Locatel Bogotá",
  ];

  for (const query of queries) {
    console.log(`\nBuscando: "${query}"`);
    let pageToken: string | undefined;

    do {
      if (pageToken) await new Promise(r => setTimeout(r, 1500));
      const data = await searchText(query, pageToken);

      for (const p of data.places ?? []) {
        if (seenIds.has(p.id)) continue;
        const lat = p.location?.latitude as number;
        const lng = p.location?.longitude as number;

        if (!enBogota(lat, lng)) {
          console.log(`  ⚠ Fuera de Bogotá: ${p.displayName?.text}`);
          continue;
        }
        if (!/locatel/i.test(p.displayName?.text ?? "")) continue;

        seenIds.add(p.id);
        const dir = (p.formattedAddress as string)
          .replace(/,?\s*(Bogotá|Cundinamarca|Colombia).*$/i, "").trim();

        sedes.push({ nombre: p.displayName?.text, direccion: dir, lat, lng });
        console.log(`  ✓ ${p.displayName?.text} | ${dir}`);
      }

      pageToken = data.nextPageToken;
    } while (pageToken);
  }

  console.log(`\nTotal: ${sedes.length} sedes Locatel en Bogotá`);

  const entries = sedes.map((s, i) =>
    `  { id: "locatel-bogota-${i + 1}", nombre: "${s.nombre.replace(/"/g, "'")}",\n    direccion: "${s.direccion.replace(/"/g, "'")}",\n    ciudad: "Bogotá", horario: "",\n    coordenadas: { lat: ${s.lat}, lng: ${s.lng} } }`
  );

  const ts = `import type { PharmacyLocation } from "../../types/index.js";

// Sedes de Locatel en Bogotá
// Fuente: Google Maps Places API (2026-03-29)
export const SEDES_LOCATEL_BOGOTA: PharmacyLocation[] = [
${entries.join(",\n")}
];
`;

  writeFileSync("./src/adapters/sedes/locatel-bogota.ts", ts, "utf-8");
  console.log("→ Guardado: src/adapters/sedes/locatel-bogota.ts");
}

main().catch(console.error);
