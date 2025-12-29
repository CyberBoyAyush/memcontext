"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Brain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signIn } from "@/lib/auth-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = searchParams.get("from") || "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await signIn.email({
        email,
        password,
        callbackURL: from,
      });

      if (error) {
        setError(error.message || "Failed to sign in");
        setLoading(false);
        return;
      }

      router.push(from);
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign in"
        )}
      </Button>

      <p className="text-center text-sm text-foreground-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-foreground hover:underline font-medium"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}

function LoginFormFallback() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-4 w-12 bg-surface-elevated rounded animate-pulse" />
        <div className="h-10 w-full bg-surface-elevated rounded-lg animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-16 bg-surface-elevated rounded animate-pulse" />
        <div className="h-10 w-full bg-surface-elevated rounded-lg animate-pulse" />
      </div>
      <div className="h-10 w-full bg-surface-elevated rounded-lg animate-pulse" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Brain className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your MemContext account</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LoginFormFallback />}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
