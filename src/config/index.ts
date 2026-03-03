export interface Config {
  attio: {
    apiKey: string;
    baseUrl: string;
    timeoutMs: number;
    retryAttempts: number;
  };
  http: {
    port: number;
    host: string;
    authToken?: string;
  };
  logLevel: "debug" | "info" | "warn" | "error";
}

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
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
      apiKey: getEnvOrThrow("ATTIO_API_KEY"),
      baseUrl: getEnvOrDefault("ATTIO_BASE_URL", "https://api.attio.com"),
      timeoutMs: getEnvAsInt("ATTIO_TIMEOUT_MS", 30000),
      retryAttempts: getEnvAsInt("ATTIO_RETRY_ATTEMPTS", 3),
    },
    http: {
      port: getEnvAsInt("MCP_PORT", 3000),
      host: getEnvOrDefault("MCP_HOST", "0.0.0.0"),
      authToken: process.env.MCP_AUTH_TOKEN,
    },
    logLevel: getEnvOrDefault("LOG_LEVEL", "info") as Config["logLevel"],
  };
}
