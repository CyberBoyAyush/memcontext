import {
  queryBetterStack,
  getSourceTable,
  isBetterStackConfigured,
} from "../lib/betterstack.js";
import { logger } from "../lib/logger.js";

export interface UserUsageStats {
  searchesLast24h: number;
  searchesThisMonth: number;
  searchesAllTime: number;
  lastActivityAt: string | null;
}

interface CountResult {
  count: string;
}

interface LastActivityResult {
  lastActivity: string;
}

interface QueryDefinition {
  name: string;
  sql: string;
}

// MemContext userIds are 32-char alphanumeric strings (nanoid)
const USER_ID_REGEX = /^[a-zA-Z0-9_-]{20,40}$/;

function isValidUserId(userId: string): boolean {
  return USER_ID_REGEX.test(userId);
}

function escapeClickHouseString(value: string): string {
  return value
    .replace(/\\/g, "\\\\") // Backslashes first
    .replace(/'/g, "\\'") // Single quotes
    .replace(/\x00/g, "") // NULL bytes (remove)
    .replace(/\n/g, "\\n") // Newlines
    .replace(/\r/g, "\\r") // Carriage returns
    .replace(/\t/g, "\\t"); // Tabs
}

// Helper to build a UNION ALL query for both hot and cold storage
function allLogsUnion(): string {
  const table = getSourceTable();
  return `(
    SELECT dt, raw FROM remote(${table}_logs)
    UNION ALL
    SELECT dt, raw FROM s3Cluster(primary, ${table}_s3) WHERE _row_type = 1
  )`;
}

export async function getUserUsageStats(
  userId: string,
): Promise<UserUsageStats | null> {
  if (!isBetterStackConfigured()) {
    logger.debug("Better Stack not configured, skipping usage stats");
    return null;
  }

  // Validate userId format to prevent SQL injection
  if (!isValidUserId(userId)) {
    logger.warn(
      { userId: userId.slice(0, 50) },
      "Invalid userId format for usage stats query",
    );
    return null;
  }

  const escapedUserId = escapeClickHouseString(userId);
  const allLogs = allLogsUnion();

  // Log structure:
  // raw = {"path": "/api/memories/search", "userId": "xxx", "statusCode": 200, "method": "GET/POST", ...}
  // Search: GET /api/memories/search

  // Better Stack allows max 4 concurrent queries for logs
  const queries: QueryDefinition[] = [
    {
      name: "searchesLast24h",
      sql: `
        SELECT count(*) as count
        FROM ${allLogs}
        WHERE JSONExtractString(raw, 'userId') = '${escapedUserId}'
          AND JSONExtractString(raw, 'path') = '/api/memories/search'
          AND JSONExtractInt(raw, 'statusCode') = 200
          AND dt >= now() - INTERVAL 24 HOUR
      `,
    },
    {
      name: "searchesThisMonth",
      sql: `
        SELECT count(*) as count
        FROM ${allLogs}
        WHERE JSONExtractString(raw, 'userId') = '${escapedUserId}'
          AND JSONExtractString(raw, 'path') = '/api/memories/search'
          AND JSONExtractInt(raw, 'statusCode') = 200
          AND dt >= toStartOfMonth(now())
      `,
    },
    {
      name: "searchesAllTime",
      sql: `
        SELECT count(*) as count
        FROM ${allLogs}
        WHERE JSONExtractString(raw, 'userId') = '${escapedUserId}'
          AND JSONExtractString(raw, 'path') = '/api/memories/search'
          AND JSONExtractInt(raw, 'statusCode') = 200
      `,
    },
    {
      name: "lastActivity",
      sql: `
        SELECT max(dt) as lastActivity
        FROM ${allLogs}
        WHERE JSONExtractString(raw, 'userId') = '${escapedUserId}'
      `,
    },
  ];

  const [
    searchesLast24hResult,
    searchesThisMonthResult,
    searchesAllTimeResult,
    lastActivityResult,
  ] = await Promise.all([
    queryBetterStack<CountResult>(queries[0].sql, queries[0].name),
    queryBetterStack<CountResult>(queries[1].sql, queries[1].name),
    queryBetterStack<CountResult>(queries[2].sql, queries[2].name),
    queryBetterStack<LastActivityResult>(queries[3].sql, queries[3].name),
  ]);

  const resultsForLogging = [
    { name: queries[0].name, result: searchesLast24hResult },
    { name: queries[1].name, result: searchesThisMonthResult },
    { name: queries[2].name, result: searchesAllTimeResult },
    { name: queries[3].name, result: lastActivityResult },
  ];

  const failedQueries: { name: string; error: string; statusCode?: number }[] =
    [];

  resultsForLogging.forEach(({ name, result }) => {
    if (!result.success) {
      failedQueries.push({
        name,
        error: result.error ?? "Unknown error",
        statusCode: result.statusCode,
      });
    }
  });

  if (failedQueries.length > 0) {
    logger.error(
      {
        userId,
        failedCount: failedQueries.length,
        totalQueries: resultsForLogging.length,
        failures: failedQueries,
      },
      "Usage stats queries failed",
    );
    return null;
  }

  const searchesLast24h = parseInt(
    searchesLast24hResult.data[0]?.count ?? "0",
    10,
  );
  const searchesThisMonth = parseInt(
    searchesThisMonthResult.data[0]?.count ?? "0",
    10,
  );
  const searchesAllTime = parseInt(
    searchesAllTimeResult.data[0]?.count ?? "0",
    10,
  );
  const lastActivity = lastActivityResult.data[0]?.lastActivity ?? null;

  let lastActivityAt: string | null = null;
  if (lastActivity) {
    // ClickHouse returns UTC time in format "2025-12-31 18:59:01.637000"
    // We need to parse it as UTC by appending 'Z' or using UTC methods
    // Also check for epoch (no data) - both formats possible
    const isEpoch =
      lastActivity === "1970-01-01 00:00:00.000000000" ||
      lastActivity === "1970-01-01 00:00:00.000000" ||
      lastActivity.startsWith("1970-01-01 00:00:00");

    if (!isEpoch) {
      // Replace space with T and append Z to parse as UTC
      const utcDateString = lastActivity.replace(" ", "T") + "Z";
      lastActivityAt = new Date(utcDateString).toISOString();
    }
  }

  return {
    searchesLast24h,
    searchesThisMonth,
    searchesAllTime,
    lastActivityAt,
  };
}
