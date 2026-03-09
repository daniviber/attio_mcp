# Attio MCP Server

A Model Context Protocol (MCP) server that provides AI assistants with access to Attio CRM data and functionality.

## Features

- **Records Management**: Create, read, update, delete, and search records across all Attio objects
- **Lists & Entries**: Manage lists and add/remove records from lists
- **Notes**: Create and manage notes attached to records
- **Tasks**: Create, assign, and complete tasks
- **Comments & Threads**: Manage comment threads on records
- **Webhooks**: Configure webhooks for event notifications
- **Workspace**: Access workspace member information
- **Dual Transport**: Supports both stdio (local) and HTTP Streamable (remote) transports

## Installation

```bash
npm install
npm run build
```

## Authentication

Each client authenticates using their own **Attio API token**. There is no separate server-level auth — the Attio token is the identity.

- **Stdio mode**: Token is provided via the `ATTIO_API_KEY` environment variable
- **HTTP mode**: Token is provided via the `Authorization: Bearer <token>` header on every request

### Getting an API Key

1. Go to your Attio workspace settings
2. Navigate to **Developers** > **API Keys**
3. Create a new API key with the necessary scopes:
   - `object_configuration:read`
   - `record_permission:read-write`
   - `list_configuration:read`
   - `list_entry:read-write`
   - `note:read-write`
   - `task:read-write`
   - `user_management:read`

## Usage

### Stdio Transport (local / Claude Desktop)

Best for local use — single-tenant, one process per user. The Attio API token is read from the `ATTIO_API_KEY` environment variable.

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "attio": {
      "command": "node",
      "args": ["/path/to/attio_mcp/dist/index.js", "--stdio"],
      "env": {
        "ATTIO_API_KEY": "your_api_key"
      }
    }
  }
}
```

Or run directly:

```bash
ATTIO_API_KEY=your_api_key node dist/index.js --stdio
```

### HTTP Streamable Transport (remote / multi-tenant)

Best for hosted deployments — multi-tenant, each connecting client provides their own Attio API token via the `Authorization` header.

Start the server:

```bash
node dist/index.js
```

The server will start on `http://0.0.0.0:3000/mcp` by default.

Connect by sending requests with your Attio token:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer your_attio_api_key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","clientInfo":{"name":"test","version":"1.0"}},"id":1}'
```

Each session is scoped to the token that created it. Subsequent requests must include the same token and the `Mcp-Session-Id` header returned during initialization.

#### Using with mcp-remote adapter

For Claude Desktop to connect to a remote HTTP server:

```json
{
  "mcpServers": {
    "attio-remote": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://your-server.com/mcp"],
      "env": {
        "AUTHORIZATION": "Bearer your_attio_api_key"
      }
    }
  }
}
```

## Configuration

### Environment Variables

| Variable | Default | Transport | Description |
|----------|---------|-----------|-------------|
| `ATTIO_API_KEY` | - | stdio (required) | Attio API token for stdio transport |
| `ATTIO_BASE_URL` | `https://api.attio.com` | both | Attio API base URL |
| `ATTIO_TIMEOUT_MS` | `30000` | both | Request timeout in milliseconds |
| `ATTIO_RETRY_ATTEMPTS` | `3` | both | Number of retry attempts |
| `MCP_TRANSPORT` | - | - | Set to `stdio` to use stdio (alternative to `--stdio` flag) |
| `MCP_PORT` | `3000` | http | HTTP server port |
| `MCP_HOST` | `0.0.0.0` | http | HTTP server bind address |
| `MCP_ALLOWED_ORIGINS` | - | http | Comma-separated allowed CORS origins |
| `MCP_SESSION_TTL_SECONDS` | `3600` | http | Session timeout in seconds |
| `MCP_MAX_SESSIONS` | `1000` | http | Maximum concurrent sessions |
| `LOG_LEVEL` | `info` | both | Log level (`debug`, `info`, `warn`, `error`) |

