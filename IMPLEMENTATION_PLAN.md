# Attio CRM MCP Server - Implementation Plan

## Overview

This document outlines the implementation plan for building a Model Context Protocol (MCP) server that integrates with Attio CRM. The server will expose Attio's functionality as MCP tools, enabling AI assistants to interact with CRM data.

---

## 1. Project Architecture

### 1.1 Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Node.js 20+ | Native TypeScript support, async/await |
| Language | TypeScript 5.x | Type safety, better DX |
| MCP SDK | `@modelcontextprotocol/sdk` v1.x | Stable, production-ready |
| Validation | Zod | Required by MCP SDK |
| HTTP Client | Native `fetch` or `axios` | API calls to Attio |
| Transport | stdio + Streamable HTTP | Local and remote deployment |

### 1.2 Transport Options

| Transport | Use Case | Complexity |
|-----------|----------|------------|
| **stdio** | Local (Claude Desktop, Cursor) | Low |
| **Streamable HTTP** | Remote servers, multi-client, team sharing | Medium |
| **HTTP + SSE** | Legacy compatibility (deprecated) | Medium |

### 1.3 Directory Structure

```
attio_mcp/
├── src/
│   ├── index.ts                 # Entry point, server initialization
│   ├── server.ts                # MCP server configuration
│   ├── config/
│   │   └── index.ts             # Environment config, constants
│   ├── api/
│   │   ├── client.ts            # Attio API client wrapper
│   │   ├── types.ts             # API response/request types
│   │   └── endpoints/
│   │       ├── objects.ts       # Object API methods
│   │       ├── records.ts       # Record API methods
│   │       ├── lists.ts         # List API methods
│   │       ├── entries.ts       # Entry API methods
│   │       ├── attributes.ts    # Attribute API methods
│   │       ├── notes.ts         # Notes API methods
│   │       ├── tasks.ts         # Tasks API methods
│   │       ├── comments.ts      # Comments API methods
│   │       ├── webhooks.ts      # Webhooks API methods
│   │       └── workspace.ts     # Workspace members API
│   ├── tools/
│   │   ├── index.ts             # Tool registration hub
│   │   ├── records.tools.ts     # Record management tools
│   │   ├── lists.tools.ts       # List management tools
│   │   ├── notes.tools.ts       # Note management tools
│   │   ├── tasks.tools.ts       # Task management tools
│   │   ├── search.tools.ts      # Search/query tools
│   │   └── workspace.tools.ts   # Workspace tools
│   ├── resources/
│   │   └── index.ts             # MCP resources (optional)
│   ├── schemas/
│   │   ├── common.ts            # Shared Zod schemas
│   │   ├── records.ts           # Record schemas
│   │   ├── lists.ts             # List schemas
│   │   └── filters.ts           # Filter/sort schemas
│   └── utils/
│       ├── errors.ts            # Error handling utilities
│       ├── rate-limiter.ts      # Rate limiting logic
│       └── transformers.ts      # Data transformation helpers
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 2. Attio API Integration

### 2.1 Authentication

**Method**: Bearer token authentication

```typescript
// Header format
Authorization: Bearer <ATTIO_API_KEY>
```

**Configuration**:
- API key stored in environment variable `ATTIO_API_KEY`
- Support both OAuth tokens and single-workspace API keys
- Base URL: `https://api.attio.com`

### 2.2 Rate Limiting Strategy

| Request Type | Limit | Strategy |
|--------------|-------|----------|
| Read (GET) | 100/sec | Token bucket with retry |
| Write (POST/PUT/PATCH/DELETE) | 25/sec | Queue with backoff |

**Implementation**:
```typescript
class RateLimiter {
  private readTokens: number = 100;
  private writeTokens: number = 25;

  async acquireRead(): Promise<void> { /* token bucket logic */ }
  async acquireWrite(): Promise<void> { /* token bucket logic */ }
}
```

### 2.3 API Client Design

```typescript
interface AttioClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
}

class AttioClient {
  constructor(config: AttioClientConfig);

  // Core methods
  async get<T>(path: string, params?: Record<string, any>): Promise<T>;
  async post<T>(path: string, body?: unknown): Promise<T>;
  async put<T>(path: string, body?: unknown): Promise<T>;
  async patch<T>(path: string, body?: unknown): Promise<T>;
  async delete<T>(path: string): Promise<T>;
}
```

