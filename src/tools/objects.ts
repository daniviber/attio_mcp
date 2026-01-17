import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AttioClient } from "../api/client.js";
import type { AttioObject, AttioAttribute, PaginatedResponse, SingleResponse } from "../api/types.js";
import { formatError, AttioError } from "../utils/errors.js";
import { ObjectIdentifierSchema, PaginationSchema } from "../schemas/common.js";

export function registerObjectTools(server: McpServer, client: AttioClient): void {
  // List Objects
  server.tool(
    "attio_objects_list",
    "List all objects (standard and custom) in the Attio workspace",
    {},
    async () => {
      try {
        const response = await client.get<PaginatedResponse<AttioObject>>("/v2/objects");
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

  // Get Object
  server.tool(
    "attio_objects_get",
    "Get details of a specific object including its configuration",
    {
      object: ObjectIdentifierSchema,
    },
    async ({ object }) => {
      try {
        const response = await client.get<SingleResponse<AttioObject>>(
          `/v2/objects/${encodeURIComponent(object)}`
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

  // List Attributes
  server.tool(
    "attio_attributes_list",
    "List all attributes defined on an object or list",
    {
      target: z.enum(["objects", "lists"]).describe("Whether to list attributes for an object or list"),
      identifier: z.string().describe("Object or list slug/UUID"),
      ...PaginationSchema.shape,
      show_archived: z.boolean().default(false).describe("Include archived attributes"),
    },
    async ({ target, identifier, limit, offset, show_archived }) => {
      try {
        const response = await client.get<PaginatedResponse<AttioAttribute>>(
          `/v2/${target}/${encodeURIComponent(identifier)}/attributes`,
          { limit, offset, show_archived }
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
