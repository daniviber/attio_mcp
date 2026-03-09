export interface Config {
  attio: {
    baseUrl: string;
    timeoutMs: number;
    retryAttempts: number;
  };
  http: {
    port: number;
    host: string;
  };
  logLevel: "debug" | "info" | "warn" | "error";
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function getEnvAsInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function loadConfig(): Config {
  return {
    attio: {
      baseUrl: getEnvOrDefault("ATTIO_BASE_URL", "https://api.attio.com"),
      timeoutMs: getEnvAsInt("ATTIO_TIMEOUT_MS", 30000),
      retryAttempts: getEnvAsInt("ATTIO_RETRY_ATTEMPTS", 3),
    },
    http: {
      port: getEnvAsInt("MCP_PORT", 3000),
      host: getEnvOrDefault("MCP_HOST", "0.0.0.0"),
    },
    logLevel: getEnvOrDefault("LOG_LEVEL", "info") as Config["logLevel"],
  };
}