---

## 3. MCP Tools Design

### 3.1 Tool Naming Convention

Format: `attio_{resource}_{action}`

Examples:
- `attio_records_list`
- `attio_records_create`
- `attio_notes_create`
- `attio_tasks_update`

### 3.2 Core Tools (Priority 1 - MVP)

#### Records Management

| Tool | Description | Attio Endpoint |
|------|-------------|----------------|
| `attio_records_list` | Query records with filters | `POST /v2/objects/{object}/records/query` |
| `attio_records_get` | Get a single record | `GET /v2/objects/{object}/records/{record_id}` |
| `attio_records_create` | Create a new record | `POST /v2/objects/{object}/records` |
| `attio_records_update` | Update a record | `PATCH /v2/objects/{object}/records/{record_id}` |
| `attio_records_delete` | Delete a record | `DELETE /v2/objects/{object}/records/{record_id}` |
| `attio_records_search` | Fuzzy search across objects | `POST /v2/objects/records/search` |

#### Lists & Entries

| Tool | Description | Attio Endpoint |
|------|-------------|----------------|
| `attio_lists_list` | List all available lists | `GET /v2/lists` |
| `attio_lists_get` | Get list details | `GET /v2/lists/{list}` |
| `attio_entries_list` | Query list entries | `POST /v2/lists/{list}/entries/query` |
| `attio_entries_create` | Add record to list | `POST /v2/lists/{list}/entries` |
| `attio_entries_update` | Update list entry | `PATCH /v2/lists/{list}/entries/{entry_id}` |
| `attio_entries_delete` | Remove from list | `DELETE /v2/lists/{list}/entries/{entry_id}` |

### 3.3 Extended Tools (Priority 2)

#### Notes & Tasks

| Tool | Description | Attio Endpoint |
|------|-------------|----------------|
| `attio_notes_list` | List notes for a record | `GET /v2/notes` |
| `attio_notes_create` | Create a note | `POST /v2/notes` |
| `attio_notes_get` | Get note details | `GET /v2/notes/{note_id}` |
| `attio_notes_delete` | Delete a note | `DELETE /v2/notes/{note_id}` |
| `attio_tasks_list` | List tasks | `GET /v2/tasks` |
| `attio_tasks_create` | Create a task | `POST /v2/tasks` |
| `attio_tasks_update` | Update task (complete, assign) | `PATCH /v2/tasks/{task_id}` |
| `attio_tasks_delete` | Delete a task | `DELETE /v2/tasks/{task_id}` |

#### Comments & Threads

| Tool | Description | Attio Endpoint |
|------|-------------|----------------|
| `attio_threads_list` | List comment threads | `GET /v2/threads` |
| `attio_comments_create` | Add a comment | `POST /v2/comments` |
| `attio_comments_delete` | Delete a comment | `DELETE /v2/comments/{comment_id}` |

### 3.4 Configuration Tools (Priority 3)

| Tool | Description | Attio Endpoint |
|------|-------------|----------------|
| `attio_objects_list` | List all objects | `GET /v2/objects` |
| `attio_objects_get` | Get object schema | `GET /v2/objects/{object}` |
| `attio_attributes_list` | List attributes for object/list | `GET /v2/{target}/{id}/attributes` |
| `attio_workspace_members_list` | List workspace members | `GET /v2/workspace_members` |
| `attio_webhooks_list` | List webhooks | `GET /v2/webhooks` |
| `attio_webhooks_create` | Create webhook | `POST /v2/webhooks` |

---

## 4. Tool Implementation Details

### 4.1 Example Tool: `attio_records_list`

