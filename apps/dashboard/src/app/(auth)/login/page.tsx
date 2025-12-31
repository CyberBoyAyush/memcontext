"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";
import Image from "next/image";

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

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(
    null,
  );

  const from = searchParams.get("from") || "/dashboard";

  async function handleOAuthSignIn(provider: "google" | "github") {
    setError(null);
    setOauthLoading(provider);

    try {
      const callbackURL = new URL(from, window.location.origin).toString();
      await signIn.social({
        provider,
        callbackURL,
      });
    } catch {
      setError(`Failed to sign in with ${provider}`);
      setOauthLoading(null);
    }
  }

  const isDisabled = oauthLoading !== null;

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-3">
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 text-sm font-medium"
          onClick={() => handleOAuthSignIn("google")}
          disabled={isDisabled}
        >
          {oauthLoading === "google" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <GoogleIcon className="h-5 w-5" />
          )}
          Continue with Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 text-sm font-medium"
          onClick={() => handleOAuthSignIn("github")}
          disabled={isDisabled}
        >
          {oauthLoading === "github" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <GitHubIcon className="h-5 w-5" />
          )}
          Continue with GitHub
        </Button>
      </div>
    </div>
  );
}

function LoginFormFallback() {
  return (
    <div className="space-y-3">
      <div className="h-12 w-full bg-surface-elevated rounded-xl animate-pulse" />
      <div className="h-12 w-full bg-surface-elevated rounded-xl animate-pulse" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Primary large glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-accent/8 blur-[150px]" />
        {/* Secondary glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-accent/12 blur-[100px]" />
        {/* Accent glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-accent/15 blur-[80px]" />
      </div>

      {/* Main card */}
      <div className="relative w-full max-w-md animate-fade-in">
        {/* Card with premium styling */}
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

          {/* Main card content */}
          <div className="relative rounded-2xl border border-white/10 bg-surface/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
            {/* Inner glow overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />

            {/* Content */}
            <div className="relative p-8 sm:p-10">
              {/* Logo and header */}
              <div className="text-center mb-8">
                {/* Logo container with glass effect */}
                <div className="flex justify-center mb-5">
                  <div className="relative">
                    {/* Border glow */}
                    <div
                      className="absolute -top-[1px] -left-[1px] w-10 h-10 rounded-xl blur-[0.5px]"
                      style={{
                        background:
                          "radial-gradient(ellipse at top left, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.3) 30%, transparent 60%)",
                      }}
                    />
                    <div
                      className="absolute -bottom-[1px] -right-[1px] w-8 h-8 rounded-xl blur-[0.5px]"
                      style={{
                        background:
                          "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 30%, transparent 60%)",
                      }}
                    />
                    {/* Glass container */}
                    <div className="relative w-16 h-16 rounded-xl bg-surface/90 backdrop-blur-sm border border-white/15 flex items-center justify-center overflow-hidden">
                      {/* Inner glow */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
                      <Image
                        src="/sign.png"
                        alt="MemContext Logo"
                        width={40}
                        height={40}
                        className="w-10 h-10 relative z-10"
                      />
                    </div>
                  </div>
                </div>

                <h1 className="text-2xl font-bold tracking-tight mb-2">
                  Welcome to MemContext
                </h1>
                <p className="text-foreground-muted text-sm">
                  Sign in to access your dashboard
                </p>
              </div>

              {/* Login form */}
              <Suspense fallback={<LoginFormFallback />}>
                <LoginForm />
              </Suspense>

              {/* Footer text */}
              <p className="mt-6 text-center text-xs text-foreground-subtle">
                By continuing, you agree to our Terms of Service and Privacy
                Policy
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
