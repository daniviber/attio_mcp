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

## Configuration

Create a `.env` file based on `.env.example`:

```env
# Required
ATTIO_API_KEY=your_api_key_here

# Optional
ATTIO_BASE_URL=https://api.attio.com
LOG_LEVEL=info
```

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

### Local Mode (stdio transport)

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "attio": {
      "command": "node",
      "args": ["/path/to/attio_mcp/dist/index.js"],
      "env": {
        "ATTIO_API_KEY": "your_api_key"
      }
    }
  }
}
```

### Remote Mode (HTTP Streamable transport)

Start the server in HTTP mode:

```bash
# Using environment variable
MCP_TRANSPORT=http ATTIO_API_KEY=your_api_key node dist/index.js

# Or using command line flag
ATTIO_API_KEY=your_api_key node dist/index.js --transport http
```

The server will start on `http://127.0.0.1:3000/mcp` by default.

#### HTTP Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `MCP_TRANSPORT` | `stdio` | Transport mode (`stdio` or `http`) |
| `MCP_PORT` | `3000` | HTTP server port |
| `MCP_HOST` | `127.0.0.1` | HTTP server bind address |
| `MCP_AUTH_TOKEN` | - | Bearer token for authentication (optional) |
| `MCP_ALLOWED_ORIGINS` | - | Comma-separated allowed CORS origins |
| `MCP_SESSION_TTL_SECONDS` | `3600` | Session timeout in seconds |
| `MCP_MAX_SESSIONS` | `1000` | Maximum concurrent sessions |

#### Using with mcp-remote adapter

For Claude Desktop to connect to a remote HTTP server:

```json
{
  "mcpServers": {
    "attio-remote": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://your-server.com/mcp"],
      "env": {
        "MCP_AUTH_TOKEN": "your_auth_token"
      }
    }
  }
}
```

#### HTTP Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp` | POST/GET | MCP Streamable HTTP endpoint |
| `/health` | GET | Health check endpoint |

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
# Run in development mode
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
