import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../config/index.js";
import { createServer } from "../server.js";

interface SessionInfo {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  createdAt: Date;
  lastActivityAt: Date;
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
          if (!origin) {
            callback(null, true);
            return;
          }
          if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error("Origin not allowed"));
          }
        },
        credentials: true,
        exposedHeaders: ["Mcp-Session-Id"],
      })
    );

    this.app.use((_req: Request, res: Response, next: NextFunction) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("X-XSS-Protection", "1; mode=block");
      next();
    });

    if (this.config.http.authToken) {
      this.app.use("/mcp", (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
          res.status(401).json({ error: "Unauthorized", message: "Missing or invalid Authorization header" });
          return;
        }

        const token = authHeader.slice(7);
        if (token !== this.config.http.authToken) {
          res.status(403).json({ error: "Forbidden", message: "Invalid token" });
          return;
        }

        next();
      });
    }

    this.app.use("/mcp", (req: Request, res: Response, next: NextFunction) => {
      if (req.method === "GET" || req.method === "DELETE") {
        next();
        return;
      }

      if (!req.body || typeof req.body !== "object") {
        res.status(400).json({ error: "Bad Request", message: "Invalid request body" });
        return;
      }

      next();
    });

    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on("finish", () => {
        const duration = Date.now() - start;
        console.error(
          `[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`
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

    this.app.all("/mcp", async (req: Request, res: Response) => {
      try {
        await this.handleMcpRequest(req, res);
      } catch (error) {
        console.error("Error handling MCP request:", error);
        if (!res.headersSent) {
          res.status(500).json({
            error: "Internal Server Error",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    });

    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({ error: "Not Found" });
    });

    this.app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Unhandled error:", err);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Internal Server Error",
          message: err.message,
        });
      }
    });
  }

  private async handleMcpRequest(req: Request, res: Response): Promise<void> {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (!session) {
        res.status(404).json({
          error: "Not Found",
          message: "Session not found or expired",
        });
        return;
      }

      session.lastActivityAt = new Date();

      if (req.method === "DELETE") {
        console.error(`[Session] Client terminated session: ${sessionId}`);
        session.transport.close();
        this.sessions.delete(sessionId);
        res.status(200).json({ message: "Session terminated" });
        return;
      }

      await session.transport.handleRequest(req, res, req.body);
      return;
    }

    if (req.method === "POST") {
      const body = req.body;
      if (body?.method !== "initialize") {
        res.status(400).json({
          error: "Bad Request",
          message: "First request must be an initialization request",
        });
        return;
      }

      const newSessionId = randomUUID();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
      });

      const server = createServer(this.config);
      await server.connect(transport);

      this.sessions.set(newSessionId, {
        transport,
        server,
        createdAt: new Date(),
        lastActivityAt: new Date(),
      });

      console.error(`[Session] Created new session: ${newSessionId}`);

      await transport.handleRequest(req, res, req.body);

      transport.onclose = () => {
        console.error(`[Session] Transport closed for session: ${newSessionId}`);
        this.sessions.delete(newSessionId);
      };
    } else if (req.method === "GET") {
      res.status(400).json({
        error: "Bad Request",
        message: "Session ID required for SSE connections",
      });
    } else if (req.method === "DELETE") {
      res.status(400).json({
        error: "Bad Request",
        message: "Session ID required for session termination",
      });
    } else {
      res.status(405).json({
        error: "Method Not Allowed",
        message: "Only GET, POST, and DELETE methods are allowed",
      });
    }
  }

  async start(): Promise<void> {
    const { port, host } = this.config.http;

    this.startSessionCleanup();

    return new Promise((resolve) => {
      this.app.listen(port, host, () => {
        console.error(`Attio MCP Server started (Streamable HTTP transport)`);
        console.error(`Listening on http://${host}:${port}/mcp`);
        console.error(`Health check: http://${host}:${port}/health`);
        if (this.config.http.authToken) {
          console.error(`Authentication: Bearer token required`);
        }
        resolve();
      });
    });
  }

  private startSessionCleanup(): void {
    const sessionTtlMs = (parseInt(process.env.MCP_SESSION_TTL_SECONDS || "3600", 10)) * 1000;
    const maxSessions = parseInt(process.env.MCP_MAX_SESSIONS || "1000", 10);

    this.sessionCleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [sessionId, session] of this.sessions) {
        const inactiveTime = now - session.lastActivityAt.getTime();
        if (inactiveTime > sessionTtlMs) {
          console.error(`[Session] Cleaning up inactive session: ${sessionId}`);
          session.transport.close();
          this.sessions.delete(sessionId);
          cleanedCount++;
        }
      }

      if (this.sessions.size > maxSessions) {
        const sortedSessions = [...this.sessions.entries()].sort(
          (a, b) => a[1].lastActivityAt.getTime() - b[1].lastActivityAt.getTime()
        );

        const toRemove = sortedSessions.slice(0, this.sessions.size - maxSessions);
        for (const [sessionId, session] of toRemove) {
          console.error(`[Session] Removing oldest session due to max limit: ${sessionId}`);
          session.transport.close();
          this.sessions.delete(sessionId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.error(`[Session] Cleaned up ${cleanedCount} sessions. Active: ${this.sessions.size}`);
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
