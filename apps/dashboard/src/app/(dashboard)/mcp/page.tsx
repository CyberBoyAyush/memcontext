"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileCode2,
  KeyRound,
  Plug,
  Server,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { oauthClients } from "@/lib/mcp-config";
import { McpSetupBadge } from "@/components/mcp-setup-badge";

const OAUTH_BENEFITS = [
  "Sign in with your browser, no keys to copy.",
  "Stays connected with automatic token refresh.",
  "Pick the workspace on the consent screen, disconnect anytime.",
];

const API_KEY_USE_CASES = [
  { icon: Server, label: "Headless, CI, and servers" },
  { icon: FileCode2, label: "Scripts and automations" },
  { icon: Unplug, label: "Clients without OAuth support" },
];

const COMPARISON: { label: string; oauth: string; apiKey: string }[] = [
  {
    label: "How you sign in",
    oauth: "Browser sign-in and consent",
    apiKey: "Paste a key into config",
  },
  {
    label: "Credential",
    oauth: "Short-lived, auto-refreshed",
    apiKey: "Long-lived until revoked",
  },
  {
    label: "Workspace",
    oauth: "Chosen on the consent screen",
    apiKey: "Fixed when the key is created",
  },
  {
    label: "Best for",
    oauth: "Chat apps, IDEs, coding agents",
    apiKey: "CI, servers, scripts",
  },
];

const cardFocus =
  "outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

function OAuthCard() {
  return (
    <Link
      href="/mcp/oauth"
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-accent/30 bg-surface p-6 sm:p-7 shadow-sm",
        "transition-all duration-200 hover:border-accent/50 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_var(--accent-light)]",
        cardFocus,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-br from-accent/[0.07] via-transparent to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-24 -right-20 h-56 w-56 rounded-full bg-accent/10 blur-3xl opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/25 bg-accent/10">
          <ShieldCheck className="h-5 w-5 text-accent" />
        </div>
        <McpSetupBadge variant="recommended" />
      </div>

      <h2 className="relative mt-5 text-lg font-semibold tracking-tight text-foreground">
        Connect with OAuth
      </h2>
      <p className="relative mt-1 text-sm text-foreground-muted">
        Approve access from your AI client in a few clicks. No API key needed.
      </p>

      <ul
        className="relative mt-4 flex flex-wrap gap-1.5"
        aria-label="Supported clients"
      >
        {oauthClients.map((client) => (
          <li
            key={client.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated/70 py-1 pl-1.5 pr-2.5 text-[11px] font-medium text-foreground-muted"
          >
            <span className="flex h-4 w-4 items-center justify-center [&_svg]:h-3.5 [&_svg]:w-3.5">
              {client.icon}
            </span>
            {client.id === "claude" ? "Claude" : client.tabLabel}
          </li>
        ))}
      </ul>

      <ul className="relative mt-5 space-y-2">
        {OAUTH_BENEFITS.map((benefit) => (
          <li
            key={benefit}
            className="flex items-start gap-2.5 text-sm text-foreground"
          >
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/15">
              <Check className="h-2.5 w-2.5 text-accent" strokeWidth={3} />
            </span>
            {benefit}
          </li>
        ))}
      </ul>

      <div className="relative mt-auto pt-6">
        <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground shadow-sm transition-shadow duration-200 group-hover:shadow-[0_4px_20px_var(--accent-glow)]">
          Set up OAuth
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function ApiKeyCard() {
  return (
    <Link
      href="/mcp/api-key"
      className={cn(
        "group flex flex-col rounded-2xl border border-border bg-surface p-6 sm:p-7",
        "transition-all duration-200 hover:bg-surface-hover hover:border-border-hover",
        cardFocus,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background-secondary">
          <KeyRound className="h-5 w-5 text-foreground-muted" />
        </div>
        <McpSetupBadge variant="advanced" />
      </div>

      <h2 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
        Use an API key
      </h2>
      <p className="mt-1 text-sm text-foreground-muted">
        A static key in a config file or request header.
      </p>

      <ul className="mt-5 space-y-2.5">
        {API_KEY_USE_CASES.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-2.5 text-sm text-foreground-muted"
          >
            <Icon className="h-4 w-4 shrink-0 text-foreground-subtle" />
            {label}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground-muted transition-colors duration-200 group-hover:text-foreground">
          Set up with an API key
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function ComparisonStrip() {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 border-b border-border bg-surface-elevated/60 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-foreground-subtle">
        <span>OAuth vs API key</span>
        <span className="flex items-center gap-1.5 text-accent">
          <ShieldCheck className="h-3 w-3 shrink-0" />
          OAuth
        </span>
        <span className="flex items-center gap-1.5">
          <KeyRound className="h-3 w-3 shrink-0" />
          API key
        </span>
      </div>
      <dl className="divide-y divide-border">
        {COMPARISON.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 px-4 py-2.5 text-xs"
          >
            <dt className="text-foreground-subtle">{row.label}</dt>
            <dd className="text-foreground">{row.oauth}</dd>
            <dd className="text-foreground-muted">{row.apiKey}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function McpPage() {
  return (
    <div className="min-h-[calc(100vh-48px)] flex flex-col items-center justify-center py-4 animate-fade-in">
      <div className="w-full max-w-4xl">
        <div className="pb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated/60 px-2.5 py-1 text-[11px] font-medium text-foreground-muted">
            <Plug className="h-3 w-3 text-accent" />
            MCP setup
          </span>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">
            Connect MemContext to your AI
          </h1>
          <p className="text-sm text-foreground-muted max-w-xl mx-auto mt-2">
            Give Claude, ChatGPT, and your coding agents a shared, persistent
            memory. Most people should start with OAuth.
          </p>
        </div>

        <div className="grid items-stretch gap-4 lg:grid-cols-[1.35fr_1fr]">
          <OAuthCard />
          <ApiKeyCard />
        </div>

        <div className="mt-6">
          <ComparisonStrip />
        </div>
      </div>
    </div>
  );
}
