import { randomBytes } from "crypto";

export type ErrorCategory =
  | "validation"
  | "auth"
  | "not_found"
  | "rate_limit"
  | "external"
  | "database"
  | "internal";

export interface ErrorContext {
  [key: string]: unknown;
}

export class AppError extends Error {
  public readonly id: string;
  public readonly category: ErrorCategory;
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context: ErrorContext;
  public readonly timestamp: string;

  constructor(
    message: string,
    options: {
      category: ErrorCategory;
      code: string;
      statusCode?: number;
      context?: ErrorContext;
      cause?: Error;
    },
  ) {
    super(message);
    this.name = "AppError";
    this.id = `ERR_${randomBytes(4).toString("hex").toUpperCase()}`;
    this.category = options.category;
    this.code = options.code;
    this.statusCode = options.statusCode ?? this.getDefaultStatusCode();
    this.context = options.context ?? {};
    this.timestamp = new Date().toISOString();

    if (options.cause) {
      this.cause = options.cause;
    }

    Error.captureStackTrace(this, this.constructor);
  }

  private getDefaultStatusCode(): number {
    switch (this.category) {
      case "validation":
        return 400;
      case "auth":
        return 401;
      case "not_found":
        return 404;
      case "rate_limit":
        return 429;
      case "external":
        return 502;
      case "database":
        return 503;
      case "internal":
      default:
        return 500;
    }
  }

  toJSON() {
    return {
      id: this.id,
      category: this.category,
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
    };
  }

  toLogObject() {
    return {
      errorId: this.id,
      errorCategory: this.category,
      errorCode: this.code,
      errorMessage: this.message,
      errorContext: this.context,
      errorStack: this.stack,
      errorCause: this.cause instanceof Error ? this.cause.message : undefined,
    };
  }
}

export function generateErrorId(): string {
  return `ERR_${randomBytes(4).toString("hex").toUpperCase()}`;
}

export function serializeError(error: unknown): {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  context?: ErrorContext;
} {
  if (error instanceof AppError) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      context: error.context,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as NodeJS.ErrnoException).code,
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
  };
}

export function escapeForPrompt(content: string): string {
  return content
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}
