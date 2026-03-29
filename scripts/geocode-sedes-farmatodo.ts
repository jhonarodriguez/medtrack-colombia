/**
 * Script para geocodificar las sedes de Farmatodo en Bogotá usando Nominatim.
 * Uso: npx tsx scripts/geocode-sedes-farmatodo.ts
 */

import axios from "axios";
import { writeFileSync } from "fs";

interface SedeRaw { id: string; nombre: string; direccion: string; horario: string; }
interface SedeGeo extends SedeRaw { coordenadas?: { lat: number; lng: number }; }

// 50 sedes extraídas de https://www.farmatodo.com.co/tiendas (Bogotá)
const SEDES_RAW: SedeRaw[] = [
  { id: "farmatodo-bogota-la-calleja", nombre: "Farmatodo La Calleja", direccion: "Av. Cra 19 #127 53, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-autonorte", nombre: "Farmatodo AutoNorte", direccion: "Cra. 45 #104-12, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-centro-internacional", nombre: "Farmatodo Centro Internacional", direccion: "Carrera 13 No 27-08, Bogotá", horario: "Lun-Vie 7:00am-8:00pm, Sáb 8:00am-8:00pm" },
  { id: "farmatodo-bogota-avenida-19", nombre: "Farmatodo Avenida 19", direccion: "Avenida calle 100 # 19-05, Bogotá", horario: "" },
  { id: "farmatodo-bogota-bella-suiza", nombre: "Farmatodo Bella Suiza", direccion: "Carrera 7 #129-39, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-cosmos100", nombre: "Farmatodo Cosmos100", direccion: "Transversal 21 No 98-71, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-plaza-central", nombre: "Farmatodo Plaza Central", direccion: "Carrera 65 # 11-50, Bogotá", horario: "Lun-Dom 9:00am-10:00pm" },
  { id: "farmatodo-bogota-rosales", nombre: "Farmatodo Rosales", direccion: "Diagonal 70A No 4-87, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-calle100", nombre: "Farmatodo Calle 100", direccion: "Carrera 11 Calle 100, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-centro-andino", nombre: "Farmatodo Centro Andino", direccion: "Carrera 11 No 82-71, Bogotá", horario: "" },
  { id: "farmatodo-bogota-normandia", nombre: "Farmatodo Normandia", direccion: "Calle 53 No 72-49, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-colina", nombre: "Farmatodo Colina", direccion: "Av. Boyacá con Calle 138, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-hayuelos", nombre: "Farmatodo Hayuelos", direccion: "Carrera 90 No 23J 22, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-cedritos1", nombre: "Farmatodo Cedritos 1", direccion: "Avenida Carrera 19 No 139-78, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-calle-119", nombre: "Farmatodo Calle 119", direccion: "Calle 119 No 13-15, Bogotá", horario: "" },
  { id: "farmatodo-bogota-cedritos2", nombre: "Farmatodo Cedritos 2", direccion: "Calle 140 # 13-27, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-calle-74", nombre: "Farmatodo Calle 74", direccion: "Calle 74 No 5-09, Bogotá", horario: "" },
  { id: "farmatodo-bogota-calle-170", nombre: "Farmatodo Calle 170", direccion: "Calle 170 # 65-80, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-diverplaza", nombre: "Farmatodo Diverplaza", direccion: "Calle 71B con Carrera 99A, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-ensueno", nombre: "Farmatodo El Ensueño", direccion: "Av Villavicencio transversal 63, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-pasadena", nombre: "Farmatodo Pasadena", direccion: "Carrera 53 #103B-08, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-calle-147", nombre: "Farmatodo Calle 147", direccion: "Avenida Carrera 19 # 146-81, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-santa-isabel", nombre: "Farmatodo Santa Isabel", direccion: "Carrera 30 No 2B 17, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-gran-estacion", nombre: "Farmatodo Gran Estación", direccion: "Calle 26 No 52A 15, Bogotá", horario: "Lun-Sáb 8:00am-10:00pm" },
  { id: "farmatodo-bogota-salitre", nombre: "Farmatodo Salitre", direccion: "Avenida Calle 24 #59-60, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-parque-93", nombre: "Farmatodo Parque 93", direccion: "Calle 93A # 12-73, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-cc-santa-fe", nombre: "Farmatodo CC Santa Fe", direccion: "Calle 185 No 45-03, Bogotá", horario: "Lun-Sáb 9:00am-10:00pm" },
  { id: "farmatodo-bogota-country", nombre: "Farmatodo Country", direccion: "Carrera 15 No 94-72, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-connecta", nombre: "Farmatodo Connecta", direccion: "Av. Calle 26 #92-32, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-unicentro", nombre: "Farmatodo Unicentro", direccion: "Avenida 15 No 123-30, Bogotá", horario: "Lun-Sáb 8:00am-11:00pm" },
  { id: "farmatodo-bogota-usaquen", nombre: "Farmatodo Usaquén", direccion: "Carrera 7 No 116-50, Bogotá", horario: "" },
  { id: "farmatodo-bogota-rincon-del-chico", nombre: "Farmatodo Rincón del Chico", direccion: "Calle 106 #15-26, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-la-cabrera", nombre: "Farmatodo La Cabrera", direccion: "Carrera 9 # 82-19, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-carrera-16", nombre: "Farmatodo Carrera 16", direccion: "Carrera 16 # 82-52, Bogotá", horario: "Lun-Dom 9:00am-9:00pm" },
  { id: "farmatodo-bogota-navarra", nombre: "Farmatodo Navarra", direccion: "Av Cra 19 No 103-98, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-pepe-sierra", nombre: "Farmatodo Pepe Sierra", direccion: "Calle 116 No 18B-43, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-mazuren", nombre: "Farmatodo Mazurén", direccion: "Av Carrera 45 # 147A 31, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-salitre2", nombre: "Farmatodo Salitre 2", direccion: "Carrera 68B No 24a-30, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-calle-127", nombre: "Farmatodo Calle 127", direccion: "Calle 127 No 17A-27, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-atlantis", nombre: "Farmatodo Atlantis", direccion: "Calle 81 N 13-05, Bogotá", horario: "Lun-Sáb 8:00am-9:00pm" },
  { id: "farmatodo-bogota-nogal", nombre: "Farmatodo Nogal", direccion: "Calle 73 No 11-12, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-centro-mayor", nombre: "Farmatodo Centro Mayor", direccion: "Av Carrera 27 No 38A-01 Sur, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-titan", nombre: "Farmatodo Titán", direccion: "Carrera 72 80-94, Bogotá", horario: "Lun-Dom 9:00am-10:00pm" },
  { id: "farmatodo-bogota-campanella", nombre: "Farmatodo Campanella", direccion: "Calle 154A No 94-91, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-galerias", nombre: "Farmatodo Galerías", direccion: "Calle 53 No 20-11, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-britalia-norte", nombre: "Farmatodo Britalia Norte", direccion: "Calle 167 No 73-02, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-nieves", nombre: "Farmatodo Nieves", direccion: "Carrera 7 No 21-43, Bogotá", horario: "Lun-Vie 6:30am-8:00pm" },
  { id: "farmatodo-bogota-belmira", nombre: "Farmatodo Belmira", direccion: "Carrera 9 #139-88, Bogotá", horario: "Abierto 24 horas" },
  { id: "farmatodo-bogota-carrera-13", nombre: "Farmatodo Carrera 13", direccion: "Carrera 13 No 55-61, Bogotá", horario: "" },
];

