import { env } from "../env.js";
import { logger } from "./logger.js";

interface BetterStackConfig {
  endpoint: string;
  user: string;
  password: string;
  sourceTable: string;
}

interface QueryResult<T> {
  success: boolean;
  data: T[];
  error?: string;
  statusCode?: number;
}

interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 4000,
};

function isRetryableError(
  statusCode: number | undefined,
  error: string,
): boolean {
  // Retry on rate limiting, server errors, timeouts
  if (statusCode && statusCode >= 500) return true;
  if (statusCode === 429) return true; // Too Many Requests
  if (error.includes("timeout") || error.includes("ETIMEDOUT")) return true;
  if (error.includes("ECONNRESET") || error.includes("ECONNREFUSED"))
    return true;
  if (error.includes("TOO_MANY_SIMULTANEOUS_QUERIES")) return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getConfig(): BetterStackConfig | null {
  const {
    BETTERSTACK_QUERY_ENDPOINT,
    BETTERSTACK_QUERY_USER,
    BETTERSTACK_QUERY_PASSWORD,
    BETTERSTACK_SOURCE_TABLE,
  } = env;

  if (
    !BETTERSTACK_QUERY_ENDPOINT ||
    !BETTERSTACK_QUERY_USER ||
    !BETTERSTACK_QUERY_PASSWORD ||
    !BETTERSTACK_SOURCE_TABLE
  ) {
    return null;
  }

  return {
    endpoint: BETTERSTACK_QUERY_ENDPOINT,
    user: BETTERSTACK_QUERY_USER,
    password: BETTERSTACK_QUERY_PASSWORD,
    sourceTable: BETTERSTACK_SOURCE_TABLE,
  };
}

export function isBetterStackConfigured(): boolean {
  return getConfig() !== null;
}

async function executeQuery<T>(
  config: BetterStackConfig,
  sql: string,
): Promise<QueryResult<T>> {
  const authHeader = Buffer.from(`${config.user}:${config.password}`).toString(
    "base64",
  );

  const response = await fetch(
    `${config.endpoint}?output_format_pretty_row_numbers=0`,
    {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Authorization: `Basic ${authHeader}`,
      },
      body: `${sql} FORMAT JSONEachRow`,
      signal: AbortSignal.timeout(30000),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    return {
      success: false,
      data: [],
      error: errorText.slice(0, 500),
      statusCode: response.status,
    };
  }

  const text = await response.text();

  if (!text.trim()) {
    return { success: true, data: [] };
  }

  const lines = text.trim().split("\n");
  const data = lines.map((line) => JSON.parse(line) as T);

  return { success: true, data };
}

export async function queryBetterStack<T>(
  sql: string,
  queryName?: string,
  options: Partial<RetryOptions> = {},
): Promise<QueryResult<T>> {
  const config = getConfig();

  if (!config) {
    return {
      success: false,
      data: [],
      error: "Better Stack Query API not configured",
    };
  }

  const { maxRetries, baseDelayMs, maxDelayMs } = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };

  let lastError = "";
  let lastStatusCode: number | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await executeQuery<T>(config, sql);

      if (result.success) {
        return result;
      }

      lastError = result.error ?? "Unknown error";
      lastStatusCode = result.statusCode;

      // Check if we should retry
      if (attempt < maxRetries && isRetryableError(lastStatusCode, lastError)) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        logger.warn(
          {
            queryName,
            attempt: attempt + 1,
            maxRetries,
            statusCode: lastStatusCode,
            error: lastError.slice(0, 200),
            retryDelayMs: delay,
          },
          "Better Stack query failed, retrying",
        );
        await sleep(delay);
        continue;
      }

      // Non-retryable error or max retries reached
      break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown error";

      if (attempt < maxRetries && isRetryableError(undefined, lastError)) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        logger.warn(
          {
            queryName,
            attempt: attempt + 1,
            maxRetries,
            error: lastError,
            retryDelayMs: delay,
          },
          "Better Stack query threw error, retrying",
        );
        await sleep(delay);
        continue;
      }

      break;
    }
  }

  // Log final failure
  logger.error(
    {
      queryName,
      statusCode: lastStatusCode,
      error: lastError.slice(0, 500),
      sql: sql.slice(0, 300),
    },
    "Better Stack query failed after retries",
  );

  return {
    success: false,
    data: [],
    error: lastError,
    statusCode: lastStatusCode,
  };
}

export function getSourceTable(): string {
  const config = getConfig();
  return config?.sourceTable ?? "";
}

// Query for recent logs (hot storage)
export function logsTable(): string {
  return `remote(${getSourceTable()}_logs)`;
}

// Query for historical logs (cold storage - S3)
export function historicalLogsTable(): string {
  return `s3Cluster(primary, ${getSourceTable()}_s3)`;
}