```typescript
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Schema definition
const RecordsListSchema = z.object({
  object: z.string().describe("Object slug (e.g., 'people', 'companies') or ID"),
  filter: z.record(z.unknown()).optional().describe("Filter criteria"),
  sorts: z.array(z.object({
    attribute: z.string(),
    direction: z.enum(["asc", "desc"])
  })).optional().describe("Sort configuration"),
  limit: z.number().min(1).max(500).default(50).describe("Max results"),
  offset: z.number().min(0).default(0).describe("Pagination offset")
});

// Tool registration
server.tool(
  "attio_records_list",
  "Query records from an Attio object with optional filtering and sorting",
  RecordsListSchema.shape,
  async ({ object, filter, sorts, limit, offset }) => {
    try {
      const result = await attioClient.post(
        `/v2/objects/${object}/records/query`,
        { filter, sorts, limit, offset }
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error querying records: ${error.message}`
        }],
        isError: true
      };
    }
  }
);
```

### 4.2 Example Tool: `attio_records_create`

```typescript
const RecordCreateSchema = z.object({
  object: z.string().describe("Object slug or ID"),
  values: z.record(z.unknown()).describe("Attribute values for the record")
});

server.tool(
  "attio_records_create",
  "Create a new record in an Attio object",
  RecordCreateSchema.shape,
  async ({ object, values }) => {
    try {
      const result = await attioClient.post(
        `/v2/objects/${object}/records`,
        { data: { values } }
      );

      return {
        content: [{
          type: "text",
          text: `Record created successfully:\n${JSON.stringify(result, null, 2)}`
        }]
      };
    } catch (error) {
      if (error.code === "unique_attribute_violation") {
        return {
          content: [{
            type: "text",
            text: `Record already exists with these unique attributes. Use attio_records_update or attio_records_assert instead.`
          }],
          isError: true
        };
      }
      throw error;
    }
  }
);
```

### 4.3 Filter Schema for Queries

```typescript
const FilterSchema = z.object({
  attribute: z.string(),
  condition: z.enum([
    "equals", "not_equals",
    "contains", "not_contains",
    "starts_with", "ends_with",
    "is_empty", "is_not_empty",
    "greater_than", "less_than",
    "greater_than_or_equals", "less_than_or_equals"
  ]),
  value: z.unknown().optional()
}).describe("Filter condition for queries");

const CompoundFilterSchema = z.object({
  and: z.array(z.lazy(() => FilterOrCompoundSchema)).optional(),
  or: z.array(z.lazy(() => FilterOrCompoundSchema)).optional()
});

const FilterOrCompoundSchema = z.union([FilterSchema, CompoundFilterSchema]);
```

---

## 5. MCP Resources (Optional)

Resources provide read-only context that can be accessed by the AI assistant.

### 5.1 Proposed Resources

| Resource URI | Description |
|--------------|-------------|
| `attio://objects` | List of all object schemas |
| `attio://objects/{slug}` | Specific object schema with attributes |
| `attio://lists` | List of all available lists |
| `attio://workspace/members` | Workspace members for mentions |

### 5.2 Resource Implementation

```typescript
server.resource(
  "attio://objects",
  "List of all Attio objects in the workspace",
  async () => {
    const objects = await attioClient.get("/v2/objects");
    return {
      contents: [{
        uri: "attio://objects",
        mimeType: "application/json",
        text: JSON.stringify(objects, null, 2)
      }]
    };
  }
);
```

---

## 6. Error Handling

### 6.1 Error Types

```typescript
enum AttioErrorCode {
  RATE_LIMIT = "rate_limit_exceeded",
  UNAUTHORIZED = "unauthorized",
  NOT_FOUND = "not_found",
  VALIDATION_ERROR = "validation_error",
  UNIQUE_VIOLATION = "unique_attribute_violation",
  PERMISSION_DENIED = "permission_denied"
}

class AttioError extends Error {
  constructor(
    public code: AttioErrorCode,
    public message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
  }
}
```

### 6.2 Error Response Format

```typescript
function formatErrorResponse(error: AttioError): ToolResponse {
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        error: true,
        code: error.code,
        message: error.message,
        suggestion: getSuggestionForError(error)
      }, null, 2)
    }],
    isError: true
  };
}

function getSuggestionForError(error: AttioError): string {
  switch (error.code) {
    case AttioErrorCode.RATE_LIMIT:
      return "Wait a moment and retry the request.";
    case AttioErrorCode.NOT_FOUND:
      return "Verify the object/record ID exists. Use attio_objects_list to see available objects.";
    case AttioErrorCode.UNIQUE_VIOLATION:
      return "A record with these unique attributes already exists. Use attio_records_update instead.";
    default:
      return "Check the error details and try again.";
  }
}
```

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Project setup (TypeScript, package.json, tsconfig)
- [ ] Attio API client with authentication
- [ ] Rate limiting implementation
- [ ] Basic error handling
- [ ] MCP server skeleton with stdio transport