### Transport Selection

| Method | Result |
|--------|--------|
| `node dist/index.js --stdio` | Stdio transport |
| `MCP_TRANSPORT=stdio node dist/index.js` | Stdio transport |
| `node dist/index.js` | HTTP transport (default) |

### HTTP Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp` | POST/GET/DELETE | MCP Streamable HTTP endpoint |
| `/health` | GET | Health check (no auth required) |

## Available Tools

### Objects & Attributes

| Tool | Description |
|------|-------------|
| `attio_objects_list` | List all objects in the workspace |
| `attio_objects_get` | Get details of a specific object |
| `attio_attributes_list` | List attributes for an object or list |

### Records

| Tool | Description |
|------|-------------|
| `attio_records_list` | Query records with filtering and sorting |
| `attio_records_get` | Get a single record by ID |
| `attio_records_create` | Create a new record |
| `attio_records_update` | Update a record (append multiselect values) |
| `attio_records_update_overwrite` | Update a record (overwrite multiselect values) |
| `attio_records_delete` | Delete a record |
| `attio_records_assert` | Create or update based on matching attribute |
| `attio_records_search` | Fuzzy search across objects |

### Lists & Entries

| Tool | Description |
|------|-------------|
| `attio_lists_list` | List all lists |
| `attio_lists_get` | Get list details |
| `attio_entries_list` | Query entries in a list |
| `attio_entries_get` | Get a single entry |
| `attio_entries_create` | Add a record to a list |
| `attio_entries_update` | Update entry attributes |
| `attio_entries_delete` | Remove a record from a list |

### Notes

| Tool | Description |
|------|-------------|
| `attio_notes_list` | List notes (optionally filtered by record) |
| `attio_notes_get` | Get a single note |
| `attio_notes_create` | Create a note attached to a record |
| `attio_notes_delete` | Delete a note |

### Tasks

| Tool | Description |
|------|-------------|
| `attio_tasks_list` | List tasks with filters |
| `attio_tasks_get` | Get a single task |
| `attio_tasks_create` | Create a new task |
| `attio_tasks_update` | Update task properties |
| `attio_tasks_complete` | Mark a task as completed |
| `attio_tasks_delete` | Delete a task |

### Comments & Threads

| Tool | Description |
|------|-------------|
| `attio_threads_list` | List comment threads |
| `attio_threads_get` | Get a thread with all comments |
| `attio_threads_resolve` | Mark a thread as resolved |
| `attio_comments_create` | Create a new comment |
| `attio_comments_delete` | Delete a comment |

### Webhooks

| Tool | Description |
|------|-------------|
| `attio_webhooks_list` | List all webhooks |
| `attio_webhooks_get` | Get webhook details |
| `attio_webhooks_create` | Create a new webhook |
| `attio_webhooks_update` | Update a webhook |
| `attio_webhooks_delete` | Delete a webhook |

### Workspace

| Tool | Description |
|------|-------------|
| `attio_workspace_members_list` | List all workspace members |
| `attio_workspace_members_get` | Get a specific workspace member |

## MCP Resources

The server also exposes read-only resources for AI context:

| Resource URI | Description |
|--------------|-------------|
| `attio://objects` | List of all Attio objects |
| `attio://lists` | List of all available lists |
| `attio://workspace/members` | Workspace members for task assignment |

## Example Usage

Once configured, you can ask Claude:

- "List all companies in Attio"
- "Search for records containing 'Acme'"
- "Create a new person record with email john@example.com"
- "Add a note to the company record for Acme Corp"
- "Create a task to follow up with John, due next Friday"
- "Show me all incomplete tasks assigned to me"

## Development

```bash
# Run in development mode (HTTP, default)
npm run dev

# Run tests
npm test

# Type check
npm run lint
```

## Rate Limits

The server respects Attio's rate limits:
- Read requests: 100/second
- Write requests: 25/second

The built-in rate limiter automatically handles throttling.

## License

MIT
