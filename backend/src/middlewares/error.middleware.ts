import type { ErrorRequestHandler, RequestHandler } from "express";
import { MongoServerError } from "mongodb";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({
    success: false,
    message: "Resource not found",
  });
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error && typeof error === "object" && "type" in error) {
    const type = (error as { type?: string }).type;
    if (type === "entity.too.large") {
      return res
        .status(413)
        .json({ success: false, message: "Request body is too large" });
    }
    if (type === "entity.parse.failed") {
      return res
        .status(400)
        .json({ success: false, message: "Malformed JSON body" });
    }
  }

  const isProduction = process.env.NODE_ENV === "production";
  // Parser failures above are expected client errors, not server faults. Keep
  // unexpected errors visible without flooding test and development output
  // with their parser stack traces.
  console.error("Unhandled request error", {
    method: req.method,
    path: req.path,
    error,
    ...(isProduction
      ? {}
      : { stack: error instanceof Error ? error.stack : undefined }),
  });

  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.issues.map(({ path, message }) => ({ path, message })),
    });
  }

  if (error instanceof MongoServerError && error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "A resource with the same unique value already exists",
    });
  }

  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.details !== undefined && !isProduction
        ? { details: error.details }
        : {}),
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};