### Phase 2: Core Tools (Week 2)
- [ ] `attio_objects_list` / `attio_objects_get`
- [ ] `attio_records_list` / `attio_records_get`
- [ ] `attio_records_create` / `attio_records_update` / `attio_records_delete`
- [ ] `attio_records_search`
- [ ] Unit tests for core tools

### Phase 3: Lists & Entries (Week 3)
- [ ] `attio_lists_list` / `attio_lists_get`
- [ ] `attio_entries_list` / `attio_entries_create`
- [ ] `attio_entries_update` / `attio_entries_delete`
- [ ] Integration tests

### Phase 4: Extended Features (Week 4)
- [ ] Notes tools (list, create, get, delete)
- [ ] Tasks tools (list, create, update, delete)
- [ ] Comments tools (threads, create, delete)
- [ ] Workspace members tool

### Phase 5: Remote MCP Support (Week 5)
- [ ] Streamable HTTP transport implementation
- [ ] Authentication middleware (Bearer token)
- [ ] Session management
- [ ] Security hardening (Origin validation, rate limiting)
- [ ] Docker deployment configuration

### Phase 6: Polish & Documentation (Week 6)
- [ ] MCP resources implementation
- [ ] Comprehensive error handling
- [ ] README with usage examples
- [ ] Claude Desktop configuration docs (local + remote)
- [ ] Cloudflare Workers deployment guide
- [ ] Publish to npm (optional)

---

## 8. Configuration

### 8.1 Environment Variables

```env
# Required
ATTIO_API_KEY=your_api_key_here

# Optional
ATTIO_BASE_URL=https://api.attio.com
ATTIO_TIMEOUT_MS=30000
ATTIO_RETRY_ATTEMPTS=3
LOG_LEVEL=info
```

### 8.2 Claude Desktop Configuration

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

### 8.3 Alternative: npx Installation

```json
{
  "mcpServers": {
    "attio": {
      "command": "npx",
      "args": ["-y", "attio-mcp-server"],
      "env": {
        "ATTIO_API_KEY": "your_api_key"
      }
    }
  }
}
```

---

## 9. Remote MCP (Streamable HTTP)

Remote MCP enables hosting the server on the cloud, allowing multiple users/clients to connect without local installation.

### 9.1 Streamable HTTP Overview

**Introduced**: March 2025 (MCP Protocol v2025-03-26)
**Status**: Recommended transport for remote MCP servers

**Key Benefits**:
- Single endpoint for all MCP communication (`/mcp`)
- Bidirectional messaging (server can push notifications)
- Session management with `Mcp-Session-Id` header
- Supports streaming responses via SSE upgrade
- Connection resumability for dropped connections

### 9.2 Protocol Flow

```
┌─────────┐                              ┌─────────┐
│  Client │                              │  Server │
└────┬────┘                              └────┬────┘
     │                                        │
     │  POST /mcp (InitializeRequest)         │
     │  Accept: application/json,             │
     │          text/event-stream             │
     ├───────────────────────────────────────►│
     │                                        │
     │  HTTP 200 + InitializeResponse         │
     │  Mcp-Session-Id: <session-uuid>        │
     │◄───────────────────────────────────────┤
     │                                        │
     │  POST /mcp (ToolCallRequest)           │
     │  Mcp-Session-Id: <session-uuid>        │
     ├───────────────────────────────────────►│
     │                                        │
     │  HTTP 200 + SSE Stream (streaming)     │
     │  OR HTTP 200 + JSON (single response)  │
     │◄───────────────────────────────────────┤
     │                                        │
```

### 9.3 Server Implementation (Streamable HTTP)

