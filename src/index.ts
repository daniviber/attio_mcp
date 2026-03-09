#!/usr/bin/env node

import { loadConfig } from "./config/index.js";
import { startHttpServer } from "./transports/http.js";
import { startStdioServer } from "./transports/stdio.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const useStdio = process.argv.includes("--stdio") || process.env.MCP_TRANSPORT === "stdio";

  if (useStdio) {
    await startStdioServer(config);
  } else {
    await startHttpServer(config);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
