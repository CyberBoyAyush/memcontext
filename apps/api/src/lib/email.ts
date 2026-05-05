import { env } from "../env.js";
import { logger } from "./logger.js";

interface SendAuthEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendAuthEmail({
  to,
  subject,
  text,
  html,
}: SendAuthEmailOptions) {
  let response: Response;

  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to,
        subject,
        text,
        html,
      }),
    });
  } catch (error) {
    logger.error({ error }, "failed to send auth email");
    throw new Error("Failed to send auth email");
  }

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(
      { status: response.status, errorText },
      "failed to send auth email",
    );
    throw new Error("Failed to send auth email");
  }
}
