import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  BuscarMedicamentoSchema,
  CompararPreciosSchema,
  FarmaciasCercanasSchema,
  InfoMedicamentoSchema,
  DisponibilidadFarmaciaSchema,
} from "./tools/schemas.js";
import { buscarMedicamento, formatearResultados } from "./tools/buscar-medicamento.js";
import { farmaciasCercanas } from "./tools/farmacias-cercanas.js";
import { comparePricesUseCase } from "./use-cases/compare-prices.js";
import { formatearComparacionPrecios } from "./use-cases/format-compare-prices.js";
import { infoMedicamentoUseCase } from "./use-cases/info-medicamento.js";
import { formatearInfoMedicamento } from "./use-cases/format-info-medicamento.js";
import { disponibilidadFarmaciaUseCase } from "./use-cases/disponibilidad-farmacia.js";
import { formatearDisponibilidadFarmacia } from "./use-cases/format-disponibilidad-farmacia.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "medtrack-colombia",
    version: "0.1.0",
  });

  server.registerTool(
    "buscar_medicamento",
    {
      description: `Busca un medicamento en todas las farmacias colombianas soportadas simultáneamente (Farmatodo, Cruz Verde, La Rebaja, Locatel, Colsubsidio, Droguerías Cafam) y retorna los resultados ordenados por precio ascendente.

CUÁNDO USAR: cuando el usuario pregunta por el precio de un medicamento, quiere saber dónde conseguirlo, o compara opciones sin especificar una sola farmacia.

UBICACIÓN: si el usuario provee dirección, barrio, localidad o coordenadas GPS, los resultados también se ordenan por distancia dentro del radio especificado. Priorizar latitud/longitud cuando estén disponibles; si no, geocodificar con dirección + ciudad.

RESPUESTA: lista de resultados agrupados por farmacia con nombre, presentación, laboratorio, precio (COP), disponibilidad, URL del producto, coordenadas de la sede y distancia (si se calculó). Usar formato "json" para respuestas en chat (menor uso de tokens), "markdown" solo si el usuario pide tabla o comparación visual.

ENCADENAMIENTO: si el usuario quiere más detalle de una sola farmacia, usar disponibilidad_farmacia. Si quiere resumen de ahorro, usar comparar_precios.`,
      inputSchema: BuscarMedicamentoSchema.shape,
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      try {
        const resultado = await buscarMedicamento(input);
        const texto = formatearResultados(resultado, (input as typeof input & { formato?: string }).formato as "json" | "markdown" | "compact" ?? "json");
        return { content: [{ type: "text", text: texto }] };
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : "Error desconocido";
        return {
          content: [{
            type: "text",
            text: `Error al buscar el medicamento: ${mensaje}\n\nPor favor intenta de nuevo o contacta soporte.`,
          }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "comparar_precios",
    {
      description: `Genera un resumen comparativo de precios de un medicamento entre todas las farmacias, con precio mínimo, máximo y ahorro potencial calculado.

CUÁNDO USAR: cuando el usuario pregunta cuánto puede ahorrar, cuál es la farmacia más barata o quiere una tabla comparativa entre cadenas.

DIFERENCIA CON buscar_medicamento: comparar_precios agrega los datos por cadena (un precio representativo por farmacia) en lugar de listar todos los resultados individuales. Es más compacto y útil para comparaciones directas.

RESPUESTA: precio mínimo y máximo encontrado, farmacia más barata, farmacia más cara, ahorro absoluto y porcentual, y desglose por cadena. Si incluir_genericos=true (default), también incluye equivalentes genéricos del principio activo.`,
      inputSchema: CompararPreciosSchema.shape,
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      try {
        const resultado = await comparePricesUseCase.execute(input);
        const texto = formatearComparacionPrecios(resultado, (input as typeof input & { formato?: string }).formato as "json" | "markdown" | "compact" ?? "json");
        return { content: [{ type: "text", text: texto }] };
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : "Error desconocido";
        return {
          content: [{
            type: "text",
            text: `Error al comparar precios: ${mensaje}\n\nPor favor intenta de nuevo o contacta soporte.`,
          }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "farmacias_cercanas",
    {
      description: `Lista las farmacias dentro de un radio geográfico, opcionalmente filtrando por disponibilidad de un medicamento.

CUÁNDO USAR: cuando el usuario pregunta qué farmacias hay cerca de una ubicación, sin que el precio sea el foco principal. También útil cuando dice "¿dónde puedo conseguir X cerca de mí?".

UBICACIÓN: requiere al menos una de: latitud+longitud, dirección, ciudad+barrio. Si solo da ciudad sin coordenadas, devuelve todas las sedes de esa ciudad.

RESPUESTA: lista de sedes con nombre de cadena, dirección, distancia desde la ubicación del usuario y horario. Si se especificó medicamento, solo incluye sedes donde ese medicamento está disponible.`,
      inputSchema: FarmaciasCercanasSchema.shape,
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      try {
        const texto = await farmaciasCercanas(input);
        return { content: [{ type: "text", text: texto }] };
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : "Error desconocido";
        return {
          content: [{
            type: "text",
            text: `Error al buscar farmacias cercanas: ${mensaje}\n\nPor favor intenta de nuevo.`,
          }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "info_medicamento",
    {
      description: `Consulta el registro INVIMA de Colombia para obtener información oficial de un medicamento: registro sanitario, principio activo, laboratorio fabricante, concentración, forma farmacéutica y precio máximo regulado por SISMED.

CUÁNDO USAR: cuando el usuario pregunta por el principio activo de un medicamento, si requiere fórmula médica, datos del laboratorio fabricante, o el precio regulado por el gobierno (no el precio de venta en farmacia).

LIMITACIÓN: es un MVP con datos locales hardcodeados, no consume INVIMA en tiempo real. Cubre los medicamentos más comunes. Si no encuentra el medicamento, indicar que la base es limitada.

RESPUESTA: ficha técnica con registro sanitario, nombre genérico, concentración, forma farmacéutica, laboratorio y precio SISMED (precio máximo de venta regulado). Este precio puede diferir del precio real en farmacia devuelto por buscar_medicamento.`,
      inputSchema: InfoMedicamentoSchema.shape,
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      try {
        const resultado = await infoMedicamentoUseCase.execute(input);
        const texto = formatearInfoMedicamento(resultado);
        return { content: [{ type: "text", text: texto }] };
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : "Error desconocido";
        return {
          content: [{
            type: "text",
            text: `Error al obtener información del medicamento: ${mensaje}\n\nIntenta con otro nombre o contacta soporte.`,
          }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "disponibilidad_farmacia",
    {
      description: `Verifica disponibilidad y precio de un medicamento en una cadena específica.

CUÁNDO USAR: cuando el usuario ya eligió una farmacia concreta y quiere confirmar si tienen el medicamento y a qué precio. Más rápido que buscar_medicamento porque solo consulta una cadena.

CADENAS VÁLIDAS: "farmatodo", "cruz-verde", "la-rebaja", "locatel", "colsubsidio", "cafam". La cadena "economia" no está integrada aún.

RESPUESTA: disponibilidad (true/false), precio actual, presentaciones encontradas y URL del producto en la web de la farmacia. Si no está disponible, indicar al usuario que pruebe buscar_medicamento para ver alternativas en otras cadenas.`,
      inputSchema: DisponibilidadFarmaciaSchema.shape,
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      try {
        if (input.farmacia === "economia") {
          return {
            content: [{
              type: "text",
              text: `⚠️ La cadena **Drogas La Economia** aun no esta integrada en tiempo real en esta version.\n\nPuedes usar **buscar_medicamento** para consultar las cadenas actualmente disponibles: Farmatodo, Cruz Verde, La Rebaja, Locatel, Colsubsidio y Cafam.`,
            }],
          };
        }

        const resultado = await disponibilidadFarmaciaUseCase.execute(input);
        const texto = formatearDisponibilidadFarmacia(resultado);
        return { content: [{ type: "text", text: texto }] };
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : "Error desconocido";
        return {
          content: [{
            type: "text",
            text: `Error al verificar disponibilidad: ${mensaje}\n\nIntenta nuevamente o usa **buscar_medicamento** para consultar todas las farmacias.`,
          }],
          isError: true,
        };
      }
    }
  );

  return server;
}