function normalizarDireccion(dir: string): string {
  return dir.replace(/Local\s+[\w\s-]+/gi, "").replace(/\s+/g, " ").trim();
}

async function geocodificar(sede: SedeRaw): Promise<SedeGeo> {
  const query = normalizarDireccion(sede.direccion);
  try {
    const resp = await axios.get<Array<{ lat: string; lon: string }>>(
      "https://nominatim.openstreetmap.org/search",
      {
        params: { q: query, format: "json", limit: 1, countrycodes: "co" },
        headers: { "User-Agent": "mcp-medicamentos-colombia/1.0", "Accept-Language": "es" },
        timeout: 10000,
      }
    );
    if (resp.data.length > 0) {
      const lat = parseFloat(resp.data[0].lat);
      const lng = parseFloat(resp.data[0].lon);
      // Validar que esté en Bogotá (bbox aprox)
      if (lat >= 4.4 && lat <= 4.9 && lng >= -74.3 && lng <= -73.9) {
        return { ...sede, coordenadas: { lat, lng } };
      }
    }
  } catch {}
  return sede;
}

async function main() {
  console.log(`Geocodificando ${SEDES_RAW.length} sedes de Farmatodo en Bogotá...\n`);
  const results: SedeGeo[] = [];
  let ok = 0, fail = 0;

  for (let i = 0; i < SEDES_RAW.length; i++) {
    const sede = SEDES_RAW[i];
    process.stdout.write(`[${i + 1}/${SEDES_RAW.length}] ${sede.nombre}... `);
    const result = await geocodificar(sede);
    results.push(result);
    if (result.coordenadas) { console.log(`✓ (${result.coordenadas.lat.toFixed(4)}, ${result.coordenadas.lng.toFixed(4)})`); ok++; }
    else { console.log(`✗`); fail++; }
    if (i < SEDES_RAW.length - 1) await new Promise(r => setTimeout(r, 1100));
  }

  console.log(`\nResultado: ${ok} ✓  ${fail} ✗\n`);

  const ts = `import type { PharmacyLocation } from "../../types/index.js";

// Sedes de Farmatodo en Bogotá
// Fuente: https://www.farmatodo.com.co/tiendas (${new Date().toISOString().split("T")[0]})
// Coordenadas: Nominatim / OpenStreetMap
export const SEDES_FARMATODO_BOGOTA: PharmacyLocation[] = ${JSON.stringify(
    results.map(s => ({
      id: s.id,
      nombre: s.nombre,
      direccion: s.direccion,
      ciudad: "Bogotá",
      horario: s.horario,
      ...(s.coordenadas ? { coordenadas: s.coordenadas } : {}),
    })),
    null, 2
  )};
`;

  const outPath = new URL("../src/adapters/sedes/farmatodo-bogota.ts", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
  writeFileSync(outPath, ts, "utf-8");
  console.log(`Archivo generado: src/adapters/sedes/farmatodo-bogota.ts`);
}

main().catch(console.error);
