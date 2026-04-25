import type { ApiError } from "@memcontext/types";

export class MemContextApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;
  readonly errorId?: string;

  constructor(status: number, error: ApiError) {
    super(error.error || `Request failed with status ${status}`);
    this.name = "MemContextApiError";
    this.status = status;
    this.code = error.code;
    this.requestId = error.requestId;
    this.errorId = error.errorId;
  }
}
