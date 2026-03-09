#!/usr/bin/env node

import { loadConfig } from "./config/index.js";
import { startHttpServer } from "./transports/http.js";
import { startStdioServer } from "./transports/stdio.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const useHttp = process.argv.includes("--http") || process.env.MCP_TRANSPORT === "http";

  if (useHttp) {
    await startHttpServer(config);
  } else {
    await startStdioServer(config);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
