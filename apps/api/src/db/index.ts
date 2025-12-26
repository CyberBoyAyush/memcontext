import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";
import { logger } from "../lib/logger.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let connectionLogged = false;

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  return connectionString;
}

function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = getConnectionString();
    const isNeon = connectionString.includes("neon.tech");

    pool = new Pool({
      connectionString,
      ssl: isNeon ? true : undefined,
    });

    pool.on("error", (err) => {
      logger.error(
        {
          errorMessage: err.message,
          errorName: err.name,
        },
        "database pool error",
      );
    });

    pool.on("connect", () => {
      if (!connectionLogged) {
        connectionLogged = true;
        logger.info(
          {
            ssl: isNeon,
            host: connectionString.includes("@")
              ? connectionString.split("@")[1]?.split("/")[0]
              : "unknown",
          },
          "database connected",
        );
      }
    });
  }
  return pool;
}

export const db = drizzle(getPool(), { schema });

export async function closeDb(): Promise<void> {
  if (pool) {
    logger.info("closing database connection");
    await pool.end();
    pool = null;
    connectionLogged = false;
  }
}

export async function checkDbConnection(): Promise<boolean> {
  const start = performance.now();
  try {
    const client = await getPool().connect();
    await client.query("SELECT 1");
    client.release();

    const duration = Math.round(performance.now() - start);
    logger.debug({ duration }, "database health check passed");

    return true;
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    logger.error(
      {
        duration,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      "database health check failed",
    );
    return false;
  }
}

export * from "./schema.js";
