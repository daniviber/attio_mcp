import { RateLimiter } from "../utils/rate-limiter.js";
import { AttioError, AttioErrorCode } from "../utils/errors.js";
import type { AttioErrorResponse } from "./types.js";

export interface AttioClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  retryAttempts?: number;
}

export class AttioClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly retryAttempts: number;
  private readonly rateLimiter: RateLimiter;

  constructor(config: AttioClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://api.attio.com";
    this.timeoutMs = config.timeoutMs || 30000;
    this.retryAttempts = config.retryAttempts || 3;
    this.rateLimiter = new RateLimiter();
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const isWrite = method !== "GET";

    // Acquire rate limit token
    if (isWrite) {
      await this.rateLimiter.acquireWrite();
    } else {
      await this.rateLimiter.acquireRead();
    }

    // Build URL with query params
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url.toString(), {
          method,
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({})) as AttioErrorResponse;

          // Handle rate limiting with retry
          if (response.status === 429) {
            const retryAfter = response.headers.get("Retry-After");
            const waitMs = retryAfter ? 1000 : 1000; // Default to 1 second
            await this.sleep(waitMs);
            continue;
          }

          throw AttioError.fromResponse({
            status_code: response.status,
            type: errorBody.type || "error",
            code: errorBody.code || this.mapStatusToCode(response.status),
            message: errorBody.message || `HTTP ${response.status}`,
          });
        }

        // Handle 204 No Content
        if (response.status === 204) {
          return {} as T;
        }

        return await response.json() as T;
      } catch (error) {
        if (error instanceof AttioError) {
          throw error;
        }

        if (error instanceof Error) {
          if (error.name === "AbortError") {
            lastError = new AttioError(
              AttioErrorCode.NETWORK_ERROR,
              "Request timed out",
              0
            );
          } else {
            lastError = AttioError.networkError(error.message);
          }
        }

        // Retry on network errors
        if (attempt < this.retryAttempts - 1) {
          await this.sleep(1000 * (attempt + 1)); // Exponential backoff
          continue;
        }
      }
    }

    throw lastError || new AttioError(AttioErrorCode.NETWORK_ERROR, "Request failed", 0);
  }

  private mapStatusToCode(status: number): string {
    switch (status) {
      case 401:
        return AttioErrorCode.UNAUTHORIZED;
      case 403:
        return AttioErrorCode.PERMISSION_DENIED;
      case 404:
        return AttioErrorCode.NOT_FOUND;
      case 422:
        return AttioErrorCode.VALIDATION_ERROR;
      case 429:
        return AttioErrorCode.RATE_LIMIT;
      default:
        return AttioErrorCode.INTERNAL_ERROR;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // HTTP Methods

  async get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    return this.request<T>("GET", path, undefined, params);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}