```typescript
// src/transports/http.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHttpServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";

const app = express();
app.use(express.json());

// Session storage
const sessions = new Map<string, McpServer>();

app.all("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string;

  // Handle initialization
  if (!sessionId && req.method === "POST") {
    const server = createAttioMcpServer();
    const transport = new StreamableHttpServerTransport({
      sessionId: crypto.randomUUID(),
    });

    await server.connect(transport);
    sessions.set(transport.sessionId, server);

    // Process request and respond
    const response = await transport.handleRequest(req.body);
    res.setHeader("Mcp-Session-Id", transport.sessionId);
    res.json(response);
    return;
  }

  // Handle existing session
  const server = sessions.get(sessionId);
  if (!server) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Process request...
});

app.listen(3000, () => {
  console.log("Attio MCP Server running on http://localhost:3000/mcp");
});
```

### 9.4 Deployment Options

#### Option A: Cloudflare Workers (Recommended for Serverless)

```typescript
// src/worker.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpHandler } from "@anthropic-ai/agents-sdk";

const server = new McpServer({
  name: "attio-mcp",
  version: "1.0.0",
});

// Register tools...
registerAttioTools(server);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Streamable HTTP endpoint
    if (new URL(request.url).pathname === "/mcp") {
      return createMcpHandler(server)(request, env);
    }
    return new Response("Not found", { status: 404 });
  },
};
```

**wrangler.toml**:
```toml
name = "attio-mcp-server"
main = "src/worker.ts"
compatibility_date = "2024-01-01"

[vars]
# Non-secret config here

# Secrets (set via `wrangler secret put`)
# ATTIO_API_KEY
```

**Pros**: Auto-scaling, global edge deployment, no server management
**Cons**: Cold starts, 50ms CPU limit per request

#### Option B: Self-Hosted (Docker/VPS)

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js", "--transport", "http"]
```

**docker-compose.yml**:
```yaml
version: "3.8"
services:
  attio-mcp:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ATTIO_API_KEY=${ATTIO_API_KEY}
      - MCP_TRANSPORT=http
      - MCP_PORT=3000
    restart: unless-stopped
```

**Pros**: Full control, no cold starts, persistent connections
**Cons**: Requires infrastructure management

#### Option C: AWS Lambda / Google Cloud Run

```yaml
# serverless.yml (AWS Lambda)
service: attio-mcp-server

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1

functions:
  mcp:
    handler: dist/lambda.handler
    events:
      - http:
          path: /mcp
          method: ANY
    environment:
      ATTIO_API_KEY: ${env:ATTIO_API_KEY}
```

### 9.5 Client Configuration for Remote MCP

#### Claude Desktop (with mcp-remote adapter)

```json
{
  "mcpServers": {
    "attio-remote": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://your-server.com/mcp"
      ],
      "env": {
        "MCP_AUTH_TOKEN": "your_auth_token"
      }
    }
  }
}
```

#### Direct HTTP Client

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHttpClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const transport = new StreamableHttpClientTransport({
  url: "https://your-server.com/mcp",
  headers: {
    "Authorization": "Bearer your_auth_token"
  }
});

const client = new Client({
  name: "my-app",
  version: "1.0.0"
});

await client.connect(transport);

// Call tools
const result = await client.callTool("attio_records_list", {
  object: "companies",
  limit: 10
});
```

### 9.6 Authentication for Remote MCP

#### Option A: Bearer Token (Simple)

```typescript
app.use("/mcp", (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.slice(7);
  if (token !== process.env.MCP_AUTH_TOKEN) {
    return res.status(403).json({ error: "Invalid token" });
  }

  next();
});
```

#### Option B: OAuth 2.0 (Enterprise)

```typescript
import { OAuthProvider } from "@cloudflare/workers-oauth-provider";

export default new OAuthProvider({
  apiHandlers: {
    "/mcp": createMcpHandler(server),
  },
  defaultRedirectUri: "https://your-app.com/callback",
  accessTokenTTL: 3600,
  // OAuth configuration...
});
```

#### Option C: API Key per User (Multi-tenant)

```typescript
interface TenantConfig {
  attioApiKey: string;
  allowedTools: string[];
}

const tenants = new Map<string, TenantConfig>();

app.use("/mcp", async (req, res, next) => {
  const apiKey = req.headers["x-api-key"] as string;
  const tenant = tenants.get(apiKey);

  if (!tenant) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  // Inject tenant's Attio API key into context
  req.attioApiKey = tenant.attioApiKey;
  req.allowedTools = tenant.allowedTools;
  next();
});
```

