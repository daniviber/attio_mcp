import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AttioClient } from "../api/client.js";
import type { AttioTask, PaginatedResponse, SingleResponse } from "../api/types.js";
import { formatError, AttioError } from "../utils/errors.js";
import { ObjectIdentifierSchema, RecordIdSchema, PaginationSchema } from "../schemas/common.js";

const LinkedRecordSchema = z.object({
  target_object: ObjectIdentifierSchema,
  target_record_id: RecordIdSchema,
});

export function registerTaskTools(server: McpServer, client: AttioClient): void {
  // List Tasks
  server.tool(
    "attio_tasks_list",
    "List tasks with optional filters for assignee, completion status, and linked records",
    {
      ...PaginationSchema.shape,
      sort: z
        .enum(["created_at:asc", "created_at:desc"])
        .default("created_at:desc")
        .describe("Sort order"),
      linked_object: ObjectIdentifierSchema.optional().describe(
        "Filter by linked object type"
      ),
      linked_record_id: RecordIdSchema.optional().describe(
        "Filter by linked record ID"
      ),
      assignee: z
        .string()
        .optional()
        .describe("Filter by assignee (email or workspace member ID)"),
      is_completed: z
        .boolean()
        .optional()
        .describe("Filter by completion status"),
    },
    async ({ limit, offset, sort, linked_object, linked_record_id, assignee, is_completed }) => {
      try {
        const response = await client.get<PaginatedResponse<AttioTask>>(
          "/v2/tasks",
          {
            limit,
            offset,
            sort,
            linked_object,
            linked_record_id,
            assignee,
            is_completed,
          }
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  count: response.data.length,
                  tasks: response.data,
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

  // Get Task
  server.tool(
    "attio_tasks_get",
    "Get a single task by its ID",
    {
      task_id: z.string().describe("Task UUID"),
    },
    async ({ task_id }) => {
      try {
        const response = await client.get<SingleResponse<AttioTask>>(
          `/v2/tasks/${encodeURIComponent(task_id)}`
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

  // Create Task
  server.tool(
    "attio_tasks_create",
    "Create a new task, optionally linked to records and assigned to workspace members",
    {
      content: z.string().describe("Task description/content"),
      deadline_at: z
        .string()
        .optional()
        .describe("Deadline in ISO 8601 format (e.g., '2024-12-31T23:59:59Z')"),
      linked_records: z
        .array(LinkedRecordSchema)
        .optional()
        .describe("Records to link the task to"),
      assignees: z
        .array(z.string())
        .optional()
        .describe("Workspace member IDs or emails to assign"),
    },
    async ({ content, deadline_at, linked_records, assignees }) => {
      try {
        const response = await client.post<SingleResponse<AttioTask>>(
          "/v2/tasks",
          {
            data: {
              content,
              format: "plaintext",
              ...(deadline_at && { deadline_at }),
              ...(linked_records && { linked_records }),
              ...(assignees && { assignees }),
            },
          }
        );
        return {
          content: [
            {
              type: "text",
              text: `Task created successfully:\n${JSON.stringify(response.data, null, 2)}`,
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

  // Update Task
  server.tool(
    "attio_tasks_update",
    "Update a task's deadline, completion status, linked records, or assignees",
    {
      task_id: z.string().describe("Task UUID to update"),
      deadline_at: z
        .string()
        .nullable()
        .optional()
        .describe("New deadline (ISO 8601) or null to remove"),
      is_completed: z.boolean().optional().describe("Mark as completed or incomplete"),
      linked_records: z
        .array(LinkedRecordSchema)
        .optional()
        .describe("Replace linked records"),
      assignees: z
        .array(z.string())
        .optional()
        .describe("Replace assignees"),
    },
    async ({ task_id, deadline_at, is_completed, linked_records, assignees }) => {
      try {
        const updateData: Record<string, unknown> = {};
        if (deadline_at !== undefined) updateData.deadline_at = deadline_at;
        if (is_completed !== undefined) updateData.is_completed = is_completed;
        if (linked_records !== undefined) updateData.linked_records = linked_records;
        if (assignees !== undefined) updateData.assignees = assignees;

        const response = await client.patch<SingleResponse<AttioTask>>(
          `/v2/tasks/${encodeURIComponent(task_id)}`,
          { data: updateData }
        );
        return {
          content: [
            {
              type: "text",
              text: `Task updated successfully:\n${JSON.stringify(response.data, null, 2)}`,
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

  // Delete Task
  server.tool(
    "attio_tasks_delete",
    "Delete a task permanently",
    {
      task_id: z.string().describe("Task UUID to delete"),
    },
    async ({ task_id }) => {
      try {
        await client.delete(`/v2/tasks/${encodeURIComponent(task_id)}`);
        return {
          content: [
            {
              type: "text",
              text: `Task ${task_id} deleted successfully.`,
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

  // Complete Task (convenience wrapper)
  server.tool(
    "attio_tasks_complete",
    "Mark a task as completed",
    {
      task_id: z.string().describe("Task UUID to complete"),
    },
    async ({ task_id }) => {
      try {
        const response = await client.patch<SingleResponse<AttioTask>>(
          `/v2/tasks/${encodeURIComponent(task_id)}`,
          { data: { is_completed: true } }
        );
        return {
          content: [
            {
              type: "text",
              text: `Task marked as completed:\n${JSON.stringify(response.data, null, 2)}`,
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
