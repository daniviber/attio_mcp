import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AttioClient } from "../api/client.js";
import type { AttioRecord, PaginatedResponse, SingleResponse } from "../api/types.js";
import { formatError, AttioError } from "../utils/errors.js";
import {
  ObjectIdentifierSchema,
  RecordIdSchema,
  PaginationSchema,
  SortSchema,
  AttributeValuesSchema,
} from "../schemas/common.js";

export function registerRecordTools(server: McpServer, client: AttioClient): void {
  // List/Query Records
  server.tool(
    "attio_records_list",
    "Query records from an object with optional filtering and sorting. Use this to search for people, companies, deals, or custom object records.",
    {
      object: ObjectIdentifierSchema,
      filter: z
        .record(z.unknown())
        .optional()
        .describe("Filter criteria (see Attio filter docs for structure)"),
      sorts: z
        .array(SortSchema)
        .optional()
        .describe("Sort configuration"),
      ...PaginationSchema.shape,
    },
    async ({ object, filter, sorts, limit, offset }) => {
      try {
        const response = await client.post<PaginatedResponse<AttioRecord>>(
          `/v2/objects/${encodeURIComponent(object)}/records/query`,
          { filter, sorts, limit, offset }
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  count: response.data.length,
                  records: response.data,
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

  // Get Record
  server.tool(
    "attio_records_get",
    "Get a single record by its ID",
    {
      object: ObjectIdentifierSchema,
      record_id: RecordIdSchema,
    },
    async ({ object, record_id }) => {
      try {
        const response = await client.get<SingleResponse<AttioRecord>>(
          `/v2/objects/${encodeURIComponent(object)}/records/${encodeURIComponent(record_id)}`
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

  // Create Record
  server.tool(
    "attio_records_create",
    "Create a new record in an object. Will fail if a record with the same unique attributes already exists.",
    {
      object: ObjectIdentifierSchema,
      values: AttributeValuesSchema,
    },
    async ({ object, values }) => {
      try {
        const response = await client.post<SingleResponse<AttioRecord>>(
          `/v2/objects/${encodeURIComponent(object)}/records`,
          { data: { values } }
        );
        return {
          content: [
            {
              type: "text",
              text: `Record created successfully:\n${JSON.stringify(response.data, null, 2)}`,
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

  // Update Record (PATCH - append multiselect)
  server.tool(
    "attio_records_update",
    "Update a record's attributes. For multiselect attributes, values are appended (not replaced). Use attio_records_update_overwrite to replace multiselect values.",
    {
      object: ObjectIdentifierSchema,
      record_id: RecordIdSchema,
      values: AttributeValuesSchema,
    },
    async ({ object, record_id, values }) => {
      try {
        const response = await client.patch<SingleResponse<AttioRecord>>(
          `/v2/objects/${encodeURIComponent(object)}/records/${encodeURIComponent(record_id)}`,
          { data: { values } }
        );
        return {
          content: [
            {
              type: "text",
              text: `Record updated successfully:\n${JSON.stringify(response.data, null, 2)}`,
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

  // Update Record (PUT - overwrite multiselect)
  server.tool(
    "attio_records_update_overwrite",
    "Update a record's attributes, overwriting multiselect values completely (instead of appending).",
    {
      object: ObjectIdentifierSchema,
      record_id: RecordIdSchema,
      values: AttributeValuesSchema,
    },
    async ({ object, record_id, values }) => {
      try {
        const response = await client.put<SingleResponse<AttioRecord>>(
          `/v2/objects/${encodeURIComponent(object)}/records/${encodeURIComponent(record_id)}`,
          { data: { values } }
        );
        return {
          content: [
            {
              type: "text",
              text: `Record updated successfully:\n${JSON.stringify(response.data, null, 2)}`,
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

  // Delete Record
  server.tool(
    "attio_records_delete",
    "Delete a record permanently. This action cannot be undone.",
    {
      object: ObjectIdentifierSchema,
      record_id: RecordIdSchema,
    },
    async ({ object, record_id }) => {
      try {
        await client.delete(
          `/v2/objects/${encodeURIComponent(object)}/records/${encodeURIComponent(record_id)}`
        );
        return {
          content: [
            {
              type: "text",
              text: `Record ${record_id} deleted successfully.`,
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

  // Assert Record (upsert)
  server.tool(
    "attio_records_assert",
    "Create or update a record based on matching attributes. If a record with the matching attribute value exists, it will be updated; otherwise, a new record is created.",
    {
      object: ObjectIdentifierSchema,
      matching_attribute: z
        .string()
        .describe("Attribute slug to match on (e.g., 'email_addresses' for people)"),
      values: AttributeValuesSchema,
    },
    async ({ object, matching_attribute, values }) => {
      try {
        const response = await client.put<SingleResponse<AttioRecord>>(
          `/v2/objects/${encodeURIComponent(object)}/records`,
          {
            data: { values },
            matching_attribute,
          }
        );
        return {
          content: [
            {
              type: "text",
              text: `Record asserted successfully:\n${JSON.stringify(response.data, null, 2)}`,
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

  // Search Records
  server.tool(
    "attio_records_search",
    "Fuzzy search for records across one or more objects. Results may be eventually consistent.",
    {
      query: z.string().describe("Search query string"),
      objects: z
        .array(z.string())
        .optional()
        .describe("Object slugs to search in (omit to search all)"),
      limit: z
        .number()
        .min(1)
        .max(100)
        .default(20)
        .describe("Maximum results (1-100)"),
    },
    async ({ query, objects, limit }) => {
      try {
        const response = await client.post<PaginatedResponse<AttioRecord>>(
          "/v2/objects/records/search",
          { query, objects, limit }
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  count: response.data.length,
                  records: response.data,
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
}
