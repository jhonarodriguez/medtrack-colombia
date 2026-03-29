import type { BuscarMedicamentoInput } from "./schemas.js";
import type { SearchResult, FormatoRespuesta } from "../types/index.js";
import { pharmacyOrchestrator } from "../orchestrator/pharmacy-orchestrator.js";
import { formatearSearchResult } from "../services/format-response.service.js";

export async function buscarMedicamento(
  input: BuscarMedicamentoInput
): Promise<SearchResult> {
  return pharmacyOrchestrator.buscar(input.nombre, {
    ciudad: input.ciudad,
    direccion: input.direccion,
    barrio: input.barrio,
    localidad: input.localidad,
    latitud: input.latitud,
    longitud: input.longitud,
    radio_km: input.radio_km,
    max_resultados: input.max_resultados,
  });
}

export function formatearResultados(
  resultado: SearchResult,
  formato: FormatoRespuesta = "json"
): string {
  return formatearSearchResult(resultado, formato, formatearMarkdown);
}

function formatearMarkdown(resultado: SearchResult): string {
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
      `- Amplía la búsqueda omitiendo la ciudad`,
    ].filter(Boolean).join("\n");
  }

  const lineas: string[] = [
    `## Resultados para "${resultado.medicamento_buscado}"`,
    ``,
    `**${resultado.total_resultados}** resultado(s) en **${resultado.farmacias_consultadas.length}** farmacia(s)`,
  ];

  if (resultado.farmacias_sin_respuesta.length > 0) {
    lineas.push(`⚠️ Sin respuesta de: ${resultado.farmacias_sin_respuesta.join(", ")}`);
  }

  lineas.push(``, `| # | Farmacia | Producto | Presentación | Precio | Distancia |`);
  lineas.push(`|---|---------|---------|-------------|--------|-----------|`);

  resultado.resultados.forEach((r, i) => {
    const distancia = r.farmacia.distancia_km !== undefined
      ? `${r.farmacia.distancia_km} km`
      : "—";
    const precio = `$${r.precio.toLocaleString("es-CO")}`;
    const disponible = r.disponible ? "" : " ⚠️ sin stock";
    lineas.push(
      `| ${i + 1} | ${r.farmacia.nombre} | ${r.nombre}${disponible} | ${r.presentacion} | ${precio} | ${distancia} |`
    );
  });

  const conDireccion = resultado.resultados.filter((r) => r.farmacia.direccion);
  if (conDireccion.length > 0) {
    lineas.push(``, `### Ubicaciones`);
    const vistas = new Set<string>();
    conDireccion.forEach((r) => {
      const key = `${r.farmacia.id}-${r.farmacia.direccion}`;
      if (!vistas.has(key)) {
        vistas.add(key);
        const dist = r.farmacia.distancia_km !== undefined
          ? ` · ${r.farmacia.distancia_km} km`
          : "";
        lineas.push(
          `- **${r.farmacia.nombre}** — ${r.farmacia.direccion}, ${r.farmacia.ciudad ?? ""}${dist}`
        );
      }
    });
  }

  lineas.push(
    ``,
    `_Datos consultados: ${new Date(resultado.timestamp).toLocaleString("es-CO")}_`
  );

  return lineas.join("\n");
}
