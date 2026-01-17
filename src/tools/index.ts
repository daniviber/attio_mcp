import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AttioClient } from "../api/client.js";
import { registerObjectTools } from "./objects.js";
import { registerRecordTools } from "./records.js";
import { registerListTools } from "./lists.js";
import { registerNoteTools } from "./notes.js";
import { registerTaskTools } from "./tasks.js";
import { registerWorkspaceTools } from "./workspace.js";
import { registerCommentTools } from "./comments.js";
import { registerWebhookTools } from "./webhooks.js";

/**
 * Register all Attio MCP tools with the server
 */
export function registerAllTools(server: McpServer, client: AttioClient): void {
  // Object & Attribute tools
  registerObjectTools(server, client);

  // Record tools (CRUD + search)
  registerRecordTools(server, client);

  // List & Entry tools
  registerListTools(server, client);

  // Note tools
  registerNoteTools(server, client);

  // Task tools
  registerTaskTools(server, client);

  // Workspace tools
  registerWorkspaceTools(server, client);

  // Comment & Thread tools
  registerCommentTools(server, client);

  // Webhook tools
  registerWebhookTools(server, client);
}

// Re-export individual tool registrations for selective use
export {
  registerObjectTools,
  registerRecordTools,
  registerListTools,
  registerNoteTools,
  registerTaskTools,
  registerWorkspaceTools,
  registerCommentTools,
  registerWebhookTools,
};
