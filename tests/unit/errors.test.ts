import { describe, it, expect } from "vitest";
import {
  AttioError,
  AttioErrorCode,
  formatError,
  getSuggestionForError,
} from "../../src/utils/errors.js";

describe("AttioError", () => {
  describe("constructor", () => {
    it("should create an error with all properties", () => {
      const error = new AttioError(
        AttioErrorCode.NOT_FOUND,
        "Resource not found",
        404,
        { resource: "record" }
      );

      expect(error.code).toBe(AttioErrorCode.NOT_FOUND);
      expect(error.message).toBe("Resource not found");
      expect(error.statusCode).toBe(404);
      expect(error.details).toEqual({ resource: "record" });
      expect(error.name).toBe("AttioError");
    });

    it("should extend Error", () => {
      const error = new AttioError(AttioErrorCode.NOT_FOUND, "Not found", 404);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("fromResponse", () => {
    it("should create error from API response", () => {
      const response = {
        status_code: 429,
        type: "rate_limit",
        code: AttioErrorCode.RATE_LIMIT,
        message: "Too many requests",
      };

      const error = AttioError.fromResponse(response);

      expect(error.code).toBe(AttioErrorCode.RATE_LIMIT);
      expect(error.message).toBe("Too many requests");
      expect(error.statusCode).toBe(429);
    });
  });

  describe("networkError", () => {
    it("should create network error", () => {
      const error = AttioError.networkError("Connection refused");

      expect(error.code).toBe(AttioErrorCode.NETWORK_ERROR);
      expect(error.message).toBe("Connection refused");
      expect(error.statusCode).toBe(0);
    });
  });
});

describe("getSuggestionForError", () => {
  it("should return suggestion for rate limit error", () => {
    const error = new AttioError(AttioErrorCode.RATE_LIMIT, "Rate limited", 429);
    const suggestion = getSuggestionForError(error);
    expect(suggestion).toContain("Wait");
  });

  it("should return suggestion for not found error", () => {
    const error = new AttioError(AttioErrorCode.NOT_FOUND, "Not found", 404);
    const suggestion = getSuggestionForError(error);
    expect(suggestion).toContain("Verify");
  });

  it("should return suggestion for unique violation error", () => {
    const error = new AttioError(AttioErrorCode.UNIQUE_VIOLATION, "Duplicate", 422);
    const suggestion = getSuggestionForError(error);
    expect(suggestion).toContain("already exists");
  });

  it("should return suggestion for unauthorized error", () => {
    const error = new AttioError(AttioErrorCode.UNAUTHORIZED, "Unauthorized", 401);
    const suggestion = getSuggestionForError(error);
    expect(suggestion).toContain("ATTIO_API_KEY");
  });

  it("should return suggestion for permission denied error", () => {
    const error = new AttioError(AttioErrorCode.PERMISSION_DENIED, "Forbidden", 403);
    const suggestion = getSuggestionForError(error);
    expect(suggestion).toContain("permission");
  });

  it("should return suggestion for validation error", () => {
    const error = new AttioError(AttioErrorCode.VALIDATION_ERROR, "Invalid", 422);
    const suggestion = getSuggestionForError(error);
    expect(suggestion).toContain("parameters");
  });

  it("should return suggestion for network error", () => {
    const error = new AttioError(AttioErrorCode.NETWORK_ERROR, "Failed", 0);
    const suggestion = getSuggestionForError(error);
    expect(suggestion).toContain("network");
  });

  it("should return default suggestion for unknown error", () => {
    const error = new AttioError("unknown_error", "Unknown", 500);
    const suggestion = getSuggestionForError(error);
    expect(suggestion).toContain("error details");
  });
});

describe("formatError", () => {
  it("should format error as JSON string", () => {
    const error = new AttioError(
      AttioErrorCode.NOT_FOUND,
      "Record not found",
      404,
      { id: "123" }
    );

    const formatted = formatError(error);
    const parsed = JSON.parse(formatted);

    expect(parsed.error).toBe(true);
    expect(parsed.code).toBe(AttioErrorCode.NOT_FOUND);
    expect(parsed.message).toBe("Record not found");
    expect(parsed.suggestion).toBeDefined();
    expect(parsed.details).toEqual({ id: "123" });
  });
});
