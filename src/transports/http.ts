import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { createHash, randomUUID } from "crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Config } from "../config/index.js";
import { createServer } from "../server.js";

interface SessionInfo {
  transport: StreamableHTTPServerTransport;
  tokenHash: string;
  createdAt: Date;
  lastActivityAt: Date;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

export class HttpTransportServer {
  private app: Express;
  private sessions: Map<string, SessionInfo> = new Map();
  private config: Config;
  private sessionCleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Config) {
    this.config = config;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());

    const allowedOrigins = process.env.MCP_ALLOWED_ORIGINS?.split(",") || [];
    this.app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error("Origin not allowed"));
          }
        },
        credentials: true,
        exposedHeaders: ["Mcp-Session-Id"],
      })
    );

    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on("finish", () => {
        console.error(
          `[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`
        );
      });
      next();
    });
  }

  private setupRoutes(): void {
    this.app.get("/health", (_req: Request, res: Response) => {
      res.json({
        status: "healthy",
        activeSessions: this.sessions.size,
        uptime: process.uptime(),
      });
    });

    // All MCP protocol handling is delegated to the SDK transport
    this.app.all("/mcp", async (req: Request, res: Response) => {
      try {
        const token = extractBearerToken(req);
        if (!token) {
          res.status(401).json({
            error: "Unauthorized",
            message: "Attio API token required via Authorization: Bearer <token>",
          });
          return;
        }

        const sessionId = req.headers["mcp-session-id"] as string | undefined;

        if (sessionId) {
          // Existing session — verify token matches and delegate to SDK
          const session = this.sessions.get(sessionId);
          if (!session) {
            res.status(404).json({ jsonrpc: "2.0", error: { code: -32001, message: "Session not found" }, id: null });
            return;
          }

          if (session.tokenHash !== hashToken(token)) {
            res.status(403).json({ error: "Forbidden", message: "Token does not match session" });
            return;
          }

          session.lastActivityAt = new Date();
          await session.transport.handleRequest(req, res, req.body);
          return;
        }

        // No session ID — new session initialization.
        // Create a per-session transport + server with the client's Attio token.
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
        });

        const server = createServer(this.config, token);
        await server.connect(transport);

        await transport.handleRequest(req, res, req.body);

        const newSessionId = transport.sessionId;
        if (newSessionId) {
          this.sessions.set(newSessionId, {
            transport,
            tokenHash: hashToken(token),
            createdAt: new Date(),
            lastActivityAt: new Date(),
          });

          transport.onclose = () => {
            console.error(`[Session] Closed: ${newSessionId}`);
            this.sessions.delete(newSessionId);
          };

          console.error(`[Session] Created: ${newSessionId}`);
        }
      } catch (error) {
        console.error("Error handling MCP request:", error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: "2.0",
            error: { code: -32603, message: error instanceof Error ? error.message : "Internal error" },
            id: null,
          });
        }
      }
    });

    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({ error: "Not Found" });
    });
  }

  async start(): Promise<void> {
    const { port, host } = this.config.http;
    this.startSessionCleanup();

    return new Promise((resolve) => {
      this.app.listen(port, host, () => {
        console.error(`Attio MCP Server (Streamable HTTP)`);
        console.error(`Listening on http://${host}:${port}/mcp`);
        console.error(`Health check: http://${host}:${port}/health`);
        console.error(`Authentication: Attio API token via Bearer header`);
        resolve();
      });
    });
  }

  private startSessionCleanup(): void {
    const sessionTtlMs = parseInt(process.env.MCP_SESSION_TTL_SECONDS || "3600", 10) * 1000;
    const maxSessions = parseInt(process.env.MCP_MAX_SESSIONS || "1000", 10);

    this.sessionCleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [id, session] of this.sessions) {
        if (now - session.lastActivityAt.getTime() > sessionTtlMs) {
          console.error(`[Session] Expired: ${id}`);
          session.transport.close();
          this.sessions.delete(id);
          cleanedCount++;
        }
      }

      if (this.sessions.size > maxSessions) {
        const sorted = [...this.sessions.entries()].sort(
          (a, b) => a[1].lastActivityAt.getTime() - b[1].lastActivityAt.getTime()
        );
        for (const [id, session] of sorted.slice(0, this.sessions.size - maxSessions)) {
          console.error(`[Session] Evicted (max limit): ${id}`);
          session.transport.close();
          this.sessions.delete(id);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.error(`[Session] Cleaned ${cleanedCount}. Active: ${this.sessions.size}`);
      }
    }, 60000);
  }

  stopSessionCleanup(): void {
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
      this.sessionCleanupInterval = null;
    }
  }

  getApp(): Express {
    return this.app;
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}

export async function startHttpServer(config: Config): Promise<HttpTransportServer> {
  const server = new HttpTransportServer(config);
  await server.start();
  return server;
}
