"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development, could send to error tracking service in production
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
          <div className="mx-auto w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-error" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-foreground-muted">
              An unexpected error occurred. Please try again or contact support
              if the problem persists.
            </p>
          </div>

          {error.digest && (
            <p className="text-xs text-foreground-subtle font-mono">
              Error ID: {error.digest}
            </p>
          )}

          <div className="flex items-center justify-center gap-4">
            <Button onClick={reset}>
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/dashboard")}
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
