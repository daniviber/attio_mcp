import type { AttioErrorResponse } from "../api/types.js";

export enum AttioErrorCode {
  RATE_LIMIT = "rate_limit_exceeded",
  UNAUTHORIZED = "unauthorized",
  NOT_FOUND = "not_found",
  VALIDATION_ERROR = "validation_error",
  UNIQUE_VIOLATION = "unique_attribute_violation",
  PERMISSION_DENIED = "permission_denied",
  INTERNAL_ERROR = "internal_error",
  NETWORK_ERROR = "network_error",
}

export class AttioError extends Error {
  constructor(
    public code: AttioErrorCode | string,
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "AttioError";
  }

  static fromResponse(response: AttioErrorResponse): AttioError {
    return new AttioError(
      response.code,
      response.message,
      response.status_code,
      response
    );
  }

  static networkError(message: string): AttioError {
    return new AttioError(AttioErrorCode.NETWORK_ERROR, message, 0);
  }
}

export function getSuggestionForError(error: AttioError): string {
  switch (error.code) {
    case AttioErrorCode.RATE_LIMIT:
      return "Wait a moment and retry the request. The server is rate limited.";
    case AttioErrorCode.NOT_FOUND:
      return "Verify the object/record ID exists. Use attio_objects_list to see available objects.";
    case AttioErrorCode.UNIQUE_VIOLATION:
      return "A record with these unique attributes already exists. Use attio_records_update or attio_records_assert instead.";
    case AttioErrorCode.UNAUTHORIZED:
      return "Check that the ATTIO_API_KEY environment variable is set correctly.";
    case AttioErrorCode.PERMISSION_DENIED:
      return "The API key does not have permission for this operation. Check the required scopes.";
    case AttioErrorCode.VALIDATION_ERROR:
      return "Check the request parameters for invalid values.";
    case AttioErrorCode.NETWORK_ERROR:
      return "Check your network connection and try again.";
    default:
      return "Check the error details and try again.";
  }
}

export function formatError(error: AttioError): string {
  const suggestion = getSuggestionForError(error);
  return JSON.stringify(
    {
      error: true,
      code: error.code,
      message: error.message,
      suggestion,
      details: error.details,
    },
    null,
    2
  );
}
