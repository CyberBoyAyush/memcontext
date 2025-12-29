"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-6">
          <div className="mx-auto w-14 h-14 rounded-full bg-error/10 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-error" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-sm text-foreground-muted">
              We encountered an error while loading this page.
            </p>
          </div>

          {error.digest && (
            <p className="text-xs text-foreground-subtle font-mono bg-surface-elevated px-3 py-1.5 rounded-lg inline-block">
              Error ID: {error.digest}
            </p>
          )}

          <div className="flex items-center justify-center gap-3">
            <Button onClick={reset} size="sm">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = "/dashboard")}
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
