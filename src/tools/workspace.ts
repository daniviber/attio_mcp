import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AttioClient } from "../api/client.js";
import type { AttioWorkspaceMember, PaginatedResponse, SingleResponse } from "../api/types.js";
import { formatError, AttioError } from "../utils/errors.js";

export function registerWorkspaceTools(server: McpServer, client: AttioClient): void {
  // List Workspace Members
  server.tool(
    "attio_workspace_members_list",
    "List all workspace members (users who have access to the workspace)",
    {},
    async () => {
      try {
        const response = await client.get<PaginatedResponse<AttioWorkspaceMember>>(
          "/v2/workspace_members"
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: error instanceof AttioError ? formatError(error) : String(error),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Get Workspace Member
  server.tool(
    "attio_workspace_members_get",
    "Get details of a specific workspace member",
    {
      workspace_member_id: z.string().describe("Workspace member UUID"),
    },
    async ({ workspace_member_id }) => {
      try {
        const response = await client.get<SingleResponse<AttioWorkspaceMember>>(
          `/v2/workspace_members/${encodeURIComponent(workspace_member_id)}`
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: error instanceof AttioError ? formatError(error) : String(error),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
