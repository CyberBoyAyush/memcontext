"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowLeftRight,
  BrainCircuit,
  Building2,
  Check,
  ChevronDown,
  Loader2,
  Lock,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";

// Inline Claude mark (Anthropic brand). Kept here to avoid an icon package dependency.
function ClaudeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="#D97757"
        d="m3.127 10.604 3.135-1.76.053-.153-.053-.085H6.11l-.525-.032-1.791-.048-1.554-.065-1.505-.08-.38-.081L0 7.832l.036-.234.32-.214.455.04 1.009.069 1.513.105 1.097.064 1.626.17h.259l.036-.105-.089-.065-.068-.064-1.566-1.062-1.695-1.121-.887-.646-.48-.327-.243-.306-.104-.67.435-.48.585.04.15.04.593.456 1.267.981 1.654 1.218.242.202.097-.068.012-.049-.109-.181-.9-1.626-.96-1.655-.428-.686-.113-.411a2 2 0 0 1-.068-.484l.496-.674L4.446 0l.662.089.279.242.411.94.666 1.48 1.033 2.014.302.597.162.553.06.17h.105v-.097l.085-1.134.157-1.392.154-1.792.052-.504.25-.605.497-.327.387.186.319.456-.045.294-.19 1.23-.37 1.93-.243 1.29h.142l.161-.16.654-.868 1.097-1.372.484-.545.565-.601.363-.287h.686l.505.751-.226.775-.707.895-.585.759-.839 1.13-.524.904.048.072.125-.012 1.897-.403 1.024-.186 1.223-.21.553.258.06.263-.218.536-1.307.323-1.533.307-2.284.54-.028.02.032.04 1.029.098.44.024h1.077l2.005.15.525.346.315.424-.053.323-.807.411-3.631-.863-.872-.218h-.12v.073l.726.71 1.331 1.202 1.667 1.55.084.383-.214.302-.226-.032-1.464-1.101-.565-.497-1.28-1.077h-.084v.113l.295.432 1.557 2.34.08.718-.112.234-.404.141-.444-.08-.911-1.28-.94-1.44-.759-1.291-.093.053-.448 4.821-.21.246-.484.186-.403-.307-.214-.496.214-.98.258-1.28.21-1.016.19-1.263.112-.42-.008-.028-.092.012-.953 1.307-1.448 1.957-1.146 1.227-.274.109-.477-.247.045-.44.266-.39 1.586-2.018.956-1.25.617-.723-.004-.105h-.036l-4.212 2.736-.75.096-.324-.302.04-.496.154-.162 1.267-.871z"
      />
    </svg>
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

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

