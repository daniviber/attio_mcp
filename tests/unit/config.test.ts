import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../../src/config/index.js";

describe("Config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("loadConfig", () => {
    it("should load config without requiring ATTIO_API_KEY", () => {
      delete process.env.ATTIO_API_KEY;
      const config = loadConfig();

      expect(config.attio.baseUrl).toBe("https://api.attio.com");
    });

    it("should use default base URL", () => {
      const config = loadConfig();

      expect(config.attio.baseUrl).toBe("https://api.attio.com");
    });

    it("should use custom base URL when provided", () => {
      process.env.ATTIO_BASE_URL = "https://custom.api.com";
      const config = loadConfig();

      expect(config.attio.baseUrl).toBe("https://custom.api.com");
    });

    it("should use default timeout", () => {
      const config = loadConfig();

      expect(config.attio.timeoutMs).toBe(30000);
    });

    it("should use custom timeout when provided", () => {
      process.env.ATTIO_TIMEOUT_MS = "60000";
      const config = loadConfig();

      expect(config.attio.timeoutMs).toBe(60000);
    });

    it("should use default retry attempts", () => {
      const config = loadConfig();

      expect(config.attio.retryAttempts).toBe(3);
    });

    it("should use custom retry attempts when provided", () => {
      process.env.ATTIO_RETRY_ATTEMPTS = "5";
      const config = loadConfig();

      expect(config.attio.retryAttempts).toBe(5);
    });

    it("should load HTTP config with defaults", () => {
      const config = loadConfig();

      expect(config.http.port).toBe(3000);
      expect(config.http.host).toBe("0.0.0.0");
    });

    it("should load custom HTTP config", () => {
      process.env.MCP_PORT = "8080";
      process.env.MCP_HOST = "127.0.0.1";
      const config = loadConfig();

      expect(config.http.port).toBe(8080);
      expect(config.http.host).toBe("127.0.0.1");
    });

    it("should default to info log level", () => {
      const config = loadConfig();

      expect(config.logLevel).toBe("info");
    });

    it("should use custom log level", () => {
      process.env.LOG_LEVEL = "debug";
      const config = loadConfig();

      expect(config.logLevel).toBe("debug");
    });

    it("should handle invalid integer gracefully", () => {
      process.env.ATTIO_TIMEOUT_MS = "not_a_number";
      const config = loadConfig();

      expect(config.attio.timeoutMs).toBe(30000);
    });
  });
});
