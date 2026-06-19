"use client";

import { useState } from "react";
import {
  Check,
  ClipboardList,
  Copy,
  Info,
  Plug,
  ShieldCheck,
} from "lucide-react";
import { Claude } from "@lobehub/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import { CLAUDE_INSTRUCTIONS, MCP_SERVER_URL } from "@/lib/mcp-config";
import { McpSectionTabs } from "@/components/mcp-section-tabs";

function ConnectorUrlField({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Connector URL copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy URL");
    }
  }

  return (
    <div className="flex items-stretch gap-2 rounded-lg border border-border bg-surface-elevated p-1 shadow-sm">
      <div className="flex items-center gap-2 flex-1 min-w-0 px-2.5">
        <Plug className="h-3.5 w-3.5 text-accent shrink-0" />
        <code className="font-mono text-xs text-foreground truncate">
          {url}
        </code>
      </div>
      <Button
        onClick={handleCopy}
        variant={copied ? "secondary" : "default"}
        size="sm"
        className="gap-1.5 shrink-0 h-7 px-2.5 text-xs cursor-pointer hover:translate-y-0 hover:shadow-none"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copy URL
          </>
        )}
      </Button>
    </div>
  );
}

const CONNECTOR_STEPS: {
  title: string;
  description: React.ReactNode;
}[] = [
  {
    title: "Open Connectors",
    description: (
      <>
        In Claude.ai or Claude Desktop, head to{" "}
        <span className="font-medium text-foreground">
          Settings → Connectors
        </span>
        .
      </>
    ),
  },
  {
    title: "Add custom connector",
    description: (
      <>
        Choose{" "}
        <span className="font-medium text-foreground">
          Add custom connector
        </span>{" "}
        at the bottom of the connectors list.
      </>
    ),
  },
  {
    title: "Paste the MemContext URL",
    description: (
      <>
        Enter{" "}
        <code className="px-1.5 py-0.5 rounded bg-surface-elevated font-mono text-xs">
          {MCP_SERVER_URL}
        </code>{" "}
        as the remote MCP server URL.
      </>
    ),
  },
  {
    title: "Connect and approve access",
    description: (
      <>
        Click <span className="font-medium text-foreground">Connect</span>,
        sign in to MemContext, and approve the requested scopes on the consent
        screen.
      </>
    ),
  },
];

function ClaudeInstructionsBlock() {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(CLAUDE_INSTRUCTIONS);
      setCopied(true);
      toast.success("Instructions copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy instructions");
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface-elevated/60 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border bg-surface">
        <div className="flex items-center gap-2 min-w-0">
          <ClipboardList className="h-3 w-3 text-accent shrink-0" />
          <span className="text-[11px] font-medium text-foreground-muted truncate">
            Paste into Claude → Settings → Profile → Instructions for Claude
          </span>
        </div>
        <Button
          onClick={handleCopy}
          variant={copied ? "secondary" : "default"}
          size="sm"
          className="gap-1.5 shrink-0 h-6 px-2 text-[11px] cursor-pointer hover:translate-y-0 hover:shadow-none"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </Button>
      </div>
      <ul className="p-3 sm:p-4 space-y-1.5 text-xs text-foreground leading-relaxed">
        {CLAUDE_INSTRUCTIONS.split("\n").map((line, i) => (
          <li key={i} className="flex gap-2">
            <span
              className="mt-1.5 h-1 w-1 rounded-full bg-accent shrink-0"
              aria-hidden
            />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ClaudeConnectorSection() {
  return (
    <Card className="overflow-hidden shadow-none">
      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* Connector URL */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
              Connector URL
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground-muted">
              <ShieldCheck className="h-3 w-3 text-accent" />
              OAuth secured
            </span>
          </div>
          <ConnectorUrlField url={MCP_SERVER_URL} />
        </div>

        {/* Steps */}
        <div className="space-y-0">
          {CONNECTOR_STEPS.map((step, idx) => {
            const isLast = idx === CONNECTOR_STEPS.length - 1;
            return (
              <div key={step.title} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-[11px] font-semibold shrink-0">
                    {idx + 1}
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 border-l border-dashed border-border mt-1.5" />
                  )}
                </div>
                <div className={cn("flex-1 min-w-0", isLast ? "pb-0" : "pb-4")}>
                  <h3 className="text-sm font-semibold leading-tight">
                    {step.title}
                  </h3>
                  <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Consent note */}
        <div className="rounded-lg border border-border bg-surface-elevated/60 p-3 flex items-start gap-2.5">
          <Info className="h-3.5 w-3.5 text-foreground-muted mt-0.5 shrink-0" />
          <p className="text-xs text-foreground-muted leading-relaxed">
            The consent screen shows exactly which scopes Claude is requesting.
            You can decline at any time during sign-in, and you can disconnect
            the connector directly from Claude.ai or Claude Desktop.
          </p>
        </div>

        {/* Recommended Instructions subsection */}
        <div className="pt-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle px-2">
              Recommended instructions
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <p className="text-xs text-foreground-muted max-w-2xl leading-relaxed">
            Paste this short instruction into Claude&apos;s{" "}
            <span className="font-medium text-foreground">
              Instructions for Claude
            </span>{" "}
            box so it uses MemContext deliberately, not on every random
            message.
          </p>

          <ClaudeInstructionsBlock />

          <p className="text-[11px] text-foreground-subtle leading-relaxed">
            Claude will call <code className="font-mono">search_memory</code>,{" "}
            <code className="font-mono">save_memory</code>, and{" "}
            <code className="font-mono">update_memory</code> on your behalf
            when it&apos;s actually useful.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function McpClaudePage() {
  return (
    <div className="min-h-[calc(100vh-48px)] flex flex-col animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="pb-5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 border border-accent/20 shrink-0">
            <Claude.Color className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">
              Claude.ai & Claude Desktop
            </h1>
            <p className="text-sm text-foreground-muted mt-0.5">
              The quickest way to get started. Add MemContext as a custom
              connector and let Claude remember across conversations.
            </p>
          </div>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden space-y-6">
        <ClaudeConnectorSection />

        {/* Continue exploring */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-foreground-subtle mb-2.5">
            Continue
          </p>
          <McpSectionTabs active="claude" />
        </div>
      </div>
    </div>
  );
}
