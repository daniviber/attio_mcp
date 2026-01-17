import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AttioClient } from "../api/client.js";
import type { AttioThread, AttioComment, PaginatedResponse, SingleResponse } from "../api/types.js";
import { formatError, AttioError } from "../utils/errors.js";
import { ObjectIdentifierSchema, RecordIdSchema, PaginationSchema } from "../schemas/common.js";

export function registerCommentTools(server: McpServer, client: AttioClient): void {
  // List Threads
  server.tool(
    "attio_threads_list",
    "List comment threads, optionally filtered by record",
    {
      record_id: RecordIdSchema.optional().describe(
        "Filter threads by record ID"
      ),
      object: ObjectIdentifierSchema.optional().describe(
        "Filter by object type (required if record_id is provided)"
      ),
      ...PaginationSchema.shape,
    },
    async ({ record_id, object, limit, offset }) => {
      try {
        const response = await client.get<PaginatedResponse<AttioThread>>(
          "/v2/threads",
          {
            record_id,
            object,
            limit,
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
                  threads: response.data,
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

  // Get Thread
  server.tool(
    "attio_threads_get",
    "Get a single thread with all its comments",
    {
      thread_id: z.string().describe("Thread UUID"),
    },
    async ({ thread_id }) => {
      try {
        const response = await client.get<SingleResponse<AttioThread>>(
          `/v2/threads/${encodeURIComponent(thread_id)}`
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

  // Create Comment
  server.tool(
    "attio_comments_create",
    "Create a new comment on a record. Creates a new thread if one doesn't exist.",
    {
      record_id: RecordIdSchema,
      object: ObjectIdentifierSchema,
      content: z.string().describe("Comment text content"),
      thread_id: z
        .string()
        .optional()
        .describe("Thread ID to add comment to (creates new thread if not provided)"),
    },
    async ({ record_id, object, content, thread_id }) => {
      try {
        const response = await client.post<SingleResponse<AttioComment>>(
          "/v2/comments",
          {
            data: {
              record_id,
              object,
              format: "plaintext",
              content,
              ...(thread_id && { thread_id }),
            },
          }
        );
        return {
          content: [
            {
              type: "text",
              text: `Comment created successfully:\n${JSON.stringify(response.data, null, 2)}`,
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

  // Delete Comment
  server.tool(
    "attio_comments_delete",
    "Delete a comment permanently",
    {
      comment_id: z.string().describe("Comment UUID to delete"),
    },
    async ({ comment_id }) => {
      try {
        await client.delete(`/v2/comments/${encodeURIComponent(comment_id)}`);
        return {
          content: [
            {
              type: "text",
              text: `Comment ${comment_id} deleted successfully.`,
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

  // Resolve Thread
  server.tool(
    "attio_threads_resolve",
    "Mark a thread as resolved",
    {
      thread_id: z.string().describe("Thread UUID to resolve"),
    },
    async ({ thread_id }) => {
      try {
        const response = await client.post<SingleResponse<AttioThread>>(
          `/v2/threads/${encodeURIComponent(thread_id)}/resolve`,
          {}
        );
        return {
          content: [
            {
              type: "text",
              text: `Thread resolved successfully:\n${JSON.stringify(response.data, null, 2)}`,
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
