"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import {
  signIn,
  signUp,
  requestPasswordReset,
  resetPassword,
} from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Mode = "sign-in" | "sign-up" | "forgot" | "reset";

interface TurnstileRenderOptions {
  sitekey: string;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "flexible";
  callback?: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
}

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: TurnstileRenderOptions,
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function GitHubIcon({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

interface DotConfig {
  x: number;
  y: number;
  opacity: number;
  size: number;
}

function generateDots(count: number, seed: number): DotConfig[] {
  const dots: DotConfig[] = [];
  for (let i = 0; i < count; i++) {
    const x = (i * 17 + seed) % 100;
    const y = (i * 23 + seed * 7) % 100;
    const opacity = [0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6][i % 7];
    const size = [2, 2, 3, 3, 4][i % 5];
    dots.push({ x, y, opacity, size });
  }
  return dots;
}

interface TurnstileProps {
  onToken: (token: string | null) => void;
  resetSignal: number;
}

function Turnstile({ onToken, resetSignal }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderWidget = useCallback(() => {
    if (!TURNSTILE_SITE_KEY) return;
    const api = window.turnstile;
    const container = containerRef.current;
    if (!api || !container) return;
    if (widgetIdRef.current) return;
    widgetIdRef.current = api.render(container, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "dark",
      size: "flexible",
      callback: (token) => onToken(token),
      "error-callback": () => onToken(null),
      "expired-callback": () => onToken(null),
    });
  }, [onToken]);

  // Load the Turnstile script once and render the widget when ready.
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    if (window.turnstile) {
      renderWidget();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", renderWidget, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", renderWidget, { once: true });
    document.head.appendChild(script);
  }, [renderWidget]);

  // Reset the widget whenever the parent bumps the signal (after each attempt).
  useEffect(() => {
    if (resetSignal === 0) return;
    const api = window.turnstile;
    if (api && widgetIdRef.current) {
      api.reset(widgetIdRef.current);
      onToken(null);
    }
  }, [resetSignal, onToken]);

  // Cleanup widget on unmount.
  useEffect(() => {
    return () => {
      const api = window.turnstile;
      if (api && widgetIdRef.current) {
        api.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  if (!TURNSTILE_SITE_KEY) return null;

  return <div ref={containerRef} className="flex justify-center" />;
}

interface PasswordInputProps
  extends Omit<React.ComponentProps<typeof Input>, "type"> {
  id: string;
}

function PasswordInput({ id, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        id={id}
        type={visible ? "text" : "password"}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex items-center px-3 cursor-pointer transition-colors"
        style={{ color: "#6b6b6b" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#d4d4d4";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#6b6b6b";
        }}
      >
        {visible ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

function safeRedirectPath(path: string | null) {
  if (!path?.startsWith("/") || path.startsWith("//")) return "/dashboard";
  return path;
}

interface AuthFlowProps {
  initialMode: Mode;
  resetToken: string | null;
  callbackURL: string;
  signUpCallbackURL: string;
}

function AuthFlow({
  initialMode,
  resetToken,
  callbackURL,
  signUpCallbackURL,
}: AuthFlowProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(
    null,
  );

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Turnstile state
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);

  const handleCaptchaToken = useCallback((token: string | null) => {
    setCaptchaToken(token);
  }, []);

  const resetCaptcha = useCallback(() => {
    setCaptchaResetSignal((n) => n + 1);
    setCaptchaToken(null);
  }, []);

  const switchMode = (next: Mode) => {
    resetCaptcha();
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const captchaHeaders = (): Record<string, string> =>
    captchaToken ? { "x-captcha-response": captchaToken } : {};

  const captchaRequired = Boolean(TURNSTILE_SITE_KEY);
  const captchaNotConfigured = !TURNSTILE_SITE_KEY;
  const captchaMissing =
    captchaRequired &&
    !captchaToken &&
    (mode === "sign-in" || mode === "sign-up" || mode === "forgot");

  async function handleOAuthSignIn(provider: "google" | "github") {
    setError(null);
    setInfo(null);
    setOauthLoading(provider);
    try {
      await signIn.social({ provider, callbackURL });
    } catch {
      setError(`Failed to sign in with ${provider}`);
      setOauthLoading(null);
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (captchaNotConfigured) {
      setError("CAPTCHA is not configured. Add NEXT_PUBLIC_TURNSTILE_SITE_KEY.");
      return;
    }
    if (captchaMissing) {
      setError("Please complete the CAPTCHA before signing in.");
      return;
    }
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const { error: signInError } = await signIn.email(
        { email, password, callbackURL },
        { headers: captchaHeaders() },
      );
      if (signInError) {
        setError(signInError.message ?? "Failed to sign in");
      } else {
        window.location.href = callbackURL;
        return;
      }
    } catch {
      setError("Failed to sign in");
    } finally {
      setSubmitting(false);
      resetCaptcha();
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (captchaNotConfigured) {
      setError("CAPTCHA is not configured. Add NEXT_PUBLIC_TURNSTILE_SITE_KEY.");
      return;
    }
    if (captchaMissing) {
      setError("Please complete the CAPTCHA before creating your account.");
      return;
    }
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const { error: signUpError } = await signUp.email(
        { email, password, name, callbackURL: signUpCallbackURL },
        { headers: captchaHeaders() },
      );
      if (signUpError) {
        setError(signUpError.message ?? "Failed to create account");
      } else {
        setInfo(
          "Account created. We've emailed you a verification link — check your inbox and spam folder. If it doesn't arrive, sign up again to resend.",
        );
        setPassword("");
      }
    } catch {
      setError("Failed to create account");
    } finally {
      setSubmitting(false);
      resetCaptcha();
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (captchaNotConfigured) {
      setError("CAPTCHA is not configured. Add NEXT_PUBLIC_TURNSTILE_SITE_KEY.");
      return;
    }
    if (captchaMissing) {
      setError("Please complete the CAPTCHA before requesting a reset link.");
      return;
    }
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const redirectTo = `${window.location.origin}/login`;
      const { error: resetError } = await requestPasswordReset(
        { email, redirectTo },
        { headers: captchaHeaders() },
      );
      if (resetError) {
        setError(resetError.message ?? "Failed to send reset email");
      } else {
        setInfo(
          "Password reset link sent. Check your inbox and spam or junk folder.",
        );
      }
    } catch {
      setError("Failed to send reset email");
    } finally {
      setSubmitting(false);
      resetCaptcha();
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetToken) {
      setError("Missing reset token");
      return;
    }
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const { error: resetError } = await resetPassword({
        token: resetToken,
        newPassword,
      });
      if (resetError) {
        setError(resetError.message ?? "Failed to reset password");
      } else {
        setInfo("Password updated. Sign in with your new password.");
        setNewPassword("");
        setMode("sign-in");
        // Strip the token from the URL.
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.delete("token");
          window.history.replaceState({}, "", url.toString());
        }
      }
    } catch {
      setError("Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  }

  const isBusy = submitting || oauthLoading !== null;

  // Inline title/description varies per mode (header text in card stays generic).
  const formIntro = useMemo(() => {
    switch (mode) {
      case "sign-up":
        return "Create account";
      case "forgot":
        return "Reset password";
      case "reset":
        return "Set new password";
      default:
        return "Sign in";
    }
  }, [mode]);

  return (
    <div className="space-y-4">
      <p
        className="text-center lg:text-left text-[10px] uppercase tracking-[0.22em]"
        style={{ color: "#6b6b6b" }}
      >
        {formIntro}
      </p>

      {error && (
        <div
          className="p-3 rounded-xl text-sm"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            color: "#ef4444",
          }}
        >
          {error}
        </div>
      )}
      {info && (
        <div
          className="p-3 rounded-xl text-sm"
          style={{
            backgroundColor: "rgba(34, 197, 94, 0.08)",
            border: "1px solid rgba(34, 197, 94, 0.2)",
            color: "#86efac",
          }}
        >
          {info}
        </div>
      )}
      {captchaNotConfigured && mode !== "reset" && (
        <div
          className="p-3 rounded-xl text-sm"
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
            color: "#fbbf24",
          }}
        >
          CAPTCHA is not configured. Add NEXT_PUBLIC_TURNSTILE_SITE_KEY to
          enable email sign-in.
        </div>
      )}

      {(mode === "sign-in" || mode === "sign-up") && (
        <>
          <div className="grid gap-3">
            <button
              type="button"
              className="w-full h-11 text-sm font-medium rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 disabled:pointer-events-none disabled:opacity-50"
              style={{
                backgroundColor: "transparent",
                border: "1px solid #1f1f1f",
                color: "#fafafa",
              }}
              onClick={() => handleOAuthSignIn("google")}
              disabled={isBusy}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#171717";
                e.currentTarget.style.borderColor = "#2a2a2a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "#1f1f1f";
              }}
            >
              {oauthLoading === "google" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <GoogleIcon className="h-5 w-5" />
              )}
              Continue with Google
            </button>
            <button
              type="button"
              className="w-full h-11 text-sm font-medium rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 disabled:pointer-events-none disabled:opacity-50"
              style={{
                backgroundColor: "transparent",
                border: "1px solid #1f1f1f",
                color: "#fafafa",
              }}
              onClick={() => handleOAuthSignIn("github")}
              disabled={isBusy}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#171717";
                e.currentTarget.style.borderColor = "#2a2a2a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "#1f1f1f";
              }}
            >
              {oauthLoading === "github" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <GitHubIcon className="h-5 w-5" style={{ color: "#fafafa" }} />
              )}
              Continue with GitHub
            </button>
          </div>

          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <span
                className="w-full border-t"
                style={{ borderColor: "#1f1f1f" }}
              />
            </div>
            <div className="relative flex justify-center">
              <span
                className="px-3 text-xs uppercase tracking-widest"
                style={{
                  backgroundColor: "rgba(17, 17, 17, 0.95)",
                  color: "#6b6b6b",
                }}
              >
                or
              </span>
            </div>
          </div>
        </>
      )}

      {mode === "sign-in" && (
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" style={{ color: "#d4d4d4" }}>
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isBusy}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" style={{ color: "#d4d4d4" }}>
                Password
              </Label>
              <button
                type="button"
                className="text-xs cursor-pointer hover:underline"
                style={{ color: "#a1a1a1" }}
                onClick={() => switchMode("forgot")}
              >
                Forgot password?
              </button>
            </div>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isBusy}
            />
          </div>

          <Turnstile
            onToken={handleCaptchaToken}
            resetSignal={captchaResetSignal}
          />

          <button
            type="submit"
            disabled={isBusy || captchaMissing || captchaNotConfigured}
            className="w-full h-11 text-sm font-medium rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 disabled:pointer-events-none disabled:opacity-50"
            style={{ backgroundColor: "#fafafa", color: "#0a0a0a" }}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sign in
          </button>

          <p className="text-center text-sm" style={{ color: "#a1a1a1" }}>
            Don&apos;t have an account?{" "}
            <button
              type="button"
              className="cursor-pointer hover:underline"
              style={{ color: "#fafafa" }}
              onClick={() => switchMode("sign-up")}
            >
              Create one
            </button>
          </p>
        </form>
      )}

      {mode === "sign-up" && (
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" style={{ color: "#d4d4d4" }}>
              Name
            </Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isBusy}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-up" style={{ color: "#d4d4d4" }}>
              Email
            </Label>
            <Input
              id="email-up"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isBusy}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password-up" style={{ color: "#d4d4d4" }}>
              Password
            </Label>
            <PasswordInput
              id="password-up"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isBusy}
            />
            <p className="text-xs" style={{ color: "#6b6b6b" }}>
              Use at least 8 characters.
            </p>
          </div>

          <Turnstile
            onToken={handleCaptchaToken}
            resetSignal={captchaResetSignal}
          />

          <button
            type="submit"
            disabled={isBusy || captchaMissing || captchaNotConfigured}
            className="w-full h-11 text-sm font-medium rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 disabled:pointer-events-none disabled:opacity-50"
            style={{ backgroundColor: "#fafafa", color: "#0a0a0a" }}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create account
          </button>

          <p className="text-center text-sm" style={{ color: "#a1a1a1" }}>
            Already have an account?{" "}
            <button
              type="button"
              className="cursor-pointer hover:underline"
              style={{ color: "#fafafa" }}
              onClick={() => switchMode("sign-in")}
            >
              Sign in
            </button>
          </p>
        </form>
      )}

      {mode === "forgot" && (
        <form onSubmit={handleForgot} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-forgot" style={{ color: "#d4d4d4" }}>
              Email
            </Label>
            <Input
              id="email-forgot"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isBusy}
            />
            <p className="text-xs" style={{ color: "#6b6b6b" }}>
              Enter your email and we&apos;ll send a reset link.
            </p>
          </div>

          <Turnstile
            onToken={handleCaptchaToken}
            resetSignal={captchaResetSignal}
          />

          <button
            type="submit"
            disabled={isBusy || captchaMissing || captchaNotConfigured}
            className="w-full h-11 text-sm font-medium rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 disabled:pointer-events-none disabled:opacity-50"
            style={{ backgroundColor: "#fafafa", color: "#0a0a0a" }}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Send reset link
          </button>

          <p className="text-center text-sm" style={{ color: "#a1a1a1" }}>
            Remembered it?{" "}
            <button
              type="button"
              className="cursor-pointer hover:underline"
              style={{ color: "#fafafa" }}
              onClick={() => switchMode("sign-in")}
            >
              Back to sign in
            </button>
          </p>
        </form>
      )}

      {mode === "reset" && (
        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password" style={{ color: "#d4d4d4" }}>
              New password
            </Label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              minLength={8}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isBusy}
            />
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="w-full h-11 text-sm font-medium rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 disabled:pointer-events-none disabled:opacity-50"
            style={{ backgroundColor: "#fafafa", color: "#0a0a0a" }}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Update password
          </button>

          <p className="text-center text-sm" style={{ color: "#a1a1a1" }}>
            <button
              type="button"
              className="cursor-pointer hover:underline"
              style={{ color: "#fafafa" }}
              onClick={() => switchMode("sign-in")}
            >
              Back to sign in
            </button>
          </p>
        </form>
      )}
    </div>
  );
}

