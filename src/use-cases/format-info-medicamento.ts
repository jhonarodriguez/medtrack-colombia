import type { InfoMedicamentoOutput } from "./info-medicamento.js";

export function formatearInfoMedicamento(resultado: InfoMedicamentoOutput | null): string {
  if (!resultado) {
    return [
      `## Información del Medicamento`,
      ``,
      `❌ Medicamento no encontrado`,
      ``,
      `El medicamento que buscas no está registrado en la base de datos INVIMA de medicamentos consultados.`,
      ``,
      `**Para obtener información oficial:**`,
      `1. Consulta la base de datos de INVIMA: https://app.invima.gov.co/cum/`,
      `2. O en Datos Abiertos Colombia: https://datos.gov.co/browse?q=medicamentos`,
      ``,
      `**Nota:** Esta herramienta consulta medicamentos comúnmente disponibles en farmacias colombianas.`,
    ].join("\n");
  }

  const precioInfo = resultado.precio_regulado_sismed
    ? `$${resultado.precio_regulado_sismed.toLocaleString("es-CO")}`
    : "No regulado por SISMED";

  return [
    `## Información del Medicamento`,
    ``,
    `✅ Registro INVIMA vigente`,
    ``,
    `**Nombre Comercial:** ${resultado.nombre_comercial}`,
    `**Nombre Genérico:** ${resultado.nombre_generico}`,
    ``,
    `### Datos Técnicos`,
    `- **Principio Activo:** ${resultado.principio_activo}`,
    `- **Concentración:** ${resultado.concentracion}`,
    `- **Forma Farmacéutica:** ${resultado.forma_farmaceutica}`,
    `- **Laboratorio:** ${resultado.laboratorio}`,
    ``,
    `### Registro INVIMA`,
    `| Campo | Valor |`,
    `|-------|-------|`,
    `| CUM | ${resultado.cum} |`,
    `| Registro Sanitario | ${resultado.registro_sanitario} |`,
    `| Estado | ${resultado.estado_registro} |`,
    ``,
    `### Precio`,
    `**Precio Regulado SISMED:** ${precioInfo}`,
    ``,
    `**⚠️ Nota:** El precio regulado es el máximo permitido. Las farmacias pueden vender a menor precio.`,
    `Usa **comparar_precios** para ver precios actuales en múltiples farmacias.`,
    ``,
    `_Información consultada: ${new Date(resultado.fecha_consulta).toLocaleString("es-CO")}_`,
    `_Fuente: Base de datos INVIMA_ 🇨🇴`,
  ].join("\n");
}
