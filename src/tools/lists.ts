import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AttioClient } from "../api/client.js";
import type { AttioList, AttioEntry, PaginatedResponse, SingleResponse } from "../api/types.js";
import { formatError, AttioError } from "../utils/errors.js";
import {
  ListIdentifierSchema,
  EntryIdSchema,
  PaginationSchema,
  SortSchema,
  AttributeValuesSchema,
} from "../schemas/common.js";

export function registerListTools(server: McpServer, client: AttioClient): void {
  // List Lists
  server.tool(
    "attio_lists_list",
    "List all lists in the workspace that your API key has access to",
    {},
    async () => {
      try {
        const response = await client.get<PaginatedResponse<AttioList>>("/v2/lists");
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

  // Get List
  server.tool(
    "attio_lists_get",
    "Get details of a specific list",
    {
      list: ListIdentifierSchema,
    },
    async ({ list }) => {
      try {
        const response = await client.get<SingleResponse<AttioList>>(
          `/v2/lists/${encodeURIComponent(list)}`
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

  // List/Query Entries
  server.tool(
    "attio_entries_list",
    "Query entries in a list with optional filtering and sorting",
    {
      list: ListIdentifierSchema,
      filter: z
        .record(z.unknown())
        .optional()
        .describe("Filter criteria"),
      sorts: z
        .array(SortSchema)
        .optional()
        .describe("Sort configuration"),
      ...PaginationSchema.shape,
    },
    async ({ list, filter, sorts, limit, offset }) => {
      try {
        const response = await client.post<PaginatedResponse<AttioEntry>>(
          `/v2/lists/${encodeURIComponent(list)}/entries/query`,
          { filter, sorts, limit, offset }
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  count: response.data.length,
                  entries: response.data,
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

  // Get Entry
  server.tool(
    "attio_entries_get",
    "Get a single list entry by its ID",
    {
      list: ListIdentifierSchema,
      entry_id: EntryIdSchema,
    },
    async ({ list, entry_id }) => {
      try {
        const response = await client.get<SingleResponse<AttioEntry>>(
          `/v2/lists/${encodeURIComponent(list)}/entries/${encodeURIComponent(entry_id)}`
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

  // Create Entry
  server.tool(
    "attio_entries_create",
    "Add a record to a list (create a new entry)",
    {
      list: ListIdentifierSchema,
      parent_record_id: z.string().describe("ID of the record to add to the list"),
      parent_object: z.string().describe("Object slug of the parent record"),
      values: AttributeValuesSchema.optional().describe("Optional entry attribute values"),
    },
    async ({ list, parent_record_id, parent_object, values }) => {
      try {
        const response = await client.post<SingleResponse<AttioEntry>>(
          `/v2/lists/${encodeURIComponent(list)}/entries`,
          {
            data: {
              parent_record_id,
              parent_object,
              ...(values && { values }),
            },
          }
        );
        return {
          content: [
            {
              type: "text",
              text: `Entry created successfully:\n${JSON.stringify(response.data, null, 2)}`,
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

  // Update Entry (PATCH - append multiselect)
  server.tool(
    "attio_entries_update",
    "Update an entry's attributes. For multiselect attributes, values are appended.",
    {
      list: ListIdentifierSchema,
      entry_id: EntryIdSchema,
      values: AttributeValuesSchema,
    },
    async ({ list, entry_id, values }) => {
      try {
        const response = await client.patch<SingleResponse<AttioEntry>>(
          `/v2/lists/${encodeURIComponent(list)}/entries/${encodeURIComponent(entry_id)}`,
          { data: { values } }
        );
        return {
          content: [
            {
              type: "text",
              text: `Entry updated successfully:\n${JSON.stringify(response.data, null, 2)}`,
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

  // Delete Entry
  server.tool(
    "attio_entries_delete",
    "Remove a record from a list (delete the entry). This does not delete the underlying record.",
    {
      list: ListIdentifierSchema,
      entry_id: EntryIdSchema,
    },
    async ({ list, entry_id }) => {
      try {
        await client.delete(
          `/v2/lists/${encodeURIComponent(list)}/entries/${encodeURIComponent(entry_id)}`
        );
        return {
          content: [
            {
              type: "text",
              text: `Entry ${entry_id} removed from list successfully.`,
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
