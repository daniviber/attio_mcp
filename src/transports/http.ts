import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../config/index.js";
import { createServer } from "../server.js";

/**
 * Session info for tracking active connections
 */
interface SessionInfo {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  createdAt: Date;
  lastActivityAt: Date;
}

/**
 * HTTP Transport Server using Streamable HTTP protocol
 */
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
    // Parse JSON bodies
    this.app.use(express.json());

    // CORS configuration
    const allowedOrigins = process.env.MCP_ALLOWED_ORIGINS?.split(",") || [];
    this.app.use(
      cors({
        origin: (origin, callback) => {
          // Allow requests with no origin (like mobile apps or curl)
          if (!origin) {
            callback(null, true);
            return;
          }
          // Check if origin is allowed
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

    // Security headers
    this.app.use((_req: Request, res: Response, next: NextFunction) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("X-XSS-Protection", "1; mode=block");
      next();
    });

    // Bearer token authentication (if configured)
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

    // MCP Protocol version validation
    this.app.use("/mcp", (req: Request, res: Response, next: NextFunction) => {
      // GET requests (SSE streams) don't require body validation
      if (req.method === "GET") {
        next();
        return;
      }

      // POST requests should have a body
      if (!req.body || typeof req.body !== "object") {
        res.status(400).json({ error: "Bad Request", message: "Invalid request body" });
        return;
      }

      next();
    });

    // Request logging
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
    // Health check endpoint
    this.app.get("/health", (_req: Request, res: Response) => {
      res.json({
        status: "healthy",
        activeSessions: this.sessions.size,
        uptime: process.uptime(),
      });
    });

    // MCP endpoint - handles all Streamable HTTP requests
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

    // 404 handler
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({ error: "Not Found" });
    });

    // Error handler
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

    // Handle existing session
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (!session) {
        res.status(404).json({
          error: "Not Found",
          message: "Session not found or expired",
        });
        return;
      }

      // Update last activity
      session.lastActivityAt = new Date();

      // Handle the request with the existing transport
      await session.transport.handleRequest(req, res, req.body);
      return;
    }

    // No session ID - this should be an initialization request (POST) or GET for SSE
    if (req.method === "POST") {
      // Check if this is an initialization request
      const body = req.body;
      if (body?.method !== "initialize") {
        res.status(400).json({
          error: "Bad Request",
          message: "First request must be an initialization request",
        });
        return;
      }

      // Create new session
      const newSessionId = randomUUID();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
      });

      const server = createServer(this.config);

      // Connect server to transport
      await server.connect(transport);

      // Store session
      this.sessions.set(newSessionId, {
        transport,
        server,
        createdAt: new Date(),
        lastActivityAt: new Date(),
      });

      console.error(`[Session] Created new session: ${newSessionId}`);

      // Handle the initialization request
      await transport.handleRequest(req, res, req.body);

      // Setup cleanup on transport close
      transport.onclose = () => {
        console.error(`[Session] Transport closed for session: ${newSessionId}`);
        this.sessions.delete(newSessionId);
      };
    } else if (req.method === "GET") {
      // GET requests without session ID are not allowed
      res.status(400).json({
        error: "Bad Request",
        message: "Session ID required for SSE connections",
      });
    } else {
      res.status(405).json({
        error: "Method Not Allowed",
        message: "Only GET and POST methods are allowed",
      });
    }
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    const { port, host } = this.config.http;

    // Start session cleanup interval
    this.startSessionCleanup();

    return new Promise((resolve) => {
      this.app.listen(port, host, () => {
        console.error(`Attio MCP Server started (HTTP transport)`);
        console.error(`Listening on http://${host}:${port}/mcp`);
        console.error(`Health check: http://${host}:${port}/health`);
        if (this.config.http.authToken) {
          console.error(`Authentication: Bearer token required`);
        }
        resolve();
      });
    });
  }

  /**
   * Start periodic session cleanup
   */
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

      // Enforce max sessions by removing oldest
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
    }, 60000); // Run every minute
  }

  /**
   * Stop the session cleanup interval
   */
  stopSessionCleanup(): void {
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
      this.sessionCleanupInterval = null;
    }
  }

  /**
   * Get the Express app instance (for testing)
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * Get active session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }
}

/**
 * Create and start the HTTP transport server
 */
export async function startHttpServer(config: Config): Promise<HttpTransportServer> {
  const server = new HttpTransportServer(config);
  await server.start();
  return server;
}
