import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AttioClient } from "./api/client.js";
import { registerAllTools } from "./tools/index.js";
import { registerResources } from "./resources/index.js";
import type { Config } from "./config/index.js";

/**
 * Create and configure the Attio MCP server
 */
export function createServer(config: Config): McpServer {
  // Create MCP server
  const server = new McpServer({
    name: "attio-mcp-server",
    version: "1.0.0",
  });

  // Create Attio API client
  const attioClient = new AttioClient({
    apiKey: config.attio.apiKey,
    baseUrl: config.attio.baseUrl,
    timeoutMs: config.attio.timeoutMs,
    retryAttempts: config.attio.retryAttempts,
  });

  // Register all tools
  registerAllTools(server, attioClient);

  // Register resources
  registerResources(server, attioClient);

  return server;
}
