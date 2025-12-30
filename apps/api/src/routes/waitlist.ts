import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index.js";
import { waitlist } from "../db/schema.js";
import { rateLimitWaitlist } from "../middleware/rate-limit.js";
import { logger } from "../lib/logger.js";
import { getRequestId } from "../middleware/request-logger.js";

const waitlistRoute = new Hono();

const VALID_SOURCES = ["hero", "final-cta"] as const;
const VALID_REFERRERS = ["twitter", "x", "peerlist", "linkedin"] as const;
type StoredReferrer = "twitter" | "peerlist" | "linkedin";

function normalizeReferrer(
  ref: string | null | undefined,
): StoredReferrer | null {
  if (!ref) return null;
  if (ref === "x") return "twitter";
  return ref as StoredReferrer;
}

const joinWaitlistSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  source: z.enum(VALID_SOURCES, {
    errorMap: () => ({ message: "Invalid source" }),
  }),
  referrer: z
    .enum(VALID_REFERRERS)
    .nullable()
    .optional()
    .transform(normalizeReferrer),
});

waitlistRoute.post("/", rateLimitWaitlist, async (c) => {
  const requestId = getRequestId(c);

  const body = await c.req.json().catch(() => ({}));
  const parsed = joinWaitlistSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    logger.debug(
      { requestId, errors: parsed.error.errors },
      "waitlist validation failed",
    );
    return c.json({ error: firstError?.message || "Invalid request" }, 400);
  }

  const { email, source, referrer } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    await db.insert(waitlist).values({
      email: normalizedEmail,
      source,
      referrer,
    });

    logger.info(
      {
        requestId,
        source,
        referrer,
        emailDomain: normalizedEmail.split("@")[1],
      },
      "new waitlist signup",
    );

    return c.json({
      success: true,
      alreadyExists: false,
      message: "You're in! We'll notify you when we launch.",
    });
  } catch (err) {
    type PgError = Error & {
      code?: string;
      cause?: { code?: string; constraint?: string };
    };

    const pgErr = err as PgError;
    const errorCode = pgErr.code || pgErr.cause?.code;
    const isUniqueViolation = errorCode === "23505";

    if (isUniqueViolation) {
      logger.debug({ requestId, source, referrer }, "duplicate waitlist email");

      return c.json({
        success: true,
        alreadyExists: true,
        message: "You're already on the list! Stay tuned.",
      });
    }

    logger.error({ requestId, error: err }, "waitlist signup failed");
    throw err;
  }
});

export default waitlistRoute;
