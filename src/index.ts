#!/usr/bin/env node

import { loadConfig } from "./config/index.js";
import { startHttpServer } from "./transports/http.js";

async function main(): Promise<void> {
  const config = loadConfig();
  await startHttpServer(config);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
