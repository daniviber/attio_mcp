import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../../src/config/index.js";

describe("Config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env for each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("loadConfig", () => {
    it("should throw if ATTIO_API_KEY is missing", () => {
      delete process.env.ATTIO_API_KEY;
      expect(() => loadConfig()).toThrow("ATTIO_API_KEY");
    });

    it("should load config with required API key", () => {
      process.env.ATTIO_API_KEY = "test_api_key";
      const config = loadConfig();

      expect(config.attio.apiKey).toBe("test_api_key");
    });

    it("should use default base URL", () => {
      process.env.ATTIO_API_KEY = "test_api_key";
      const config = loadConfig();

      expect(config.attio.baseUrl).toBe("https://api.attio.com");
    });

    it("should use custom base URL when provided", () => {
      process.env.ATTIO_API_KEY = "test_api_key";
      process.env.ATTIO_BASE_URL = "https://custom.api.com";
      const config = loadConfig();

      expect(config.attio.baseUrl).toBe("https://custom.api.com");
    });

    it("should use default timeout", () => {
      process.env.ATTIO_API_KEY = "test_api_key";
      const config = loadConfig();

      expect(config.attio.timeoutMs).toBe(30000);
    });

    it("should use custom timeout when provided", () => {
      process.env.ATTIO_API_KEY = "test_api_key";
      process.env.ATTIO_TIMEOUT_MS = "60000";
      const config = loadConfig();

      expect(config.attio.timeoutMs).toBe(60000);
    });

    it("should use default retry attempts", () => {
      process.env.ATTIO_API_KEY = "test_api_key";
      const config = loadConfig();

      expect(config.attio.retryAttempts).toBe(3);
    });

    it("should use custom retry attempts when provided", () => {
      process.env.ATTIO_API_KEY = "test_api_key";
      process.env.ATTIO_RETRY_ATTEMPTS = "5";
      const config = loadConfig();

      expect(config.attio.retryAttempts).toBe(5);
    });

    it("should default to stdio transport", () => {
      process.env.ATTIO_API_KEY = "test_api_key";
      const config = loadConfig();

      expect(config.transport).toBe("stdio");
    });

    it("should use http transport when specified", () => {
      process.env.ATTIO_API_KEY = "test_api_key";
      process.env.MCP_TRANSPORT = "http";
      const config = loadConfig();

      expect(config.transport).toBe("http");
    });

    it("should load HTTP config with defaults", () => {
      process.env.ATTIO_API_KEY = "test_api_key";
      const config = loadConfig();

      expect(config.http.port).toBe(3000);
      expect(config.http.host).toBe("127.0.0.1");
      expect(config.http.authToken).toBeUndefined();
    });

    it("should load custom HTTP config", () => {
      process.env.ATTIO_API_KEY = "test_api_key";
      process.env.MCP_PORT = "8080";
      process.env.MCP_HOST = "0.0.0.0";
      process.env.MCP_AUTH_TOKEN = "secret_token";
      const config = loadConfig();

      expect(config.http.port).toBe(8080);
      expect(config.http.host).toBe("0.0.0.0");
      expect(config.http.authToken).toBe("secret_token");
    });

    it("should default to info log level", () => {
      process.env.ATTIO_API_KEY = "test_api_key";
      const config = loadConfig();

      expect(config.logLevel).toBe("info");
    });

    it("should use custom log level", () => {
      process.env.ATTIO_API_KEY = "test_api_key";
      process.env.LOG_LEVEL = "debug";
      const config = loadConfig();

      expect(config.logLevel).toBe("debug");
    });

    it("should handle invalid integer gracefully", () => {
      process.env.ATTIO_API_KEY = "test_api_key";
      process.env.ATTIO_TIMEOUT_MS = "not_a_number";
      const config = loadConfig();

      // Should use default when parse fails
      expect(config.attio.timeoutMs).toBe(30000);
    });
  });
});
