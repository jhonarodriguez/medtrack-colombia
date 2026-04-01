import { z } from "zod";

export const BuscarMedicamentoSchema = z.object({
  nombre: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .describe("Nombre del medicamento a buscar (genérico o comercial). Ej: 'acetaminofén', 'Dolex', 'ibuprofeno 400mg'"),

  ciudad: z
    .string()
    .optional()
    .describe("Ciudad colombiana para filtrar resultados. Ej: 'Bogotá', 'Medellín', 'Cali'. Si se omite, busca en todo el país"),

  direccion: z
    .string()
    .optional()
    .describe("Dirección para geocodificación automática (geocoded a coordenadas). Ej: 'Cra 7 #72-30'"),

  barrio: z
    .string()
    .optional()
    .describe("Barrio o localidad para geocodificación (ej: 'Chapinero', 'La Candelaria')"),

  localidad: z
    .string()
    .optional()
    .describe("Localidad de Bogotá u otra ciudad para búsqueda por zona. Ej: 'Usaquén', 'Teusaquillo'"),

  latitud: z
    .number()
    .min(-4.5)
    .max(13.5)
    .optional()
    .describe("Latitud del usuario para ordenar por distancia (coordenadas de Colombia). Si se proporciona, se usa directamente sin geocodificación"),

  longitud: z
    .number()
    .min(-82)
    .max(-66)
    .optional()
    .describe("Longitud del usuario para ordenar por distancia (coordenadas de Colombia). Si se proporciona, se usa directamente sin geocodificación"),

  radio_km: z
    .number()
    .min(0.1)
    .max(50)
    .default(1)
    .optional()
    .describe("Radio de búsqueda en kilómetros cuando se proveen coordenadas (default: 1)"),

  max_resultados: z
    .number()
    .min(1)
    .max(50)
    .default(20)
    .optional()
    .describe("Número máximo de resultados a retornar (default: 20)"),

  formato: z
    .enum(["json", "markdown", "compact"])
    .default("json")
    .optional()
    .describe('Formato de respuesta: "json" (defecto, mínimo tokens, agrupado por cadena), "compact" (top-10 en markdown), "markdown" (tabla completa)'),
});

export const CompararPreciosSchema = z.object({
  nombre: z
    .string()
    .min(2)
    .describe("Nombre del medicamento a comparar"),

  ciudad: z
    .string()
    .optional()
    .describe("Ciudad colombiana para filtrar. Si se omite busca en todo el país"),

  incluir_genericos: z
    .boolean()
    .default(true)
    .optional()
    .describe("Si se deben incluir equivalentes genéricos en la comparación (default: true)"),

  formato: z
    .enum(["json", "markdown", "compact"])
    .default("json")
    .optional()
    .describe('Formato de respuesta: "json" (defecto, mínimo tokens), "compact" (top-5 markdown), "markdown" (tabla completa)'),
});

export const FarmaciasCercanasSchema = z.object({
  latitud: z
    .number()
    .min(-4.5)
    .max(13.5)
    .optional()
    .describe("Latitud del usuario (Colombia entre -4.5 y 13.5). Si se proporciona, se usa directamente sin geocodificación"),

  longitud: z
    .number()
    .min(-82)
    .max(-66)
    .optional()
    .describe("Longitud del usuario (Colombia entre -82 y -66). Si se proporciona, se usa directamente sin geocodificación"),

  ciudad: z
    .string()
    .optional()
    .describe("Ciudad colombiana para geocodificación. Ej: 'Bogotá', 'Medellín', 'Cali'"),

  direccion: z
    .string()
    .optional()
    .describe("Dirección para geocodificación automática. Ej: 'Cra 7 #72-30'"),

  barrio: z
    .string()
    .optional()
    .describe("Barrio o localidad para geocodificación. Ej: 'Chapinero', 'La Candelaria'"),

  localidad: z
    .string()
    .optional()
    .describe("Localidad de Bogotá u otra ciudad para búsqueda por zona. Ej: 'Usaquén', 'Teusaquillo'"),

  medicamento: z
    .string()
    .optional()
    .describe("Medicamento que debe tener en stock. Si se omite, lista todas las farmacias cercanas"),

  radio_km: z
    .number()
    .min(0.1)
    .max(20)
    .default(1)
    .optional()
    .describe("Radio de búsqueda en kilómetros (default: 1)"),

  formato: z
    .enum(["json", "markdown", "compact"])
    .default("json")
    .optional()
    .describe('Formato de respuesta: "json" (defecto, mínimo tokens), "compact" (top-10 markdown), "markdown" (tabla completa)'),
});

export const InfoMedicamentoSchema = z.object({
  nombre: z
    .string()
    .min(2)
    .describe("Nombre del medicamento (genérico o comercial)"),

  cum: z
    .string()
    .optional()
    .describe("Código Único de Medicamento de INVIMA (opcional, mejora precisión)"),
});

export const DisponibilidadFarmaciaSchema = z.object({
  medicamento: z
    .string()
    .min(2)
    .describe("Nombre del medicamento a verificar"),

  farmacia: z
    .enum(["farmatodo", "cruz-verde", "la-rebaja", "locatel", "colsubsidio", "cafam", "economia"])
    .describe("Farmacia específica donde verificar disponibilidad"),
});

export type BuscarMedicamentoInput = z.infer<typeof BuscarMedicamentoSchema>;
export type CompararPreciosInput = z.infer<typeof CompararPreciosSchema>;
export type FarmaciasCercanasInput = z.infer<typeof FarmaciasCercanasSchema>;
export type InfoMedicamentoInput = z.infer<typeof InfoMedicamentoSchema>;
export type DisponibilidadFarmaciaInput = z.infer<typeof DisponibilidadFarmaciaSchema>;
