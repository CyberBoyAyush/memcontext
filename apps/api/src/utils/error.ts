// Re-export for backward compatibility
export {
  generateErrorId,
  serializeError as sanitizeErrorForLog,
  escapeForPrompt,
} from "./app-error.js";

import { logger } from "../lib/logger.js";
import { serializeError } from "./app-error.js";

export function logError(
  context: string,
  errorId: string,
  error: unknown,
): void {
  const serialized = serializeError(error);
  logger.error(
    {
      errorId,
      context,
      errorName: serialized.name,
      errorMessage: serialized.message,
      errorStack: serialized.stack,
      errorCode: serialized.code,
    },
    context,
  );
}
