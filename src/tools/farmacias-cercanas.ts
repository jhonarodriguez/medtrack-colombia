import type { FarmaciasCercanasInput } from "./schemas.js";
import type { SearchResult, NearbyPharmacy, FormatoRespuesta } from "../types/index.js";
import { formatearSearchResult } from "../services/format-response.service.js";
import { pharmacyOrchestrator } from "../orchestrator/pharmacy-orchestrator.js";
import { calcularDistanciaKm, geocodificarUbicacion } from "../services/geo.service.js";

export async function farmaciasCercanas(
  input: FarmaciasCercanasInput
): Promise<string> {
  const { latitud, longitud, ciudad, direccion, barrio, localidad, medicamento, radio_km = 3, formato = "json" } = input as FarmaciasCercanasInput & { formato?: FormatoRespuesta };

  let lat = latitud;
  let lng = longitud;

  if (!lat || !lng) {
    if (direccion || ciudad || barrio || localidad) {
      const coords = await geocodificarUbicacion({
        direccion,
        barrio,
        localidad,
        ciudad,
      });
      
      if (!coords) {
        const address = [direccion, barrio || localidad, ciudad || "Colombia"]
          .filter(Boolean)
          .join(", ");
        return `❌ No se pudo geocodificar la dirección: "${address}". Por favor proporciona coordenadas (latitud/longitud) o una dirección más precisa.`;
      }
      
      lat = coords.lat;
      lng = coords.lng;
    } else {
      return `❌ Debes proporcionar coordenadas (latitud/longitud) o al menos una dirección/ciudad para buscar farmacias cercanas.`;
    }
  }

  if (medicamento) {
    const resultado = await pharmacyOrchestrator.buscar(medicamento, {
      latitud: lat,
      longitud: lng,
      radio_km,
      max_resultados: 50,
    });
    if (formato === "markdown") return formatearConMedicamento(resultado, lat, lng, radio_km);
    return formatearSearchResult(resultado, formato, (r) => formatearConMedicamento(r, lat, lng, radio_km));
  }
  
  const todasLasSedes = await pharmacyOrchestrator.obtenerTodasLasSedes();

  const cercanas: NearbyPharmacy[] = todasLasSedes
    .filter((s) => s.coordenadas !== undefined)
    .map((s) => ({
      farmacia_id: s.id,
      farmacia_nombre: s.nombre,
      direccion: s.direccion ?? "Sin dirección",
      ciudad: s.ciudad ?? "Colombia",
      coordenadas: s.coordenadas!,
      distancia_km: calcularDistanciaKm(
        lat,
        lng,
        s.coordenadas!.lat,
        s.coordenadas!.lng
      ),
    }))
    .filter((s) => s.distancia_km <= radio_km)
    .sort((a, b) => a.distancia_km - b.distancia_km);

  if (formato !== "markdown" && formato !== "compact") {
    return JSON.stringify({
      lat, lng, radio_km,
      n: cercanas.length,
      sedes: cercanas.map((s) => ({
        f: s.farmacia_nombre,
        dir: s.direccion,
        ciudad: s.ciudad,
        d: Math.round(s.distancia_km * 10) / 10,
      })),
    });
  }
  return formatearSinMedicamento(cercanas, lat, lng, radio_km);
}

function formatearConMedicamento(
  resultado: SearchResult,
  latitud: number,
  longitud: number,
  radio_km: number
): string {
  const medicamento = resultado.medicamento_buscado;

  if (resultado.total_resultados === 0) {
    return [
      `No se encontró **"${medicamento}"** en farmacias dentro de ${radio_km} km de tu ubicación.`,
      ``,
      `Sugerencias:`,
      `- Amplía el radio de búsqueda (actualmente ${radio_km} km)`,
      `- Verifica que las coordenadas sean correctas (lat: ${latitud}, lng: ${longitud})`,
      `- Usa \`buscar_medicamento\` sin coordenadas para ver disponibilidad nacional`,
    ].join("\n");
  }

  const sedesMap = new Map<
    string,
    { sede: typeof resultado.resultados[0]["farmacia"]; precio: number; nombre: string; presentacion: string; disponible: boolean }
  >();

  for (const r of resultado.resultados) {
    const key = r.farmacia.id;
    const existente = sedesMap.get(key);
    if (!existente || r.precio < existente.precio) {
      sedesMap.set(key, {
        sede: r.farmacia,
        precio: r.precio,
        nombre: r.nombre,
        presentacion: r.presentacion,
        disponible: r.disponible,
      });
    }
  }

  const sedes = [...sedesMap.values()].sort(
    (a, b) => (a.sede.distancia_km ?? Infinity) - (b.sede.distancia_km ?? Infinity)
  );

  const lineas: string[] = [
    `## Farmacias cercanas con "${medicamento}"`,
    ``,
    `**${sedes.length}** sede(s) encontrada(s) dentro de ${radio_km} km`,
    ``,
    `| # | Farmacia | Dirección | Ciudad | Distancia | Precio |`,
    `|---|---------|----------|--------|-----------|--------|`,
  ];

  sedes.forEach((s, i) => {
    const dist = s.sede.distancia_km !== undefined ? `${s.sede.distancia_km} km` : "—";
    const precio = `$${s.precio.toLocaleString("es-CO")}`;
    const stock = s.disponible ? "" : " ⚠️";
    lineas.push(
      `| ${i + 1} | ${s.sede.nombre}${stock} | ${s.sede.direccion ?? "—"} | ${s.sede.ciudad ?? "—"} | ${dist} | ${precio} |`
    );
  });

  if (resultado.farmacias_sin_respuesta.length > 0) {
    lineas.push(
      ``,
      `⚠️ Sin respuesta de: ${resultado.farmacias_sin_respuesta.join(", ")}`
    );
  }

  lineas.push(
    ``,
    `_Datos consultados: ${new Date(resultado.timestamp).toLocaleString("es-CO")}_`
  );

  return lineas.join("\n");
}

function formatearSinMedicamento(
  cercanas: NearbyPharmacy[],
  latitud: number,
  longitud: number,
  radio_km: number
): string {
  if (cercanas.length === 0) {
    return [
      `No se encontraron farmacias dentro de ${radio_km} km de tu ubicación (lat: ${latitud}, lng: ${longitud}).`,
      ``,
      `Sugerencias:`,
      `- Amplía el radio de búsqueda`,
      `- Verifica que las coordenadas correspondan a una ciudad colombiana`,
    ].join("\n");
  }

  const lineas: string[] = [
    `## Farmacias cercanas a tu ubicación`,
    ``,
    `**${cercanas.length}** sede(s) dentro de ${radio_km} km`,
    ``,
    `| # | Farmacia | Dirección | Ciudad | Distancia |`,
    `|---|---------|----------|--------|-----------|`,
  ];

  cercanas.forEach((s, i) => {
    lineas.push(
      `| ${i + 1} | ${s.farmacia_nombre} | ${s.direccion} | ${s.ciudad} | ${s.distancia_km} km |`
    );
  });

  lineas.push(
    ``,
    `_Para verificar disponibilidad de un medicamento, usa \`farmacias_cercanas\` con el parámetro \`medicamento\`._`
  );

  return lineas.join("\n");
}
