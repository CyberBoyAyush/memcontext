import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { captcha } from "better-auth/plugins";
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
import { sendAuthEmail } from "./email.js";

// Initialize Dodo Payments client (exported for use in subscription routes)
export const dodoClient = new DodoPayments({
  bearerToken: env.DODO_PAYMENTS_API_KEY,
  environment: env.DODO_PAYMENTS_ENVIRONMENT,
});

export const auth: ReturnType<typeof betterAuth> = betterAuth({
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
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Reset your MemContext password",
        text: `Reset your MemContext password here: ${url}`,
        html: authEmailHtml({
          title: "Reset your MemContext password",
          body: "Use this secure link to choose a new password for your MemContext account.",
          buttonText: "Reset password",
          url,
        }),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Verify your MemContext email",
        text: `Verify your MemContext account here: ${url}`,
        html: authEmailHtml({
          title: "Verify your MemContext email",
          body: "Confirm your email address to finish setting up your MemContext account.",
          buttonText: "Verify email",
          url,
        }),
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 30,
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
    captcha({
      provider: "cloudflare-turnstile",
      secretKey: env.TURNSTILE_SECRET_KEY,
    }),
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

function authEmailHtml({
  title,
  body,
  buttonText,
  url,
}: {
  title: string;
  body: string;
  buttonText: string;
  url: string;
}) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fafafa;">
    <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
      <div style="border:1px solid rgba(255,255,255,0.12);border-radius:20px;background:#111;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,0.35);">
        <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#fafafa;">${title}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#a1a1a1;">${body}</p>
        <a href="${url}" style="display:inline-block;border-radius:12px;background:#fafafa;color:#0a0a0a;text-decoration:none;font-weight:600;font-size:14px;padding:13px 18px;">${buttonText}</a>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#737373;">If the button does not work, copy and paste this link into your browser:<br><a href="${url}" style="color:#fafafa;word-break:break-all;">${url}</a></p>
      </div>
    </div>
  </body>
</html>`;
}
