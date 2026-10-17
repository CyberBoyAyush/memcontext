import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { dodopaymentsClient } from "@dodopayments/better-auth";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [
    inferAdditionalFields({
      user: {
        role: {
          type: "string",
          required: false,
        },
      },
    }),
    dodopaymentsClient(),
    // Sends the signed MCP OAuth query with consent/sign-in requests.
    oauthProviderClient(),
  ],
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  requestPasswordReset,
  resetPassword,
} = authClient;
