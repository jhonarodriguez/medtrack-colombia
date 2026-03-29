/**
 * Diagnóstico: muestra qué devuelve cada API de farmacia para una query.
 * Uso: npx tsx scripts/test-apis.ts "advil children"
 */
import axios from "axios";

const QUERY = process.argv[2] ?? "advil children";
const ALGOLIA_APP_ID = "VCOJEYD2PO";
const ALGOLIA_API_KEY = "eb9544fe7bfe7ec4c1aa5e5bf7740feb";
const ALGOLIA_INDEX = "products";

function sep(titulo: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${titulo}`);
  console.log("─".repeat(60));
}

function mostrarProductos(items: { nombre: string; precio?: number; categorias?: string[] }[]) {
  if (items.length === 0) {
    console.log("  ⚠  0 resultados");
    return;
  }
  items.slice(0, 5).forEach((p, i) => {
    const precio = p.precio ? ` — $${p.precio.toLocaleString("es-CO")}` : "";
    const cats = p.categorias?.length ? ` [cats: ${p.categorias.slice(0, 2).join(" | ")}]` : "";
    console.log(`  ${i + 1}. ${p.nombre}${precio}${cats}`);
  });
  if (items.length > 5) console.log(`  ... y ${items.length - 5} más`);
}

// ── 1. VTEX genérico ───────────────────────────────────────────────────────
async function testVtex(nombre: string, apiBase: string) {
  sep(`VTEX — ${nombre}`);
  try {
    const url = `${apiBase}?q=${encodeURIComponent(QUERY)}&_from=0&_to=19`;
    console.log(`  GET ${url}`);
    const resp = await axios.get<any[]>(url, { timeout: 12000 });
    const productos = resp.data ?? [];
    console.log(`  → ${productos.length} productos en respuesta`);

    const items = productos.map((p: any) => ({
      nombre: p.productName,
      precio: p.items?.[0]?.sellers?.[0]?.commertialOffer?.Price,
      categorias: p.categories,
    }));
    mostrarProductos(items);

    // Mostrar categorías únicas para entender el filtro
    const cats = new Set<string>();
    productos.forEach((p: any) =>
      (p.categories ?? []).forEach((c: string) => cats.add(c))
    );
    if (cats.size) {
      console.log(`\n  Categorías encontradas:`);
      [...cats].forEach((c) => console.log(`    • ${c}`));
    }
  } catch (err: any) {
    console.log(`  ✗ Error: ${err.message}`);
  }
}

// ── 2. Cruz Verde ──────────────────────────────────────────────────────────
async function testCruzVerde() {
  sep("Cruz Verde");
  try {
    // Paso 1: sesión guest
    console.log("  POST /customer-service/login (guest)...");
    const loginResp = await axios.post(
      "https://api.cruzverde.com.co/customer-service/login",
      { authType: "guest" },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 }
    );
    const cookie = loginResp.headers["set-cookie"]?.[0]?.split(";")[0];
    if (!cookie) { console.log("  ✗ No se obtuvo cookie"); return; }
    console.log(`  ✓ Cookie: ${cookie.substring(0, 40)}...`);

    // Paso 2: buscar
    const url = `https://api.cruzverde.com.co/product-service/products/search?q=${encodeURIComponent(QUERY)}&count=20`;
    console.log(`  GET ${url}`);
    const resp = await axios.get<any>(url, {
      headers: { Cookie: cookie },
      timeout: 12000,
    });
    const hits = resp.data?.hits ?? [];
    console.log(`  → ${hits.length} hits, total: ${resp.data?.total ?? "?"}`);

    const items = hits.map((h: any) => ({
      nombre: h.productName,
      precio: h.prices?.["price-sale-col"] ?? h.prices?.["price-list-col"],
    }));
    mostrarProductos(items);
  } catch (err: any) {
    console.log(`  ✗ Error: ${err.response?.status ?? ""} ${err.message}`);
  }
}

// ── 3. Farmatodo (Algolia) ─────────────────────────────────────────────────
async function testFarmatodo() {
  sep("Farmatodo (Algolia)");
  const url = `https://${ALGOLIA_APP_ID.toLowerCase()}-dsn.algolia.net/1/indexes/*/queries`;
  console.log(`  POST ${url}`);
  try {
    // Con filtro de categoría
    const resp = await axios.post<any>(
      url,
      {
        requests: [{
          indexName: ALGOLIA_INDEX,
          params: new URLSearchParams({
            query: QUERY,
            hitsPerPage: "20",
            filters: "departments:'Salud y medicamentos' OR Categoría:'Salud y medicamentos'",
          }).toString(),
        }],
      },
      {
        headers: {
          "X-Algolia-Application-Id": ALGOLIA_APP_ID,
          "X-Algolia-API-Key": ALGOLIA_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );
    const hits = resp.data?.results?.[0]?.hits ?? [];
    console.log(`  → ${hits.length} hits (con filtro salud)`);
    const items = hits.map((h: any) => ({
      nombre: h.description,
      precio: h.offerPrice || h.fullPrice,
    }));
    mostrarProductos(items);
  } catch (err: any) {
    console.log(`  ✗ Error: ${err.message}`);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔍 Query: "${QUERY}"`);
  console.log(`Probando todas las APIs de farmacias...\n`);

  // await testVtex("La Rebaja", "https://www.larebajavirtual.com/api/catalog_system/pub/products/search");
  // await testVtex("Locatel", "https://locatelcolombia.myvtex.com/api/catalog_system/pub/products/search");
  // await testVtex("Colsubsidio", "https://colsubsidio.myvtex.com/api/catalog_system/pub/products/search");
  await testCruzVerde();
  // await testFarmatodo();

  console.log(`\n${"─".repeat(60)}\n`);
}

main().catch(console.error);
