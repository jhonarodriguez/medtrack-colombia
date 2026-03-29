import type {
  MedicationResult,
  SearchResult,
  ResultadoAgrupado,
  SearchResultAgrupado,
  FormatoRespuesta,
} from "../types/index.js";

const CADENAS_ID = [
  "cruz-verde",
  "la-rebaja",
  "colsubsidio",
  "locatel",
  "farmatodo",
];

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function extraerCadenaId(farmaciaId: string): string {
  return CADENAS_ID.find((id) => farmaciaId.startsWith(id)) ?? farmaciaId;
}

function calcularConfianza(nombreProducto: string, query: string): number {
  const palabras = normalizar(query)
    .split(/\s+/)
    .filter((p) => p.length >= 3);
  if (palabras.length === 0) return 1;
  const nombre = normalizar(nombreProducto);
  const matches = palabras.filter((p) => nombre.includes(p)).length;
  return Math.round((matches / palabras.length) * 100) / 100;
}

/**
 * Agrupa resultados por (cadena × nombre × presentación),
 * acumulando num_sedes, precio_min y distancia_min.
 */
export function agruparResultados(
  resultados: MedicationResult[],
  query: string
): ResultadoAgrupado[] {
  const grupos = new Map<string, ResultadoAgrupado>();

  for (const r of resultados) {
    const cadenaId = extraerCadenaId(r.farmacia.id);
    const clave = `${cadenaId}::${normalizar(r.nombre)}::${normalizar(r.presentacion)}`;

    const existente = grupos.get(clave);
    if (!existente) {
      grupos.set(clave, {
        nombre: r.nombre,
        presentacion: r.presentacion,
        laboratorio: r.laboratorio,
        precio_min: r.precio,
        precio_max: r.precio,
        cadena: r.farmacia.nombre,
        cadena_id: cadenaId,
        num_sedes: 1,
        distancia_min_km: r.farmacia.distancia_km,
        url_producto: r.url_producto,
        confianza: calcularConfianza(r.nombre, query),
        stock_disponible: r.disponible,
        ultima_actualizacion: r.timestamp,
        sede_cercana: r.farmacia.distancia_km !== undefined ? {
          nombre: r.farmacia.nombre,
          direccion: r.farmacia.direccion,
          coordenadas: r.farmacia.coordenadas,
          horario: r.farmacia.horario,
          distancia_km: r.farmacia.distancia_km,
        } : undefined,
      });
    } else {
      existente.num_sedes++;
      existente.precio_min = Math.min(existente.precio_min, r.precio);
      existente.precio_max = Math.max(existente.precio_max, r.precio);
      if (r.farmacia.distancia_km !== undefined) {
        const dActual = existente.distancia_min_km ?? Infinity;
        if (r.farmacia.distancia_km < dActual) {
          existente.distancia_min_km = r.farmacia.distancia_km;
          existente.sede_cercana = {
            nombre: r.farmacia.nombre,
            direccion: r.farmacia.direccion,
            coordenadas: r.farmacia.coordenadas,
            horario: r.farmacia.horario,
            distancia_km: r.farmacia.distancia_km,
          };
        }
      }
    }
  }

  return [...grupos.values()];
}

/**
 * Convierte un SearchResult en SearchResultAgrupado.
 */
export function agruparSearchResult(
  resultado: SearchResult
): SearchResultAgrupado {
  const agrupados = agruparResultados(
    resultado.resultados,
    resultado.medicamento_buscado
  );
  return {
    medicamento_buscado: resultado.medicamento_buscado,
    total_variantes: agrupados.length,
    total_sedes: resultado.total_resultados,
    farmacias_consultadas: resultado.farmacias_consultadas,
    farmacias_sin_respuesta: resultado.farmacias_sin_respuesta,
    resultados: agrupados,
    timestamp: resultado.timestamp,
  };
}

/**
 * Formato JSON compacto — mínimo tokens.
 * Usa claves cortas para maximizar la reducción.
 */
export function formatearJSON(agrupado: SearchResultAgrupado): string {
  const payload = {
    q: agrupado.medicamento_buscado,
    variantes: agrupado.total_variantes,
    sedes_total: agrupado.total_sedes,
    ts: agrupado.timestamp,
    err: agrupado.farmacias_sin_respuesta.length
      ? agrupado.farmacias_sin_respuesta
      : undefined,
    r: agrupado.resultados.map((r) => {
      const entry: Record<string, unknown> = {
        nm: r.nombre,
        pr: r.presentacion,
        precio: r.precio_min,
        cadena: r.cadena,
        sedes: r.num_sedes,
        conf: r.confianza,
      };
      if (r.laboratorio) entry.lab = r.laboratorio;
      if (r.precio_max > r.precio_min) entry.precio_max = r.precio_max;
      if (r.distancia_min_km !== undefined)
        entry.d_min = Math.round(r.distancia_min_km * 10) / 10;
      if (!r.stock_disponible) entry.sin_stock = true;
      if (r.url_producto) entry.url = r.url_producto;
      if (r.sede_cercana) {
        const s: Record<string, unknown> = {
          nom: r.sede_cercana.nombre,
          d: Math.round(r.sede_cercana.distancia_km * 10) / 10,
        };
        if (r.sede_cercana.direccion) s.dir = r.sede_cercana.direccion;
        if (r.sede_cercana.coordenadas) s.coord = [r.sede_cercana.coordenadas.lat, r.sede_cercana.coordenadas.lng];
        if (r.sede_cercana.horario) s.horario = r.sede_cercana.horario;
        entry.sede = s;
      }
      return entry;
    }),
  };
  return JSON.stringify(payload);
}

/**
 * Formato compact — tabla markdown con top 10, sin sección de ubicaciones.
 */
export function formatearCompact(
  agrupado: SearchResultAgrupado,
  limite = 10
): string {
  if (agrupado.total_variantes === 0) {
    return `Sin resultados para "${agrupado.medicamento_buscado}". Farmacias consultadas: ${agrupado.farmacias_consultadas.join(", ")}.`;
  }

  const top = agrupado.resultados.slice(0, limite);
  const lineas: string[] = [
    `**${agrupado.medicamento_buscado}** — ${agrupado.total_variantes} variante(s) / ${agrupado.total_sedes} sede(s)`,
    ``,
    `| Farmacia | Producto | Presentación | Precio | Sedes | Dist. |`,
    `|---|---|---|---|---|---|`,
  ];

  for (const r of top) {
    const precio = `$${r.precio_min.toLocaleString("es-CO")}`;
    const dist =
      r.distancia_min_km !== undefined
        ? `${Math.round(r.distancia_min_km * 10) / 10}km`
        : "—";
    const stock = r.stock_disponible ? "" : " ⚠️";
    lineas.push(
      `| ${r.cadena}${stock} | ${r.nombre} | ${r.presentacion} | ${precio} | ${r.num_sedes} | ${dist} |`
    );
  }

  if (agrupado.farmacias_sin_respuesta.length > 0) {
    lineas.push(``, `⚠️ Sin respuesta: ${agrupado.farmacias_sin_respuesta.join(", ")}`);
  }

  return lineas.join("\n");
}

/**
 * Despacha al formatter correcto según el formato solicitado.
 */
export function formatearSearchResult(
  resultado: SearchResult,
  formato: FormatoRespuesta,
  formatearMarkdownFn: (r: SearchResult) => string
): string {
  if (formato === "markdown") return formatearMarkdownFn(resultado);

  const agrupado = agruparSearchResult(resultado);
  if (formato === "compact") return formatearCompact(agrupado);
  return formatearJSON(agrupado);
}
