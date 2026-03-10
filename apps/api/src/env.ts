import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = resolve(__dirname, "../.env");

config({ path: envPath });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
  UPSTASH_REDIS_REST_URL: z
    .string()
    .url("UPSTASH_REDIS_REST_URL must be a valid URL"),
  UPSTASH_REDIS_REST_TOKEN: z
    .string()
    .min(1, "UPSTASH_REDIS_REST_TOKEN is required"),
  PORT: z.string().optional().default("3000"),
  NODE_ENV: z.enum(["dev", "production", "test"]).optional().default("dev"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .optional()
    .default("info"),
  LOGTAIL_SOURCE_TOKEN: z.string().optional(),
  LOGTAIL_INGEST_ENDPOINT: z.string().url().optional(),

  // Better Stack Query API (optional - for usage analytics)
  BETTERSTACK_QUERY_ENDPOINT: z.string().url().optional(),
  BETTERSTACK_QUERY_USER: z.string().optional(),
  BETTERSTACK_QUERY_PASSWORD: z.string().optional(),
  BETTERSTACK_SOURCE_TABLE: z.string().optional(),

  // Better Auth
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),
  DASHBOARD_URL: z.string().url("DASHBOARD_URL must be a valid URL"),

  // OAuth Providers (required - these are the only login methods)
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  GITHUB_CLIENT_ID: z.string().min(1, "GITHUB_CLIENT_ID is required"),
  GITHUB_CLIENT_SECRET: z.string().min(1, "GITHUB_CLIENT_SECRET is required"),

  // Dodo Payments
  DODO_PAYMENTS_API_KEY: z.string().min(1, "DODO_PAYMENTS_API_KEY is required"),
  DODO_PAYMENTS_WEBHOOK_SECRET: z
    .string()
    .min(1, "DODO_PAYMENTS_WEBHOOK_SECRET is required"),
  DODO_PAYMENTS_ENVIRONMENT: z
    .enum(["test_mode", "live_mode"])
    .default("test_mode"),
  DODO_PRODUCT_HOBBY: z.string().min(1, "DODO_PRODUCT_HOBBY is required"),
  DODO_PRODUCT_PRO: z.string().min(1, "DODO_PRODUCT_PRO is required"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  for (const error of parsed.error.errors) {
    console.error(`  - ${error.path.join(".")}: ${error.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