interface ScopeMeta {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

const SCOPE_REGISTRY: Record<string, ScopeMeta> = {
  "mcp:memories": {
    title: "Read and write your memories",
    description:
      "Save new memories, search existing ones, and update or delete entries on your behalf.",
    icon: BrainCircuit,
  },
  openid: {
    title: "Verify your identity",
    description: "Identify which MemContext account is approving access.",
    icon: Lock,
  },
  profile: {
    title: "Access your profile",
    description: "Read your name and profile information.",
    icon: Sparkles,
  },
  email: {
    title: "Access your email address",
    description: "Read the email address on your MemContext account.",
    icon: Search,
  },
  offline_access: {
    title: "Stay connected when you're away",
    description:
      "Refresh access in the background so Claude can recall context across sessions.",
    icon: ArrowLeftRight,
  },
};

function humanizeScope(scope: string): ScopeMeta {
  const known = SCOPE_REGISTRY[scope];
  if (known) return known;
  return {
    title: scope,
    description: "Custom scope requested by the client.",
    icon: Sparkles,
  };
}

interface ConsentResponse {
  redirectURI?: string;
  error?: string;
  error_description?: string;
  message?: string;
}

interface WorkspaceOption {
  id: string;
  name: string;
  role: string;
}

interface WorkspacesResponse {
  workspaces?: WorkspaceOption[];
}

interface McpWorkspaceResponse {
  workspaceId?: string;
}

function ConsentInner() {
  const searchParams = useSearchParams();
  const session = useSession();

  const clientId = searchParams.get("client_id");
  const scope = searchParams.get("scope");
  const consentCode = searchParams.get("consent_code");

  const scopes = useMemo(() => {
    if (!scope) return [] as string[];
    return scope
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [scope]);

  // This page is the MemContext × Claude connector consent surface, so Claude
  // branding is shown unconditionally — even when the client_id string isn't
  // immediately recognizable.

  const [submitting, setSubmitting] = useState<"accept" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);

  // Redirect to /login while preserving the full consent URL.
  useEffect(() => {
    if (session.isPending) return;
    if (session.data) return;
    if (typeof window === "undefined") return;
    const here = `${window.location.pathname}${window.location.search}`;
    window.location.replace(`/login?from=${encodeURIComponent(here)}`);
  }, [session.data, session.isPending]);

  useEffect(() => {
    if (!session.data) return;
    let cancelled = false;

    Promise.all([
      fetch(`${API_URL}/api/workspaces`, { credentials: "include" }).then(
        async (res) => (res.ok ? ((await res.json()) as WorkspacesResponse) : {}),
      ),
      fetch(`${API_URL}/api/user/mcp-workspace`, {
        credentials: "include",
      }).then(
        async (res) =>
          res.ok ? ((await res.json()) as McpWorkspaceResponse) : {},
      ),
    ])
      .then(([workspaceData, mcpWorkspace]) => {
        if (cancelled) return;
        const nextWorkspaces = workspaceData.workspaces ?? [];
        setWorkspaces(nextWorkspaces);
        setWorkspaceId(
          mcpWorkspace.workspaceId ?? nextWorkspaces[0]?.id ?? "",
        );
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load workspaces.");
      })
      .finally(() => {
        if (!cancelled) setWorkspacesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session.data]);

  const missingRequired = !clientId || !scope;

  const submit = useCallback(
    async (accept: boolean) => {
      if (missingRequired) return;
      if (accept && !workspaceId) {
        setError("Select a workspace before authorizing Claude.");
        return;
      }
      setSubmitting(accept ? "accept" : "deny");
      setError(null);
      try {
        if (accept && workspaceId) {
          const workspaceRes = await fetch(`${API_URL}/api/user/mcp-workspace`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workspaceId }),
          });

          if (!workspaceRes.ok) {
            const data: ConsentResponse = await workspaceRes
              .json()
              .catch(() => ({}));
            setError(data.message || data.error || "Failed to select workspace.");
            setSubmitting(null);
            return;
          }
        }

        const res = await fetch(`${API_URL}/api/auth/oauth2/consent`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accept,
            ...(consentCode ? { consent_code: consentCode } : {}),
          }),
        });

        const data: ConsentResponse = await res.json().catch(() => ({}));

        if (!res.ok) {
          const message =
            data.error_description ||
            data.message ||
            data.error ||
            `Consent failed (${res.status})`;
          setError(message);
          setSubmitting(null);
          return;
        }

        if (data.redirectURI) {
          window.location.href = data.redirectURI;
          return;
        }

