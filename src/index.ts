#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config/index.js";
import { createServer } from "./server.js";
import { startHttpServer } from "./transports/http.js";

async function main(): Promise<void> {
  // Load configuration
  const config = loadConfig();

  // Determine transport from args or config
  const args = process.argv.slice(2);
  const transportArg = args.find((arg) => arg.startsWith("--transport="));
  const transportFlag = args.includes("--transport")
    ? args[args.indexOf("--transport") + 1]
    : undefined;
  const transport = transportArg?.split("=")[1] || transportFlag || config.transport;

  if (transport === "http") {
    // Start HTTP transport server
    await startHttpServer(config);
  } else {
    // Default: stdio transport
    const server = createServer(config);
    const stdioTransport = new StdioServerTransport();

    // Connect server to transport
    await server.connect(stdioTransport);

    // Log startup (to stderr so it doesn't interfere with stdio protocol)
    console.error("Attio MCP Server started (stdio transport)");
  }
}

// Run
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
