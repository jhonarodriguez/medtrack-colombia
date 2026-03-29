import type { FormatoRespuesta } from "../types/index.js";
import type { ComparePricesOutput } from "./compare-prices.js";

export function formatearComparacionPrecios(
  resultado: ComparePricesOutput,
  formato: FormatoRespuesta = "json"
): string {
  if (formato === "json") return formatearComparacionJSON(resultado);
  if (formato === "compact") return formatearComparacionCompact(resultado);
  return formatearComparacionMarkdown(resultado);
}

function formatearComparacionJSON(resultado: ComparePricesOutput): string {
  if (resultado.total_resultados === 0) {
    return JSON.stringify({ q: resultado.medicamento_buscado, n: 0, err: resultado.farmacias_sin_respuesta });
  }
  return JSON.stringify({
    q: resultado.medicamento_buscado,
    n: resultado.total_resultados,
    precio_min: resultado.precio_minimo,
    precio_max: resultado.precio_maximo,
    ahorro: resultado.diferencia_pesos,
    ahorro_pct: resultado.diferencia_porcentaje,
    ts: resultado.timestamp,
    r: resultado.comparativa.map((c) => ({
      cadena: c.farmacia,
      nm: c.producto,
      pr: c.presentacion,
      precio: c.precio,
      lab: c.laboratorio ?? undefined,
      d: c.distancia_km ?? undefined,
      stock: c.disponible,
    })),
  });
}

function formatearComparacionCompact(resultado: ComparePricesOutput): string {
  if (resultado.total_resultados === 0) {
    return `Sin resultados para "${resultado.medicamento_buscado}".`;
  }
  const top = resultado.comparativa.slice(0, 5);
  const lineas = [
    `**${resultado.medicamento_buscado}** — min $${resultado.precio_minimo.toLocaleString("es-CO")} / max $${resultado.precio_maximo.toLocaleString("es-CO")}`,
    ``,
    `| Farmacia | Presentación | Precio | Estado |`,
    `|---|---|---|---|`,
  ];
  for (const c of top) {
    const precio = `$${c.precio.toLocaleString("es-CO")}`;
    const estado = c.disponible ? "✅" : "⚠️";
    lineas.push(`| ${c.farmacia} | ${c.presentacion} | ${precio} | ${estado} |`);
  }
  return lineas.join("\n");
}

function formatearComparacionMarkdown(resultado: ComparePricesOutput): string {
  if (resultado.total_resultados === 0) {
    const sinRespuesta = resultado.farmacias_sin_respuesta.length > 0
      ? `\n⚠️ Sin respuesta de: ${resultado.farmacias_sin_respuesta.join(", ")}`
      : "";

    return [
      `No se encontró **"${resultado.medicamento_buscado}"** en ninguna farmacia.`,
      sinRespuesta,
      ``,
      `Farmacias consultadas: ${resultado.farmacias_consultadas.join(", ")}`,
      ``,
      `Sugerencias:`,
      `- Verifica la ortografía del medicamento`,
      `- Intenta con el nombre genérico (ej: "paracetamol" en lugar de "Dolex")`,
      `- Prueba sin tilde (ej: "acetaminofen" en lugar de "acetaminofén")`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const lineas: string[] = [
    `## Comparación de Precios: "${resultado.medicamento_buscado}"`,
    ``,
    `**${resultado.total_resultados}** opción(es) en **${resultado.farmacias_consultadas.length}** farmacia(s)`,
  ];

  if (resultado.farmacias_sin_respuesta.length > 0) {
    lineas.push(`⚠️ Sin respuesta de: ${resultado.farmacias_sin_respuesta.join(", ")}`);
  }

  const ahorroMaximo = resultado.diferencia_pesos;
  const ahorroMaximoDescripcion =
    resultado.precio_minimo > 0
      ? `(${resultado.diferencia_porcentaje}% de diferencia)`
      : "(precios especiales)";

  lineas.push(
    ``,
    `### Resumen de Precios`,
    `- **Más económico:** $${resultado.precio_minimo.toLocaleString("es-CO")}`,
    `- **Más caro:** $${resultado.precio_maximo.toLocaleString("es-CO")}`,
    `- **Ahorro máximo:** $${ahorroMaximo.toLocaleString("es-CO")} ${ahorroMaximoDescripcion}`,
    ``
  );
  
  lineas.push(`| # | Farmacia | Presentación | Precio | Ahorro | Estado | Distancia |`);
  lineas.push(`|---|---------|------------|--------|--------|--------|-----------|`);

  resultado.comparativa.forEach((item, i) => {
    const ahorro = item.precio - resultado.precio_minimo;
    const ahorroDisplay =
      ahorro > 0 ? `+$${ahorro.toLocaleString("es-CO")}` : "Mejor";
    const estado = item.disponible ? "En stock ✅" : "Sin stock ⚠️";
    const distancia =
      item.distancia_km !== undefined ? `${item.distancia_km} km` : "—";
    const precio = `$${item.precio.toLocaleString("es-CO")}`;
    const marca = ahorro === 0 ? "🏆 " : "";

    lineas.push(
      `| ${i + 1} | ${marca}${item.farmacia} | ${item.presentacion} | ${precio} | ${ahorroDisplay} | ${estado} | ${distancia} |`
    );
  });
  
  const conLaboratorio = resultado.comparativa.filter((c) => c.laboratorio);
  if (conLaboratorio.length > 0) {
    lineas.push(``, `### Laboratorios`);
    const laboratorios = new Set(
      conLaboratorio.map((c) => `- **${c.laboratorio}**`)
    );
    laboratorios.forEach((lab) => lineas.push(lab));
  }
  
  lineas.push(
    ``,
    `_Datos consultados: ${new Date(resultado.timestamp).toLocaleString("es-CO")}_`
  );

  return lineas.join("\n");
}