function VerifiedSuccess() {
  const handleContinue = () => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("verified");
      window.history.replaceState({}, "", url.toString());
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div
        className="relative p-5 rounded-xl overflow-hidden"
        style={{
          backgroundColor: "rgba(34, 197, 94, 0.06)",
          border: "1px solid rgba(34, 197, 94, 0.22)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at top left, rgba(34,197,94,0.12) 0%, transparent 60%)",
          }}
        />
        <div className="relative flex items-start gap-3">
          <div
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: "rgba(34, 197, 94, 0.12)",
              border: "1px solid rgba(34, 197, 94, 0.25)",
            }}
          >
            <CheckCircle2 className="h-5 w-5" style={{ color: "#86efac" }} />
          </div>
          <div className="flex-1 pt-0.5">
            <p
              className="text-sm font-medium"
              style={{ color: "#bbf7d0" }}
            >
              Email verified
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: "#a1a1a1" }}
            >
              Your email has been confirmed. Please log in again to continue.
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleContinue}
        className="w-full h-12 text-sm font-medium rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
        style={{ backgroundColor: "#fafafa", color: "#0a0a0a" }}
      >
        Log In
      </button>
    </div>
  );
}

function LoginInner() {
  const searchParams = useSearchParams();
  const from = safeRedirectPath(searchParams.get("from"));
  const token = searchParams.get("token");
  const verifiedParam = searchParams.get("verified");
  const isVerified = verifiedParam === "true" || verifiedParam === "1";

  const callbackURL = useMemo(() => {
    if (typeof window === "undefined") return from;
    return new URL(from, window.location.origin).toString();
  }, [from]);

  const signUpCallbackURL = useMemo(() => {
    if (typeof window === "undefined") return "/login?verified=true";
    return new URL("/login?verified=true", window.location.origin).toString();
  }, []);

  if (isVerified) {
    return <VerifiedSuccess />;
  }

  const initialMode: Mode = token ? "reset" : "sign-in";

  return (
    <AuthFlow
      initialMode={initialMode}
      resetToken={token}
      callbackURL={callbackURL}
      signUpCallbackURL={signUpCallbackURL}
    />
  );
}

