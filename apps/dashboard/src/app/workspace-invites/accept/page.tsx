"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useAcceptWorkspaceInvitation } from "@/lib/queries/company-brain";

function AcceptWorkspaceInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const acceptInvite = useAcceptWorkspaceInvitation();
  const submittedToken = useRef("");
  const { mutate, reset } = acceptInvite;

  useEffect(() => {
    if (!token || submittedToken.current === token) return;
    submittedToken.current = token;
    reset();
    mutate(token);
  }, [mutate, reset, token]);

  const accepted = acceptInvite.isSuccess;
  const failed = acceptInvite.isError || !token;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-elevated">
            {accepted ? (
              <CheckCircle className="h-5 w-5 text-success" weight="duotone" />
            ) : failed ? (
              <WarningCircle
                className="h-5 w-5 text-red-500"
                weight="duotone"
              />
            ) : (
              <SpinnerGap className="h-5 w-5 animate-spin text-accent" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-semibold">
              {accepted
                ? "Workspace invite accepted"
                : failed
                  ? "Invite could not be accepted"
                  : "Accepting workspace invite"}
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-foreground-muted">
              {accepted
                ? "You can now access this workspace from Settings, Context Vault, and workspace memories."
                : failed
                  ? "This invite may be expired, revoked, already used, or meant for a different account email."
                  : "Please wait while we add your account to the workspace."}
            </p>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button asChild>
            <Link href="/settings">Go to settings</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/context-vault">Open Context Vault</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function AcceptWorkspaceInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptWorkspaceInviteContent />
    </Suspense>
  );
}
