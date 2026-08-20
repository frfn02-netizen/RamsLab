export type ApiErrorDetails = {
  code?: string;
  details?: unknown;
  fieldErrors?: Record<string, string[]>;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: ApiErrorDetails,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

export function getUserFacingError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return "The RAMS API is unavailable. Check your connection and try again.";
    if (error.status === 401) return "Your session has expired. Please sign in again.";
    if (error.status === 403) {
      if (error.message === "Cross-origin request denied") {
        return "The API rejected this frontend origin. Add the current frontend URL to FRONTEND_URL on Railway.";
      }
      if (error.message === "CSRF validation failed") {
        return "Your security session is stale. Log out, sign in again, and retry.";
      }
      return error.message || "You do not have permission to perform this action.";
    }
    if (error.status === 404) return "The requested resource was not found.";
    if (error.status === 409) return error.message || "This conflicts with an existing record.";
    if (error.status === 429) return "Too many requests. Please wait a moment and try again.";
    if (error.status >= 500) return "The RAMS API encountered a problem. Please try again.";
    if (error.status === 400 || error.status === 422) return error.message || "Please review the submitted information.";
    return error.message || "The request could not be completed.";
  }

  return "Something went wrong. Please try again.";
}
