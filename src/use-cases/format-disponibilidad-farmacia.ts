import type { DisponibilidadFarmaciaOutput } from "./disponibilidad-farmacia.js";

export function formatearDisponibilidadFarmacia(resultado: DisponibilidadFarmaciaOutput): string {
  const estado = resultado.disponible ? "✅ En stock" : "❌ Sin stock";

  if (!resultado.disponible) {
    return [
      `## Disponibilidad: "${resultado.medicamento}" en ${resultado.farmacia_nombre}`,
      ``,
      `${estado}`,
      ``,
      `Lamentablemente, **${resultado.medicamento}** no está disponible en **${resultado.farmacia_nombre}** en este momento.`,
      ``,
      `**Opciones:**`,
      `- Verifica en otras farmacias usando **comparar_precios**`,
      `- Intenta con el nombre genérico (ej: "paracetamol" en lugar de "Dolex")`,
      `- Contacta a la farmacia directamente`,
      ``,
      `_Consultado: ${new Date(resultado.timestamp).toLocaleString("es-CO")}_`,
    ].join("\n");
  }
  
  const lineas: string[] = [
    `## Disponibilidad: "${resultado.medicamento}" en ${resultado.farmacia_nombre}`,
    ``,
    `${estado} | Precio: **$${resultado.precio?.toLocaleString("es-CO") ?? "—"}**`,
    ``,
  ];
  
  if (resultado.presentacion) {
    lineas.push(`**Presentación:** ${resultado.presentacion}`);
  }
  if (resultado.laboratorio) {
    lineas.push(`**Laboratorio:** ${resultado.laboratorio}`);
  }
  
  lineas.push(``);
  lineas.push(`### Localización`);
  if (resultado.direccion) {
    lineas.push(`**Dirección:** ${resultado.direccion}`);
  }
  if (resultado.ciudad) {
    lineas.push(`**Ciudad:** ${resultado.ciudad}`);
  }
  if (resultado.telefono) {
    lineas.push(`**Teléfono:** ${resultado.telefono}`);
  }
  if (resultado.horario) {
    lineas.push(`**Horario:** ${resultado.horario}`);
  }
  
  if (resultado.url_producto) {
    lineas.push(``);
    lineas.push(
      `[🔗 Ver en ${resultado.farmacia_nombre}](${resultado.url_producto})`
    );
  }

  lineas.push(
    ``,
    `_Consultado: ${new Date(resultado.timestamp).toLocaleString("es-CO")}_`
  );

  return lineas.join("\n");
}
