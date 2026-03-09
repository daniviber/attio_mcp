import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Config } from "../config/index.js";
import { createServer } from "../server.js";

export async function startStdioServer(config: Config): Promise<void> {
  const apiKey = process.env.ATTIO_API_KEY;
  if (!apiKey) {
    throw new Error("ATTIO_API_KEY environment variable is required for stdio transport");
  }

  const server = createServer(config, apiKey);
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error("Attio MCP Server (stdio) connected");
}
