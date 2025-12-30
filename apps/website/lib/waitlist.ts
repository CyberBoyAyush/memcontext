const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://api.memcontext.in"
    : "http://localhost:3000";

type WaitlistSource = "hero" | "final-cta";
type WaitlistReferrer = "twitter" | "peerlist" | "linkedin" | null;

interface JoinWaitlistParams {
  email: string;
  source: WaitlistSource;
  referrer: WaitlistReferrer;
}

interface WaitlistSuccessResponse {
  success: true;
  alreadyExists: boolean;
  message: string;
}

interface WaitlistErrorResponse {
  success: false;
  error: string;
  isRateLimited?: boolean;
}

type WaitlistResponse = WaitlistSuccessResponse | WaitlistErrorResponse;

export async function joinWaitlist(
  params: JoinWaitlistParams,
): Promise<WaitlistResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (response.status === 429) {
      return {
        success: false,
        error: "Too many attempts. Please try again later.",
        isRateLimited: true,
      };
    }

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Something went wrong. Please try again.",
      };
    }

    return {
      success: true,
      alreadyExists: data.alreadyExists ?? false,
      message: data.message,
    };
  } catch {
    return {
      success: false,
      error: "Unable to connect. Please check your internet and try again.",
    };
  }
}
