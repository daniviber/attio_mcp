import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AttioClient } from "../api/client.js";
import type { AttioWebhook, PaginatedResponse, SingleResponse } from "../api/types.js";
import { formatError, AttioError } from "../utils/errors.js";
import { PaginationSchema } from "../schemas/common.js";

const WebhookSubscriptionSchema = z.object({
  event_type: z
    .enum([
      "record.created",
      "record.updated",
      "record.deleted",
      "record.merged",
      "list-entry.created",
      "list-entry.updated",
      "list-entry.deleted",
      "note.created",
      "note.deleted",
      "task.created",
      "task.updated",
      "task.deleted",
    ])
    .describe("Event type to subscribe to"),
  filter: z
    .object({
      object: z.string().optional().describe("Filter by object slug"),
      list: z.string().optional().describe("Filter by list slug"),
    })
    .optional()
    .describe("Filter conditions for the subscription"),
});

export function registerWebhookTools(server: McpServer, client: AttioClient): void {
  // List Webhooks
  server.tool(
    "attio_webhooks_list",
    "List all webhooks configured in the workspace",
    {
      ...PaginationSchema.shape,
    },
    async ({ limit, offset }) => {
      try {
        const response = await client.get<PaginatedResponse<AttioWebhook>>(
          "/v2/webhooks",
          { limit, offset }
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  count: response.data.length,
                  webhooks: response.data,
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

  // Get Webhook
  server.tool(
    "attio_webhooks_get",
    "Get details of a specific webhook",
    {
      webhook_id: z.string().describe("Webhook UUID"),
    },
    async ({ webhook_id }) => {
      try {
        const response = await client.get<SingleResponse<AttioWebhook>>(
          `/v2/webhooks/${encodeURIComponent(webhook_id)}`
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

  // Create Webhook
  server.tool(
    "attio_webhooks_create",
    "Create a new webhook to receive event notifications",
    {
      target_url: z.string().url().describe("URL to send webhook events to"),
      subscriptions: z
        .array(WebhookSubscriptionSchema)
        .min(1)
        .describe("Event subscriptions"),
    },
    async ({ target_url, subscriptions }) => {
      try {
        const response = await client.post<SingleResponse<AttioWebhook>>(
          "/v2/webhooks",
          {
            data: {
              target_url,
              subscriptions,
            },
          }
        );
        return {
          content: [
            {
              type: "text",
              text: `Webhook created successfully:\n${JSON.stringify(response.data, null, 2)}`,
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

  // Update Webhook
  server.tool(
    "attio_webhooks_update",
    "Update a webhook's target URL or subscriptions",
    {
      webhook_id: z.string().describe("Webhook UUID to update"),
      target_url: z
        .string()
        .url()
        .optional()
        .describe("New URL to send webhook events to"),
      subscriptions: z
        .array(WebhookSubscriptionSchema)
        .optional()
        .describe("New event subscriptions (replaces existing)"),
    },
    async ({ webhook_id, target_url, subscriptions }) => {
      try {
        const updateData: Record<string, unknown> = {};
        if (target_url !== undefined) updateData.target_url = target_url;
        if (subscriptions !== undefined) updateData.subscriptions = subscriptions;

        const response = await client.patch<SingleResponse<AttioWebhook>>(
          `/v2/webhooks/${encodeURIComponent(webhook_id)}`,
          { data: updateData }
        );
        return {
          content: [
            {
              type: "text",
              text: `Webhook updated successfully:\n${JSON.stringify(response.data, null, 2)}`,
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

  // Delete Webhook
  server.tool(
    "attio_webhooks_delete",
    "Delete a webhook permanently",
    {
      webhook_id: z.string().describe("Webhook UUID to delete"),
    },
    async ({ webhook_id }) => {
      try {
        await client.delete(`/v2/webhooks/${encodeURIComponent(webhook_id)}`);
        return {
          content: [
            {
              type: "text",
              text: `Webhook ${webhook_id} deleted successfully.`,
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
