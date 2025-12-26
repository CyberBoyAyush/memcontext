import { randomBytes } from "crypto";

export function generateErrorId(): string {
  return `ERR_${randomBytes(4).toString("hex").toUpperCase()}`;
}

export function sanitizeErrorForLog(error: unknown): {
  message: string;
  name: string;
  code?: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      code: (error as NodeJS.ErrnoException).code,
    };
  }
  return {
    message: String(error),
    name: "UnknownError",
  };
}

export function logError(
  context: string,
  errorId: string,
  error: unknown,
): void {
  const sanitized = sanitizeErrorForLog(error);
  console.error(
    JSON.stringify({
      errorId,
      context,
      error: sanitized,
      timestamp: new Date().toISOString(),
    }),
  );
}

export function escapeForPrompt(content: string): string {
  return content
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}
