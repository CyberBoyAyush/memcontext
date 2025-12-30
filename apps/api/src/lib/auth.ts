import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import * as authSchema from "../db/auth-schema.js";
import { env } from "../env.js";
import { getOrCreateSubscription } from "../services/subscription.js";
import { logger } from "./logger.js";

// Build social providers config only if credentials are provided
const socialProviders: Record<
  string,
  { clientId: string; clientSecret: string }
> = {};

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  };
}

if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  };
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.DASHBOARD_URL],
  emailAndPassword: {
    enabled: true,
  },
  // Only include socialProviders if at least one is configured
  ...(Object.keys(socialProviders).length > 0 && { socialProviders }),
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7,
    },
  },
  advanced: {
    // Cross-subdomain cookies for api.memcontext.in <-> app.memcontext.in
    crossSubDomainCookies:
      env.NODE_ENV === "production"
        ? {
            enabled: true,
            domain: ".memcontext.in",
          }
        : undefined,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          logger.info(
            { userId: user.id, email: user.email },
            "new user signed up, creating subscription",
          );
          await getOrCreateSubscription(user.id);
        },
      },
    },
  },
});

export type Auth = typeof auth;
