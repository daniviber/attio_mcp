import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AttioClient } from "../api/client.js";
import type { AttioNote, PaginatedResponse, SingleResponse } from "../api/types.js";
import { formatError, AttioError } from "../utils/errors.js";
import { ObjectIdentifierSchema, RecordIdSchema, PaginationSchema } from "../schemas/common.js";

export function registerNoteTools(server: McpServer, client: AttioClient): void {
  // List Notes
  server.tool(
    "attio_notes_list",
    "List notes, optionally filtered by parent record",
    {
      parent_object: ObjectIdentifierSchema.optional().describe(
        "Filter by object (e.g., 'people', 'companies')"
      ),
      parent_record_id: RecordIdSchema.optional().describe(
        "Filter by specific record ID"
      ),
      ...PaginationSchema.shape,
    },
    async ({ parent_object, parent_record_id, limit, offset }) => {
      try {
        const response = await client.get<PaginatedResponse<AttioNote>>(
          "/v2/notes",
          {
            parent_object,
            parent_record_id,
            limit: Math.min(limit, 50), // Notes API has max 50
            offset,
          }
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  count: response.data.length,
                  notes: response.data,
                },
                null,
                2
              ),
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

  // Get Note
  server.tool(
    "attio_notes_get",
    "Get a single note by its ID",
    {
      note_id: z.string().describe("Note UUID"),
    },
    async ({ note_id }) => {
      try {
        const response = await client.get<SingleResponse<AttioNote>>(
          `/v2/notes/${encodeURIComponent(note_id)}`
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

  // Create Note
  server.tool(
    "attio_notes_create",
    "Create a new note attached to a record",
    {
      parent_object: ObjectIdentifierSchema,
      parent_record_id: RecordIdSchema,
      title: z.string().describe("Note title"),
      content: z.string().describe("Note content in markdown format"),
    },
    async ({ parent_object, parent_record_id, title, content }) => {
      try {
        const response = await client.post<SingleResponse<AttioNote>>(
          "/v2/notes",
          {
            data: {
              parent_object,
              parent_record_id,
              title,
              format: "markdown",
              content,
            },
          }
        );
        return {
          content: [
            {
              type: "text",
              text: `Note created successfully:\n${JSON.stringify(response.data, null, 2)}`,
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

  // Delete Note
  server.tool(
    "attio_notes_delete",
    "Delete a note permanently",
    {
      note_id: z.string().describe("Note UUID to delete"),
    },
    async ({ note_id }) => {
      try {
        await client.delete(`/v2/notes/${encodeURIComponent(note_id)}`);
        return {
          content: [
            {
              type: "text",
              text: `Note ${note_id} deleted successfully.`,
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
