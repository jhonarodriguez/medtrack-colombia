import { describe, it, expect } from "vitest";
import { formatearComparacionPrecios } from "../../src/use-cases/format-compare-prices.js";
import type { ComparePricesOutput, ComparativaEntry } from "../../src/use-cases/compare-prices.js";

// ─── Helper para crear output mock ──────────────────────────────────────────

function createMockComparePricesOutput(
  medicamento: string,
  entradas: Array<Omit<ComparativaEntry, "farmacia" | "disponible"> & {
    farmacia: string;
    disponible: boolean;
  }>
): ComparePricesOutput {
  const precios = entradas.map((e) => e.precio);
  const precioMinimo = Math.min(...precios);
  const precioMaximo = Math.max(...precios);
  const diferenciaPesos = precioMaximo - precioMinimo;
  const diferenciaPorcentaje =
    precioMinimo > 0 ? Number(((diferenciaPesos / precioMinimo) * 100).toFixed(1)) : 0;

  return {
    medicamento_buscado: medicamento,
    total_resultados: entradas.length,
    farmacias_consultadas: ["Farmatodo", "Cruz Verde", "La Rebaja"],
    farmacias_sin_respuesta: ["Locatel", "Colsubsidio"],
    comparativa: entradas.sort((a, b) => a.precio - b.precio),
    precio_minimo: precioMinimo,
    precio_maximo: precioMaximo,
    diferencia_pesos: diferenciaPesos,
    diferencia_porcentaje: diferenciaPorcentaje,
    timestamp: new Date("2024-01-15T10:30:00Z").toISOString(),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("formatearComparacionPrecios()", () => {
  it("genera encabezado con nombre de medicamento", () => {
    const output = createMockComparePricesOutput("paracetamol 500mg", [
      { farmacia: "Farmatodo", presentacion: "Caja x 10", precio: 8500, disponible: true },
      { farmacia: "Cruz Verde", presentacion: "Caja x 10", precio: 7200, disponible: true },
    ]);

    const resultado = formatearComparacionPrecios(output);

    expect(resultado).toContain('## Comparación de Precios: "paracetamol 500mg"');
    expect(resultado).toContain("**2** opción(es) en **3** farmacia(s)");
  });

  it("muestra advertencia si hay farmacias sin respuesta", () => {
    const output = createMockComparePricesOutput("ibuprofeno 400mg", [
      { farmacia: "Farmatodo", presentacion: "Caja x 20", precio: 9500, disponible: true },
    ]);

    const resultado = formatearComparacionPrecios(output);

    expect(resultado).toContain("⚠️ Sin respuesta de: Locatel, Colsubsidio");
  });

  it("muestra resumen de precios con máximo ahorro", () => {
    const output = createMockComparePricesOutput("amoxicilina 500mg", [
      { farmacia: "Farmatodo", presentacion: "Caja x 12", precio: 6500, disponible: true },
      { farmacia: "Cruz Verde", presentacion: "Caja x 12", precio: 8000, disponible: true },
    ]);

    const resultado = formatearComparacionPrecios(output);

    expect(resultado).toContain("- **Más económico:** $6.500");
    expect(resultado).toContain("- **Más caro:** $8.000");
    expect(resultado).toContain("- **Ahorro máximo:** $1.500");
    expect(resultado).toContain("(23.1% de diferencia)");
  });

  it("genera tabla con todos los parámetros", () => {
    const output = createMockComparePricesOutput("metformina 500mg", [
      {
        farmacia: "Farmatodo",
        presentacion: "Caja x 30",
        precio: 15000,
        disponible: true,
        laboratorio: "Teva",
        distancia_km: 2.3,
      },
      {
        farmacia: "La Rebaja",
        presentacion: "Caja x 30",
        precio: 18000,
        disponible: false,
        laboratorio: "Novartis",
        distancia_km: 5.1,
      },
    ]);

    const resultado = formatearComparacionPrecios(output);

    expect(resultado).toContain("| # | Farmacia | Presentación | Precio | Ahorro | Estado | Distancia |");
    expect(resultado).toContain("🏆"); // Mejor precio
    expect(resultado).toContain("15.000");
    expect(resultado).toContain("+$3.000"); // Ahorro (18000 - 15000)
    expect(resultado).toContain("En stock ✅");
    expect(resultado).toContain("Sin stock ⚠️");
    expect(resultado).toContain("2.3 km");
    expect(resultado).toContain("5.1 km");
  });

  it("marca la opción más económica con trofeo 🏆", () => {
    const output = createMockComparePricesOutput("enalapril 10mg", [
      { farmacia: "Farmatodo", presentacion: "Caja x 30", precio: 8000, disponible: true },
      { farmacia: "Cruz Verde", presentacion: "Caja x 30", precio: 9500, disponible: true },
    ]);

    const resultado = formatearComparacionPrecios(output);

    const lineas = resultado.split("\n");
    const primeraFila = lineas.find((l) => l.includes("🏆"));
    expect(primeraFila).toContain("Farmatodo");
    expect(primeraFila).not.toContain("+$");
    expect(primeraFila).toContain("Mejor");
  });

  it("muestra laboratorios cuando está disponible", () => {
    const output = createMockComparePricesOutput("omeprazol 20mg", [
      { farmacia: "Farmatodo", presentacion: "Caja x 14", precio: 11000, disponible: true, laboratorio: "Takeda" },
      { farmacia: "La Rebaja", presentacion: "Caja x 14", precio: 12000, disponible: true, laboratorio: "Novartis" },
    ]);

    const resultado = formatearComparacionPrecios(output);

    expect(resultado).toContain("### Laboratorios");
    expect(resultado).toContain("- **Takeda**");
    expect(resultado).toContain("- **Novartis**");
  });

  it("no incluye sección de laboratorios si ninguno tiene datos", () => {
    const output = createMockComparePricesOutput("aspirina 100mg", [
      { farmacia: "Farmatodo", presentacion: "Tubo x 20", precio: 3000, disponible: true },
      { farmacia: "Cruz Verde", presentacion: "Tubo x 20", precio: 3500, disponible: true },
    ]);

    const resultado = formatearComparacionPrecios(output);

    expect(resultado).not.toContain("### Laboratorios");
  });

  it("maneja medicamento no encontrado correctamente", () => {
    const output: ComparePricesOutput = {
      medicamento_buscado: "medicamento inexistente",
      total_resultados: 0,
      farmacias_consultadas: ["Farmatodo", "Cruz Verde"],
      farmacias_sin_respuesta: ["La Rebaja"],
      comparativa: [],
      precio_minimo: 0,
      precio_maximo: 0,
      diferencia_pesos: 0,
      diferencia_porcentaje: 0,
      timestamp: new Date().toISOString(),
    };

    const resultado = formatearComparacionPrecios(output);

    expect(resultado).toContain("No se encontró **\"medicamento inexistente\"**");
    expect(resultado).toContain("Farmacias consultadas: Farmatodo, Cruz Verde");
    expect(resultado).toContain("- Verifica la ortografía");
    expect(resultado).toContain("- Intenta con el nombre genérico");
  });

  it("incluye timestamp en formato colombiano", () => {
    const output = createMockComparePricesOutput("vitamina d 1000iu", [
      { farmacia: "Farmatodo", presentacion: "Frasco x 60", precio: 25000, disponible: true },
    ]);

    const resultado = formatearComparacionPrecios(output);

    expect(resultado).toContain("_Datos consultados:");
  });

  it("maneja distancia como undefined mostrando dash", () => {
    const output = createMockComparePricesOutput("loratadina 10mg", [
      {
        farmacia: "Farmatodo",
        presentacion: "Caja x 20",
        precio: 5000,
        disponible: true,
        distancia_km: undefined,
      },
    ]);

    const resultado = formatearComparacionPrecios(output);

    expect(resultado).toContain("—"); // Dash para distancia no disponible
  });

  it("calcula ahorro en cero para la opción más económica", () => {
    const output = createMockComparePricesOutput("fluconazol 150mg", [
      { farmacia: "Farmatodo", presentacion: "Cápsula x 1", precio: 4500, disponible: true },
      { farmacia: "Cruz Verde", presentacion: "Cápsula x 1", precio: 5200, disponible: true },
    ]);

    const resultado = formatearComparacionPrecios(output);

    const lineas = resultado.split("\n");
    const fileaFarmatodo = lineas.find((l) => l.includes("Farmatodo") && l.includes("4.500"));
    expect(fileaFarmatodo).toBeDefined();
    if (fileaFarmatodo) {
      expect(fileaFarmatodo).toContain("🏆");
      expect(fileaFarmatodo).toContain("Mejor");
    }
  });
});