        // No redirectURI returned — surface a friendly message rather than spinning.
        setError(
          accept
            ? "Access approved, but no redirect was returned. You can safely close this tab."
            : "Access denied. You can safely close this tab.",
        );
        setSubmitting(null);
      } catch {
        setError("Network error. Please check your connection and try again.");
        setSubmitting(null);
      }
    },
    [consentCode, missingRequired, workspaceId],
  );

  // Session loading state.
  if (session.isPending) {
    return <ConsentSkeleton />;
  }

  // Authenticated user without required params → graceful error.
  if (missingRequired) {
    return <MissingParamsError clientId={clientId} scope={scope} />;
  }

  // Authenticated user is still null briefly during redirect; render nothing to avoid flicker.
  if (!session.data) {
    return <ConsentSkeleton />;
  }

  const userEmail = session.data.user.email;
  const userName = session.data.user.name;
  const isBusy = submitting !== null;
  const selectedWorkspace = workspaces.find((workspace) => workspace.id === workspaceId);
  const canAuthorize = !isBusy && !workspacesLoading && Boolean(workspaceId);

  return (
    <ConsentCard
      title={
        <>
          <span style={{ color: "#fafafa" }}>MemContext</span>
          <span className="mx-1.5" style={{ color: "#6b6b6b" }}>
            ×
          </span>
          <span style={{ color: "#fafafa" }}>Claude</span>
        </>
      }
    >
      <p
        className="text-[13px] leading-relaxed"
        style={{ color: "#a1a1a1" }}
      >
        <span style={{ color: "#fafafa" }}>Claude</span> is requesting access to
        your MemContext memories so it can recall context across conversations.
      </p>

      {/* Signed-in identity strip */}
      <div
        className="mt-3.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2"
        style={{
          backgroundColor: "rgba(255,255,255,0.02)",
          border: "1px solid #1f1f1f",
        }}
      >
        <div
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-medium uppercase tracking-wide"
          style={{
            backgroundColor: "#171717",
            border: "1px solid #2a2a2a",
            color: "#d4d4d4",
          }}
        >
          {(userName || userEmail || "?").trim().charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-[9px] uppercase tracking-[0.22em]"
            style={{ color: "#6b6b6b" }}
          >
            Signed in as
          </p>
          <p
            className="truncate text-[13px] font-medium leading-tight"
            style={{ color: "#fafafa" }}
          >
            {userName || userEmail}
          </p>
        </div>
      </div>

      {/* Workspace selection is saved before consent so MCP OAuth uses it. */}
      <div className="mt-4">
        <p
          className="text-[10px] uppercase tracking-[0.22em]"
          style={{ color: "#6b6b6b" }}
        >
          Workspace
        </p>
        <div className="relative mt-2">
          <button
            type="button"
            disabled={isBusy || workspacesLoading || workspaces.length === 0}
            onClick={() => setWorkspaceOpen((open) => !open)}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              backgroundColor: "rgba(255,255,255,0.02)",
              border: "1px solid #1f1f1f",
            }}
          >
            <div
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md"
              style={{
                backgroundColor: "#171717",
                border: "1px solid #2a2a2a",
              }}
            >
              <Building2 className="h-3 w-3" style={{ color: "#d4d4d4" }} />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-[13px] font-medium leading-tight"
                style={{ color: "#fafafa" }}
              >
                 {selectedWorkspace?.name ??
                   (workspacesLoading ? "Loading workspaces..." : "No workspace found")}
              </p>
              <p
                className="mt-1 text-[11.5px] leading-snug"
                style={{ color: "#a1a1a1" }}
              >
                Claude will save and search memories in this workspace.
              </p>
            </div>
            {workspaces.length > 1 && (
              <ChevronDown
                className="h-3.5 w-3.5 flex-shrink-0"
                style={{ color: "#a1a1a1" }}
              />
            )}
          </button>

          {workspaceOpen && workspaces.length > 1 && (
            <div
              className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg py-1 shadow-2xl"
              style={{
                backgroundColor: "#111111",
                border: "1px solid #1f1f1f",
              }}
            >
              {workspaces.map((workspace) => {
                const active = workspace.id === workspaceId;
                return (
                  <button
                    key={workspace.id}
                    type="button"
                    onClick={() => {
                      setWorkspaceId(workspace.id);
                      setWorkspaceOpen(false);
                    }}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-[13px] transition-colors"
                    style={{
                      color: active ? "#fafafa" : "#a1a1a1",
                      backgroundColor: active
                        ? "rgba(232, 97, 60, 0.1)"
                        : "transparent",
                    }}
                  >
                    <span className="truncate">{workspace.name}</span>
                    {active && (
                      <Check className="h-3.5 w-3.5" style={{ color: "#e8613c" }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Scope list */}
      <div className="mt-4">
        <p
          className="text-[10px] uppercase tracking-[0.22em]"
          style={{ color: "#6b6b6b" }}
        >
          This will allow Claude to
        </p>
        <ul className="mt-2 space-y-1.5">
          {scopes.map((s) => {
            const meta = humanizeScope(s);
            const Icon = meta.icon;
            return (
              <li
                key={s}
                className="flex items-start gap-2.5 rounded-lg px-2.5 py-2"
                style={{
                  backgroundColor: "rgba(255,255,255,0.02)",
                  border: "1px solid #1f1f1f",
                }}
              >
                <div
                  className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md"
                  style={{
                    backgroundColor: "#171717",
                    border: "1px solid #2a2a2a",
                  }}
                >
                  <Icon className="h-3 w-3" style={{ color: "#d4d4d4" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p
                      className="text-[13px] font-medium leading-tight"
                      style={{ color: "#fafafa" }}
                    >
                      {meta.title}
                    </p>
                    <p
                      className="truncate font-mono text-[10px]"
                      style={{ color: "#525252" }}
                    >
                      {s}
                    </p>
                  </div>
                  <p
                    className="mt-1 text-[11.5px] leading-snug"
                    style={{ color: "#a1a1a1" }}
                  >
                    {meta.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Security framing */}
      <div
        className="mt-3.5 flex items-start gap-2 rounded-lg px-3 py-2.5"
        style={{
          backgroundColor: "rgba(232, 97, 60, 0.06)",
          border: "1px solid rgba(232, 97, 60, 0.2)",
        }}
      >
        <Lock
          className="mt-0.5 h-3 w-3 flex-shrink-0"
          style={{ color: "#e8613c" }}
        />
        <p
          className="text-[11.5px] leading-snug"
          style={{ color: "#d4d4d4" }}
        >
          MemContext only shares data covered by the scopes above. Decline to
          stop the connection from being created.
        </p>
      </div>

      {error && (
        <div
          className="mt-3.5 flex items-start gap-2 rounded-lg px-3 py-2.5 text-[13px]"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            color: "#fca5a5",
          }}
          role="alert"
        >
          <AlertTriangle
            className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
            style={{ color: "#ef4444" }}
          />
          <span>{error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => submit(false)}
          className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg text-[13px] font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50"
          style={{
            backgroundColor: "transparent",
            border: "1px solid #1f1f1f",
            color: "#fafafa",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#171717";
            e.currentTarget.style.borderColor = "#2a2a2a";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.borderColor = "#1f1f1f";
          }}
        >
          {submitting === "deny" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
          Decline
        </button>
        <button
          type="button"
          disabled={!canAuthorize}
          onClick={() => submit(true)}
          className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg text-[13px] font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50"
          style={{ backgroundColor: "#fafafa", color: "#0a0a0a" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#e8e8e8";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#fafafa";
          }}
        >
          {submitting === "accept" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : null}
          Authorize Claude
        </button>
      </div>

      <p
        className="mt-3.5 text-center text-[10.5px] leading-snug"
        style={{ color: "#6b6b6b" }}
      >
        By authorizing, you allow Claude to access your MemContext data per the
        scopes above.
      </p>
    </ConsentCard>
  );
}

function ConsentCard({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full max-w-md animate-fade-in">
      {/* Border glow - top left */}
      <div
        className="absolute -top-px -left-px h-20 w-28 rounded-2xl blur-[1px]"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 60%)",
        }}
      />
      {/* Border glow - bottom right */}
      <div
        className="absolute -bottom-px -right-px h-16 w-20 rounded-2xl blur-[1px]"
        style={{
          background:
            "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 30%, transparent 60%)",
        }}
      />

      <div
        className="relative overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl"
        style={{
          backgroundColor: "rgba(17, 17, 17, 0.8)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Inner glow */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent" />

        <div className="relative px-5 py-5 sm:px-6 sm:py-6">
          {/* Brand lockup */}
          <div className="flex items-center justify-center gap-2.5">
            <BrandTile>
              <Image
                src="/sign.png"
                alt="MemContext"
                width={22}
                height={22}
                className="relative z-10 h-[22px] w-[22px]"
              />
            </BrandTile>

            <div
              className="flex h-6 w-6 items-center justify-center rounded-full"
              style={{
                backgroundColor: "#0f0f0f",
                border: "1px solid #1f1f1f",
              }}
              aria-hidden
            >
              <ArrowLeftRight
                className="h-2.5 w-2.5"
                style={{ color: "#6b6b6b" }}
              />
            </div>

            <BrandTile>
              <ClaudeMark className="relative z-10 h-[22px] w-[22px]" />
            </BrandTile>
          </div>

          <p
            className="mt-3 text-center text-[10px] uppercase tracking-[0.22em]"
            style={{ color: "#6b6b6b" }}
          >
            Permission requested
          </p>
          <h1
            className="mt-1 text-center text-lg font-semibold tracking-tight sm:text-xl"
            style={{ color: "#fafafa" }}
          >
            {title}
          </h1>

          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function BrandTile({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div
        className="absolute -top-[1px] -left-[1px] h-10 w-10 rounded-lg blur-[0.5px]"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.22) 30%, transparent 60%)",
        }}
      />
      <div
        className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-white/15 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(17, 17, 17, 0.9)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
        {children}
      </div>
    </div>
  );
}

function ConsentSkeleton() {
  return (
    <div className="relative w-full max-w-md animate-fade-in">
      <div
        className="relative overflow-hidden rounded-2xl border border-white/10 px-5 py-5 sm:px-6 sm:py-6 backdrop-blur-xl"
        style={{
          backgroundColor: "rgba(17, 17, 17, 0.8)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div className="flex items-center justify-center gap-2.5">
          <div
            className="h-10 w-10 animate-pulse rounded-lg"
            style={{ backgroundColor: "#171717" }}
          />
          <div
            className="h-6 w-6 animate-pulse rounded-full"
            style={{ backgroundColor: "#171717" }}
          />
          <div
            className="h-10 w-10 animate-pulse rounded-lg"
            style={{ backgroundColor: "#171717" }}
          />
        </div>
        <div
          className="mx-auto mt-4 h-5 w-44 animate-pulse rounded"
          style={{ backgroundColor: "#171717" }}
        />
        <div className="mt-4 space-y-2">
          <div
            className="h-12 w-full animate-pulse rounded-lg"
            style={{ backgroundColor: "#171717" }}
          />
          <div
            className="h-12 w-full animate-pulse rounded-lg"
            style={{ backgroundColor: "#171717" }}
          />
        </div>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          <div
            className="h-10 w-full animate-pulse rounded-lg"
            style={{ backgroundColor: "#171717" }}
          />
          <div
            className="h-10 w-full animate-pulse rounded-lg"
            style={{ backgroundColor: "#171717" }}
          />
        </div>
      </div>
    </div>
  );
}

function MissingParamsError({
  clientId,
  scope,
}: {
  clientId: string | null;
  scope: string | null;
}) {
  const missing: string[] = [];
  if (!clientId) missing.push("client_id");
  if (!scope) missing.push("scope");

  return (
    <div className="relative w-full max-w-lg animate-fade-in">
      <div
        className="relative overflow-hidden rounded-2xl border border-white/10 p-8 backdrop-blur-xl"
        style={{
          backgroundColor: "rgba(17, 17, 17, 0.8)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent" />
        <div className="relative">
          <div
            className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
            }}
          >
            <AlertTriangle
              className="h-5 w-5"
              style={{ color: "#ef4444" }}
            />
          </div>
          <h1
            className="text-center text-xl font-semibold tracking-tight"
            style={{ color: "#fafafa" }}
          >
            Invalid consent request
          </h1>
          <p
            className="mt-2 text-center text-sm leading-relaxed"
            style={{ color: "#a1a1a1" }}
          >
            This authorization link is missing required information and can&apos;t
            be completed. Please return to the application that sent you here
            and try again.
          </p>

          <div
            className="mt-6 rounded-xl px-4 py-3 font-mono text-xs"
            style={{
              backgroundColor: "rgba(255,255,255,0.02)",
              border: "1px solid #1f1f1f",
              color: "#a1a1a1",
            }}
          >
            <span style={{ color: "#6b6b6b" }}>Missing:&nbsp;</span>
            {missing.join(", ")}
          </div>

          <div className="mt-6 text-center">
            <a
              href="/dashboard"
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl px-5 text-sm font-medium transition-all duration-200"
              style={{ backgroundColor: "#fafafa", color: "#0a0a0a" }}
            >
              Go to dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  const leftDots = useMemo(() => generateDots(25, 42), []);
  const rightDots = useMemo(() => generateDots(25, 73), []);

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 pt-16 sm:p-6 sm:pt-20 lg:p-8 lg:pt-24"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      {/* Top-left dotted glow */}
      <div className="pointer-events-none absolute top-0 left-0 h-[300px] w-[300px] sm:h-[400px] sm:w-[400px]">
        <div className="relative h-full w-full">
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

      {/* Top-right dotted glow */}
      <div className="pointer-events-none absolute top-0 right-0 h-[300px] w-[300px] sm:h-[400px] sm:w-[400px]">
        <div className="relative h-full w-full">
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

      {children}
    </div>
  );
}

export default function OAuthConsentPage() {
  return (
    <PageShell>
      <Suspense fallback={<ConsentSkeleton />}>
        <ConsentInner />
      </Suspense>
    </PageShell>
  );
}