function LoginFormFallback() {
  return (
    <div className="space-y-3">
      <div
        className="h-12 w-full rounded-xl animate-pulse"
        style={{ backgroundColor: "#171717" }}
      />
      <div
        className="h-12 w-full rounded-xl animate-pulse"
        style={{ backgroundColor: "#171717" }}
      />
    </div>
  );
}

export default function LoginPage() {
  const leftDots = useMemo(() => generateDots(25, 42), []);
  const rightDots = useMemo(() => generateDots(25, 73), []);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      {/* Dotted glow background - Top Left */}
      <div className="absolute top-0 left-0 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] pointer-events-none">
        <div className="relative w-full h-full">
          {leftDots.map((dot, i) => (
            <div
              key={`left-${i}`}
              className="absolute rounded-full bg-white"
              style={{
                left: `${dot.x}%`,
                top: `${dot.y}%`,
                width: `${dot.size}px`,
                height: `${dot.size}px`,
                opacity: dot.opacity,
                boxShadow: `0 0 ${dot.size * 3}px ${dot.size}px rgba(255, 255, 255, ${dot.opacity * 0.5})`,
              }}
            />
          ))}
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom right, transparent, transparent, #0a0a0a)",
          }}
        />
      </div>

      {/* Dotted glow background - Top Right */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] pointer-events-none">
        <div className="relative w-full h-full">
          {rightDots.map((dot, i) => (
            <div
              key={`right-${i}`}
              className="absolute rounded-full bg-white"
              style={{
                left: `${dot.x}%`,
                top: `${dot.y}%`,
                width: `${dot.size}px`,
                height: `${dot.size}px`,
                opacity: dot.opacity,
                boxShadow: `0 0 ${dot.size * 3}px ${dot.size}px rgba(255, 255, 255, ${dot.opacity * 0.5})`,
              }}
            />
          ))}
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom left, transparent, transparent, #0a0a0a)",
          }}
        />
      </div>

      {/* Main shell — single column on mobile, side-by-side on desktop */}
      <div className="relative w-full max-w-md lg:max-w-5xl animate-fade-in">
        <div className="relative">
          {/* Border glow - top left */}
          <div
            className="absolute -top-px -left-px w-32 h-24 rounded-2xl blur-[1px]"
            style={{
              background:
                "radial-gradient(ellipse at top left, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 60%)",
            }}
          />
          {/* Border glow - bottom right */}
          <div
            className="absolute -bottom-px -right-px w-24 h-20 rounded-2xl blur-[1px]"
            style={{
              background:
                "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 30%, transparent 60%)",
            }}
          />

          <div
            className="relative rounded-2xl border border-white/10 backdrop-blur-xl overflow-hidden grid lg:grid-cols-[1.05fr_1fr]"
            style={{
              backgroundColor: "rgba(17, 17, 17, 0.8)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
            }}
          >
            {/* Inner glow overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />

            {/* Left brand / info panel — desktop only */}
            <div
              className="relative hidden lg:flex flex-col justify-between p-10 border-r border-white/10 overflow-hidden"
              style={{
                background:
                  "linear-gradient(155deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 45%, rgba(255,255,255,0) 100%)",
              }}
            >
              {/* Decorative gradient orb */}
              <div
                className="absolute -top-24 -left-24 w-72 h-72 rounded-full pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
                  filter: "blur(20px)",
                }}
              />
              <div
                className="absolute bottom-0 right-0 w-56 h-56 rounded-full pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)",
                  filter: "blur(20px)",
                }}
              />

              <div className="relative">
                {/* Logo */}
                <div className="relative inline-flex">
                  <div
                    className="absolute -top-[1px] -left-[1px] w-10 h-10 rounded-xl blur-[0.5px]"
                    style={{
                      background:
                        "radial-gradient(ellipse at top left, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.3) 30%, transparent 60%)",
                    }}
                  />
                  <div
                    className="relative w-12 h-12 rounded-xl backdrop-blur-sm border border-white/15 flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: "rgba(17, 17, 17, 0.9)" }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
                    <Image
                      src="/sign.png"
                      alt="MemContext Logo"
                      width={32}
                      height={32}
                      className="w-8 h-8 relative z-10"
                    />
                  </div>
                </div>

                <h2
                  className="mt-8 text-3xl font-bold tracking-tight leading-tight"
                  style={{ color: "#fafafa" }}
                >
                  Persistent memory
                  <br />
                  for every assistant.
                </h2>
                <p
                  className="mt-3 text-sm leading-relaxed max-w-sm"
                  style={{ color: "#a1a1a1" }}
                >
                  Capture, search, and share context across MCP clients, agents,
                  and your own apps — without rebuilding a memory layer.
                </p>
              </div>

              <div className="relative space-y-3">
                {[
                  "Scoped, multi-tenant memory store",
                  "MCP server + REST API + TypeScript SDK",
                  "Semantic search with rich metadata",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2.5 text-sm"
                    style={{ color: "#d4d4d4" }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: "#86efac" }}
                    />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Right form panel */}
            <div className="relative p-6 sm:p-8 lg:p-10">
              {/* Mobile-only header */}
              <div className="text-center mb-6 lg:hidden">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div
                      className="absolute -top-[1px] -left-[1px] w-10 h-10 rounded-xl blur-[0.5px]"
                      style={{
                        background:
                          "radial-gradient(ellipse at top left, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.3) 30%, transparent 60%)",
                      }}
                    />
                    <div
                      className="relative w-14 h-14 rounded-xl backdrop-blur-sm border border-white/15 flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: "rgba(17, 17, 17, 0.9)" }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
                      <Image
                        src="/sign.png"
                        alt="MemContext Logo"
                        width={36}
                        height={36}
                        className="w-9 h-9 relative z-10"
                      />
                    </div>
                  </div>
                </div>
                <h1
                  className="text-xl font-bold tracking-tight"
                  style={{ color: "#fafafa" }}
                >
                  Welcome to MemContext
                </h1>
              </div>

              {/* Desktop-only form heading */}
              <div className="hidden lg:block mb-6">
                <h1
                  className="text-xl font-semibold tracking-tight"
                  style={{ color: "#fafafa" }}
                >
                  Welcome back
                </h1>
                <p className="mt-1 text-sm" style={{ color: "#a1a1a1" }}>
                  Sign in to your MemContext dashboard.
                </p>
              </div>

              <Suspense fallback={<LoginFormFallback />}>
                <LoginInner />
              </Suspense>

              <p
                className="mt-6 text-center lg:text-left text-xs"
                style={{ color: "#6b6b6b" }}
              >
                By continuing, you agree to our Terms of Service and Privacy
                Policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
