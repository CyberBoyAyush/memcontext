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
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { authClient, useSession } from "@/lib/auth-client";
import {
  describeRedirectTarget,
  getClientBrand,
  type ClientBrand,
} from "@/components/oauth/client-brand";

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
    description: "Save, search, update, and delete memories on your behalf.",
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
    title: "Stay connected",
    description:
      "Keeps this connection signed in so you won't have to re-authorize; revoke anytime.",
    icon: RefreshCw,
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

interface ApiErrorResponse {
  error?: string;
  message?: string;
}

interface PublicClientInfo {
  client_name?: string;
  client_uri?: string;
  logo_uri?: string;
}

function consentErrorMessage(error: {
  message?: string;
  statusText: string;
  error_description?: unknown;
}): string {
  if (typeof error.error_description === "string" && error.error_description) {
    return error.error_description;
  }
  return error.message || error.statusText || "Consent failed.";
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
  const redirectUri = searchParams.get("redirect_uri");
  const signature = searchParams.get("sig");

  const scopes = useMemo(() => {
    if (!scope) return [] as string[];
    return scope
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [scope]);

  const [clientInfo, setClientInfo] = useState<PublicClientInfo | null>(null);
  const [clientLoading, setClientLoading] = useState(true);
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
        async (res) =>
          res.ok ? ((await res.json()) as WorkspacesResponse) : {},
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
        setWorkspaceId(mcpWorkspace.workspaceId ?? nextWorkspaces[0]?.id ?? "");
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

  useEffect(() => {
    if (!session.data || !clientId) return;
    let cancelled = false;

    authClient.oauth2
      .publicClient({ query: { client_id: clientId } })
      .then(({ data }) => {
        if (!cancelled && data) setClientInfo(data);
      })
      .catch(() => {
        // Fall back to brand detection from client_id / redirect_uri.
      })
      .finally(() => {
        if (!cancelled) setClientLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session.data, clientId]);

  const brand = useMemo<ClientBrand>(
    () =>
      getClientBrand({
        clientId,
        clientName: clientInfo?.client_name,
        clientUri: clientInfo?.client_uri,
        redirectUri,
        logoUri: clientInfo?.logo_uri,
      }),
    [clientId, clientInfo, redirectUri],
  );
  const redirectTarget = useMemo(
    () => describeRedirectTarget(redirectUri),
    [redirectUri],
  );

  const missing: string[] = [];
  if (!clientId) missing.push("client_id");
  if (!signature) missing.push("sig");
  const missingRequired = missing.length > 0;

  const submit = useCallback(
    async (accept: boolean) => {
      if (missingRequired) return;
      if (accept && !workspaceId) {
        setError(`Select a workspace before authorizing ${brand.name}.`);
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
            const data: ApiErrorResponse = await workspaceRes
              .json()
              .catch(() => ({}));
            setError(
              data.message || data.error || "Failed to select workspace.",
            );
            setSubmitting(null);
            return;
          }
        }

        // The oauthProviderClient plugin attaches the signed query as oauth_query.
        const { data, error: consentError } = await authClient.oauth2.consent({
          accept,
        });

        if (consentError) {
          setError(consentErrorMessage(consentError));
          setSubmitting(null);
          return;
        }

        if (data?.url) {
          window.location.href = data.url;
          return;
        }

        // No redirect returned; surface a friendly message rather than spinning.
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
    [brand.name, missingRequired, workspaceId],
  );

  // Session loading state.
  if (session.isPending) {
    return <ConsentSkeleton />;
  }

  // Authenticated user without required params → graceful error.
  if (missingRequired) {
    return <MissingParamsError missing={missing} />;
  }

  // Session is briefly null during the login redirect, and client info is
  // resolved before render so the name/logo never flicker.
  if (!session.data || clientLoading) {
    return <ConsentSkeleton />;
  }

  const userEmail = session.data.user.email;
  const userName = session.data.user.name;
  const isBusy = submitting !== null;
  const selectedWorkspace = workspaces.find(
    (workspace) => workspace.id === workspaceId,
  );
  const canAuthorize = !isBusy && !workspacesLoading && Boolean(workspaceId);

  return (
    <ConsentCard
      brand={brand}
      title={
        <>
          <span style={{ color: "#fafafa" }}>MemContext</span>
          <span className="mx-1.5" style={{ color: "#6b6b6b" }}>
            ×
          </span>
          <span style={{ color: "#fafafa" }}>{brand.name}</span>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed" style={{ color: "#a1a1a1" }}>
        <span style={{ color: "#fafafa" }}>{brand.name}</span> is requesting
        access to your MemContext memories so it can recall context across
        conversations.
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
                {brand.name} will save and search memories in this workspace.
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
          This will allow {brand.name} to
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
          className="inline-flex h-10 w-full min-w-0 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[var(--client-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111] disabled:pointer-events-none disabled:opacity-50"
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
          <span className="truncate">Authorize {brand.name}</span>
        </button>
      </div>

      {redirectTarget && (
        <p
          className="mt-3 flex items-center justify-center gap-1.5 text-[10.5px] leading-snug"
          style={{ color: "#6b6b6b" }}
        >
          <ShieldCheck className="h-3 w-3 flex-shrink-0" aria-hidden />
          <span>
            Redirects to{" "}
            <span className="font-mono" style={{ color: "#a1a1a1" }}>
              {redirectTarget}
            </span>
          </span>
        </p>
      )}

      <p
        className="mt-1.5 text-center text-[10.5px] leading-snug"
        style={{ color: "#6b6b6b" }}
      >
        By authorizing, you allow {brand.name} to access your MemContext data
        per the scopes above.
      </p>
    </ConsentCard>
  );
}

function ConsentCard({
  brand,
  title,
  children,
}: {
  brand: ClientBrand;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative w-full max-w-md animate-fade-in"
      style={{ "--client-accent": brand.accent } as React.CSSProperties}
    >
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
        {/* Client accent hairline */}
        <div
          className="pointer-events-none absolute inset-x-10 top-0 h-px"
          style={{
            background: `linear-gradient(to right, transparent, ${brand.accent}99, transparent)`,
          }}
          aria-hidden
        />

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

            <BrandTile accent={brand.accent} label={brand.name}>
              {brand.logo}
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

function BrandTile({
  accent,
  label,
  children,
}: {
  accent?: string;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative"
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {accent && (
        <div
          className="pointer-events-none absolute -inset-2 rounded-xl blur-md"
          style={{
            background: `radial-gradient(circle, ${accent}2e 0%, transparent 70%)`,
          }}
          aria-hidden
        />
      )}
      <div
        className="absolute -top-[1px] -left-[1px] h-10 w-10 rounded-lg blur-[0.5px]"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.22) 30%, transparent 60%)",
        }}
      />
      <div
        className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-white/15 backdrop-blur-sm"
        style={{
          backgroundColor: "rgba(17, 17, 17, 0.9)",
          boxShadow: accent ? `inset 0 0 0 1px ${accent}26` : undefined,
        }}
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

function MissingParamsError({ missing }: { missing: string[] }) {
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