### 9.7 Security Considerations for Remote MCP

| Risk | Mitigation |
|------|------------|
| **DNS Rebinding** | Validate `Origin` header, bind to localhost for local dev |
| **CSRF** | Require custom headers (e.g., `X-MCP-Client`) |
| **Session Hijacking** | Use cryptographically secure session IDs |
| **Rate Limiting** | Implement per-client rate limits |
| **Data Exposure** | Never log API keys, sanitize responses |

```typescript
// Security middleware
app.use("/mcp", (req, res, next) => {
  // Validate Origin
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  // Require MCP protocol version header
  const protocolVersion = req.headers["mcp-protocol-version"];
  if (!protocolVersion) {
    return res.status(400).json({ error: "Missing protocol version" });
  }

  next();
});
```

### 9.8 Updated Directory Structure (with Remote Support)

```
attio_mcp/
├── src/
│   ├── index.ts                 # Entry point (auto-detects transport)
│   ├── server.ts                # MCP server (transport-agnostic)
│   ├── transports/
│   │   ├── stdio.ts             # stdio transport setup
│   │   ├── http.ts              # Streamable HTTP transport
│   │   └── worker.ts            # Cloudflare Worker handler
│   ├── middleware/
│   │   ├── auth.ts              # Authentication middleware
│   │   ├── rate-limit.ts        # Rate limiting
│   │   └── security.ts          # Security headers & validation
│   ├── api/
│   │   └── ...                  # (same as before)
│   ├── tools/
│   │   └── ...                  # (same as before)
│   └── ...
├── deploy/
│   ├── Dockerfile               # Docker deployment
│   ├── docker-compose.yml       # Local docker setup
│   ├── wrangler.toml            # Cloudflare Workers config
│   └── serverless.yml           # AWS Lambda config
└── ...
```

### 9.10 Deployment Comparison

| Aspect | stdio (Local) | Cloudflare Workers | Self-Hosted (Docker) | AWS Lambda |
|--------|---------------|-------------------|---------------------|------------|
| **Setup Complexity** | Very Low | Low | Medium | Medium |
| **Cost** | Free | Free tier available | $5-50/month | Pay-per-use |
| **Scaling** | Single user | Auto-scale | Manual | Auto-scale |
| **Cold Starts** | None | ~50ms | None | ~500ms |
| **Persistent State** | N/A | Durable Objects | Yes | No (use DynamoDB) |
| **Max Request Time** | Unlimited | 30s (default) | Unlimited | 15min |
| **Best For** | Personal use | Team/SaaS | Enterprise | Serverless apps |

### 9.12 Environment Variables (Extended for Remote)

```env
# Required
ATTIO_API_KEY=your_api_key_here

# Transport Configuration
MCP_TRANSPORT=stdio|http              # Default: stdio
MCP_PORT=3000                         # For HTTP transport
MCP_HOST=0.0.0.0                      # Bind address (use 127.0.0.1 for local)

# Authentication (for remote)
MCP_AUTH_TYPE=none|bearer|oauth       # Default: none
MCP_AUTH_TOKEN=your_secret_token      # For bearer auth
MCP_ALLOWED_ORIGINS=https://app.com   # Comma-separated origins

# Session Management
MCP_SESSION_TTL_SECONDS=3600          # Session timeout
MCP_MAX_SESSIONS=1000                 # Max concurrent sessions

# Optional
ATTIO_BASE_URL=https://api.attio.com
LOG_LEVEL=info
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

- Test each tool's input validation
- Test API client methods with mocked responses
- Test error handling and retry logic
- Test rate limiter behavior

### 10.2 Integration Tests

- Test against Attio sandbox/test workspace
- End-to-end tool execution
- Rate limit handling under load

### 10.3 Test Tools

```json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "msw": "^2.0.0"
  }
}
```

---

## 11. Security Considerations

1. **API Key Protection**: Never log or expose API keys
2. **Input Validation**: Strict Zod schemas for all tool inputs
3. **Output Sanitization**: Sanitize sensitive data in responses
4. **Rate Limiting**: Respect Attio's limits to prevent account suspension
5. **Minimal Permissions**: Request only necessary OAuth scopes

---

## 12. Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.25.0",
    "dotenv": "^16.4.0",
    "express": "^4.21.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "@types/cors": "^2.8.0",
    "vitest": "^2.0.0",
    "msw": "^2.0.0",
    "tsx": "^4.0.0",
    "wrangler": "^3.0.0"
  },
  "optionalDependencies": {
    "@cloudflare/workers-types": "^4.0.0",
    "hono": "^4.0.0"
  }
}
```

