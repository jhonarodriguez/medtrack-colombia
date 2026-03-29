#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { validateEnv } from "./config/env.js";

async function main() {
  validateEnv();

  const server = createServer();
  const transport = new StdioServerTransport();
  
  process.stderr.write("[mcp-medicamentos-colombia] Iniciando servidor...\n");

  await server.connect(transport);

  process.stderr.write("[mcp-medicamentos-colombia] Servidor listo. Esperando conexiones MCP.\n");
}

main().catch((err) => {
  process.stderr.write(`[mcp-medicamentos-colombia] Error fatal: ${err.message}\n`);
  process.exit(1);
});
