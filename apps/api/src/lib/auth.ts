import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  dodopayments,
  checkout,
  portal,
  webhooks,
} from "@dodopayments/better-auth";
import DodoPayments from "dodopayments";
import { db } from "../db/index.js";
import * as authSchema from "../db/auth-schema.js";
import { env } from "../env.js";
import { getOrCreateSubscription } from "../services/subscription.js";
import {
  handleSubscriptionActive,
  handleSubscriptionCancelled,
  handleSubscriptionExpired,
  handleSubscriptionOnHold,
  handleSubscriptionRenewed,
  handleSubscriptionPlanChanged,
  handleSubscriptionFailed,
} from "../services/dodo-webhooks.js";
import { logger } from "./logger.js";

// Initialize Dodo Payments client (exported for use in subscription routes)
export const dodoClient = new DodoPayments({
  bearerToken: env.DODO_PAYMENTS_API_KEY,
  environment: env.DODO_PAYMENTS_ENVIRONMENT,
});

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.DASHBOARD_URL],
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "user",
        input: false,
      },
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
  plugins: [
    dodopayments({
      client: dodoClient,
      // Free users are NOT created in Dodo - only when they upgrade
      createCustomerOnSignUp: false,
      use: [
        checkout({
          products: [
            { productId: env.DODO_PRODUCT_HOBBY, slug: "hobby" },
            { productId: env.DODO_PRODUCT_PRO, slug: "pro" },
          ],
          successUrl: `${env.DASHBOARD_URL}/subscription?success=true`,
          authenticatedUsersOnly: true,
        }),
        portal(),
        webhooks({
          webhookKey: env.DODO_PAYMENTS_WEBHOOK_SECRET,
          onSubscriptionActive: async (payload) => {
            await handleSubscriptionActive(payload);
          },
          onSubscriptionCancelled: async (payload) => {
            await handleSubscriptionCancelled(payload);
          },
          onSubscriptionExpired: async (payload) => {
            await handleSubscriptionExpired(payload);
          },
          onSubscriptionOnHold: async (payload) => {
            await handleSubscriptionOnHold(payload);
          },
          onSubscriptionRenewed: async (payload) => {
            await handleSubscriptionRenewed(payload);
          },
          onSubscriptionPlanChanged: async (payload) => {
            await handleSubscriptionPlanChanged(payload);
          },
          onSubscriptionFailed: async (payload) => {
            await handleSubscriptionFailed(payload);
          },
        }),
      ],
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          logger.info(
            { userId: user.id, email: user.email },
            "new user signed up, creating subscription",
          );
          // Only creates local subscription (free plan), NOT in Dodo
          await getOrCreateSubscription(user.id);
        },
      },
    },
  },
});

export type Auth = typeof auth;