---

## 13. References

### Attio API Documentation
- Base URL: `https://api.attio.com`
- OpenAPI Spec: `https://api.attio.com/openapi/api`
- Docs: `https://docs.attio.com/rest-api/overview`

### MCP Resources
- TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- npm: https://www.npmjs.com/package/@modelcontextprotocol/sdk
- Protocol Spec: https://modelcontextprotocol.io

---

## Appendix A: Full Tool Reference

| Tool Name | Method | Attio Path | Priority |
|-----------|--------|------------|----------|
| `attio_objects_list` | GET | `/v2/objects` | P1 |
| `attio_objects_get` | GET | `/v2/objects/{object}` | P1 |
| `attio_records_list` | POST | `/v2/objects/{object}/records/query` | P1 |
| `attio_records_get` | GET | `/v2/objects/{object}/records/{record_id}` | P1 |
| `attio_records_create` | POST | `/v2/objects/{object}/records` | P1 |
| `attio_records_update` | PATCH | `/v2/objects/{object}/records/{record_id}` | P1 |
| `attio_records_delete` | DELETE | `/v2/objects/{object}/records/{record_id}` | P1 |
| `attio_records_assert` | PUT | `/v2/objects/{object}/records` | P2 |
| `attio_records_search` | POST | `/v2/objects/records/search` | P1 |
| `attio_lists_list` | GET | `/v2/lists` | P1 |
| `attio_lists_get` | GET | `/v2/lists/{list}` | P1 |
| `attio_lists_create` | POST | `/v2/lists` | P3 |
| `attio_entries_list` | POST | `/v2/lists/{list}/entries/query` | P1 |
| `attio_entries_get` | GET | `/v2/lists/{list}/entries/{entry_id}` | P2 |
| `attio_entries_create` | POST | `/v2/lists/{list}/entries` | P1 |
| `attio_entries_update` | PATCH | `/v2/lists/{list}/entries/{entry_id}` | P2 |
| `attio_entries_delete` | DELETE | `/v2/lists/{list}/entries/{entry_id}` | P2 |
| `attio_attributes_list` | GET | `/v2/{target}/{id}/attributes` | P2 |
| `attio_notes_list` | GET | `/v2/notes` | P2 |
| `attio_notes_create` | POST | `/v2/notes` | P2 |
| `attio_notes_get` | GET | `/v2/notes/{note_id}` | P3 |
| `attio_notes_delete` | DELETE | `/v2/notes/{note_id}` | P3 |
| `attio_tasks_list` | GET | `/v2/tasks` | P2 |
| `attio_tasks_create` | POST | `/v2/tasks` | P2 |
| `attio_tasks_update` | PATCH | `/v2/tasks/{task_id}` | P2 |
| `attio_tasks_delete` | DELETE | `/v2/tasks/{task_id}` | P3 |
| `attio_threads_list` | GET | `/v2/threads` | P3 |
| `attio_comments_create` | POST | `/v2/comments` | P3 |
| `attio_comments_delete` | DELETE | `/v2/comments/{comment_id}` | P3 |
| `attio_workspace_members_list` | GET | `/v2/workspace_members` | P2 |
| `attio_webhooks_list` | GET | `/v2/webhooks` | P3 |
| `attio_webhooks_create` | POST | `/v2/webhooks` | P3 |
| `attio_webhooks_delete` | DELETE | `/v2/webhooks/{webhook_id}` | P3 |

---

## Appendix B: Standard Objects Reference

Attio provides these built-in objects in every workspace:

| Object | API Slug | Description |
|--------|----------|-------------|
| People | `people` | Individual contacts |
| Companies | `companies` | Organizations |
| Deals | `deals` | Sales opportunities |
| Users | `users` | Workspace users (read-only) |
| Workspaces | `workspaces` | Connected workspaces |

Custom objects can be created and will have unique slugs.
