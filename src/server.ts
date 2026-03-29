import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  BuscarMedicamentoSchema,
  CompararPreciosSchema,
  FarmaciasCercanasSchema,
  InfoMedicamentoSchema,
  DisponibilidadFarmaciaSchema,
  type BuscarMedicamentoInput,
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

  server.tool(
    "buscar_medicamento",
    "Busca un medicamento en todas las farmacias colombianas disponibles (Farmatodo, Cruz Verde, La Rebaja, Locatel y Colsubsidio) y retorna los resultados ordenados por precio de menor a mayor. Si se proveen coordenadas GPS, también ordena por distancia.",
    BuscarMedicamentoSchema.shape,
    async (input: BuscarMedicamentoInput) => {
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

  server.tool(
    "comparar_precios",
    "Genera una tabla comparativa de precios de un medicamento entre todas las farmacias disponibles, incluyendo equivalentes genéricos si se solicita.",
    CompararPreciosSchema.shape,
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

  server.tool(
    "farmacias_cercanas",
    "Encuentra las farmacias más cercanas a una ubicación GPS en Colombia. Opcionalmente filtra por disponibilidad de un medicamento específico.",
    FarmaciasCercanasSchema.shape,
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

  server.tool(
    "info_medicamento",
    "Obtiene información oficial del medicamento desde el registro INVIMA de Colombia: registro sanitario, principio activo, laboratorio, concentración y precio máximo regulado por SISMED.",
    InfoMedicamentoSchema.shape,
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

  server.tool(
    "disponibilidad_farmacia",
    "Verifica la disponibilidad y precio de un medicamento específico en una cadena de farmacias particular.",
    DisponibilidadFarmaciaSchema.shape,
    async (input) => {
      try {
        if (input.farmacia === "economia") {
          return {
            content: [{
              type: "text",
              text: `⚠️ La cadena **Drogas La Economia** aun no esta integrada en tiempo real en esta version.\n\nPuedes usar **buscar_medicamento** para consultar las cadenas actualmente disponibles: Farmatodo, Cruz Verde, La Rebaja, Locatel y Colsubsidio.`,
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
