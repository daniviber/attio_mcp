import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AttioClient } from "../api/client.js";
import type {
  AttioObject,
  AttioList,
  AttioWorkspaceMember,
  PaginatedResponse,
} from "../api/types.js";

/**
 * Register MCP resources that provide read-only context to AI assistants
 */
export function registerResources(server: McpServer, client: AttioClient): void {
  // List all objects resource
  server.resource(
    "attio://objects",
    "List of all Attio objects (standard and custom) in the workspace",
    async () => {
      try {
        const response = await client.get<PaginatedResponse<AttioObject>>("/v2/objects");
        return {
          contents: [
            {
              uri: "attio://objects",
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  description: "All objects available in this Attio workspace",
                  objects: response.data.map((obj) => ({
                    slug: obj.api_slug,
                    singular: obj.singular_noun,
                    plural: obj.plural_noun,
                    id: obj.id,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: "attio://objects",
              mimeType: "application/json",
              text: JSON.stringify({ error: String(error) }),
            },
          ],
        };
      }
    }
  );

  // List all lists resource
  server.resource(
    "attio://lists",
    "List of all available lists in the workspace",
    async () => {
      try {
        const response = await client.get<PaginatedResponse<AttioList>>("/v2/lists");
        return {
          contents: [
            {
              uri: "attio://lists",
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  description: "All lists available in this Attio workspace",
                  lists: response.data.map((list) => ({
                    slug: list.api_slug,
                    name: list.name,
                    parent_object: list.parent_object,
                    id: list.id,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: "attio://lists",
              mimeType: "application/json",
              text: JSON.stringify({ error: String(error) }),
            },
          ],
        };
      }
    }
  );

  // Workspace members resource
  server.resource(
    "attio://workspace/members",
    "List of workspace members for task assignment and mentions",
    async () => {
      try {
        const response = await client.get<PaginatedResponse<AttioWorkspaceMember>>(
          "/v2/workspace_members"
        );
        return {
          contents: [
            {
              uri: "attio://workspace/members",
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  description: "Workspace members available for task assignment and mentions",
                  members: response.data.map((member) => ({
                    id: member.id,
                    name: `${member.first_name} ${member.last_name}`.trim(),
                    email: member.email_address,
                    access_level: member.access_level,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: "attio://workspace/members",
              mimeType: "application/json",
              text: JSON.stringify({ error: String(error) }),
            },
          ],
        };
      }
    }
  );
}
