"use client";

import { useState } from "react";
import {
  Check,
  ClipboardList,
  Copy,
  ExternalLink,
  Info,
  Plug,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import {
  CLAUDE_INSTRUCTIONS,
  MCP_SERVER_URL,
  OAuthClientConfig,
  OAuthClientId,
  OAuthDeepLink,
  USER_PREFERENCES,
  getOAuthAutoConfigPrompt,
  oauthClients,
} from "@/lib/mcp-config";
import { McpSectionTabs } from "@/components/mcp-section-tabs";
import { McpSetupBadge } from "@/components/mcp-setup-badge";

function useCopy(successMessage: string, errorMessage: string, resetMs = 2000) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(successMessage);
      setTimeout(() => setCopied(false), resetMs);
    } catch {
      toast.error(errorMessage);
    }
  }

  return { copied, copy };
}

function ConnectorUrlField({ url }: { url: string }) {
  const { copied, copy } = useCopy("Server URL copied", "Failed to copy URL");

  return (
    <div className="flex items-stretch gap-2 rounded-lg border border-border bg-surface-elevated p-1 shadow-sm">
      <div className="flex items-center gap-2 flex-1 min-w-0 px-2.5">
        <Plug className="h-3.5 w-3.5 text-accent shrink-0" />
        <code className="font-mono text-xs text-foreground truncate">
          {url}
        </code>
      </div>
      <Button
        onClick={() => copy(url)}
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

function InstructionsBlock({ destination }: { destination: string }) {
  const { copied, copy } = useCopy(
    "Instructions copied",
    "Failed to copy instructions",
  );

  return (
    <div className="rounded-lg border border-border bg-surface-elevated/60 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border bg-surface">
        <div className="flex items-center gap-2 min-w-0">
          <ClipboardList className="h-3 w-3 text-accent shrink-0" />
          <span className="text-[11px] font-medium text-foreground-muted truncate">
            Paste into {destination}
          </span>
        </div>
        <Button
          onClick={() => copy(CLAUDE_INSTRUCTIONS)}
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

function DeepLinkButton({ deepLink }: { deepLink: OAuthDeepLink }) {
  const toast = useToast();

  function handleOpen() {
    window.location.href = deepLink.getHref();
    toast.success(`Opening ${deepLink.label.replace(/^Add to /, "")}...`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        onClick={handleOpen}
        size="sm"
        className="gap-1.5 h-8 px-3 text-xs font-medium border shadow-sm bg-surface-hover hover:bg-border-hover text-foreground border-border cursor-pointer hover:translate-y-0 hover:shadow-none [&_svg]:w-3.5 [&_svg]:h-3.5"
      >
        {deepLink.icon}
        {deepLink.label}
        <ExternalLink className="opacity-60" />
      </Button>
      <span className="text-xs text-foreground-subtle">
        One-click install, no API key
      </span>
    </div>
  );
}

function OAuthAutoConfigCard({ client }: { client: OAuthClientConfig }) {
  const { copied, copy } = useCopy(
    `Prompt copied! Paste it in ${client.name}`,
    "Failed to copy prompt",
    3000,
  );

  return (
    <div className="rounded-lg border border-border bg-surface p-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 shrink-0">
            <Wand2 className="h-4 w-4 text-accent" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-sm font-semibold">Auto-Configure with AI</h4>
            <p className="text-xs text-foreground-muted">
              Paste this prompt in {client.name}. It adds the server and
              preferences, then you finish sign-in.
            </p>
          </div>
        </div>
        <Button
          onClick={() => copy(getOAuthAutoConfigPrompt(client))}
          size="sm"
          className="gap-1.5 h-8 px-3 text-xs w-full sm:w-auto shrink-0 cursor-pointer hover:translate-y-0 hover:shadow-none"
          variant={copied ? "secondary" : "default"}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Copy Prompt
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface TimelineItem {
  title: string;
  description: React.ReactNode;
  content?: React.ReactNode;
}

function StepTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <li key={item.title} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-[11px] font-semibold shrink-0">
                {idx + 1}
              </div>
              {!isLast && (
                <div className="w-px flex-1 border-l border-dashed border-border mt-1.5" />
              )}
            </div>
            <div
              className={cn(
                "flex-1 min-w-0 space-y-3",
                isLast ? "pb-0" : "pb-5",
              )}
            >
              <div>
                <h3 className="text-sm font-semibold leading-tight">
                  {item.title}
                </h3>
                <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                  {item.description}
                </p>
              </div>
              {item.content}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function buildTimeline(client: OAuthClientConfig): TimelineItem[] {
  const items: TimelineItem[] = client.steps.map((step) => ({
    title: step.title,
    description: step.description,
    content:
      step.snippet || step.alternative || step.showDeepLink ? (
        <>
          {step.showDeepLink && client.deepLink && (
            <DeepLinkButton deepLink={client.deepLink} />
          )}
          {step.snippet && (
            <CodeBlock
              code={step.snippet.code}
              language={step.snippet.language}
              filename={step.snippet.filename}
            />
          )}
          {step.alternative && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                <Terminal className="w-3.5 h-3.5" />
                <span>{step.alternative.label}</span>
              </div>
              <CodeBlock
                code={step.alternative.snippet.code}
                language={step.alternative.snippet.language}
                filename={step.alternative.snippet.filename}
              />
            </div>
          )}
        </>
      ) : undefined,
  }));

  if (client.kind === "agent" && client.preferencesFile) {
    items.push({
      title: "Add agent instructions",
      description: (
        <>
          Add this to{" "}
          <code className="px-1.5 py-0.5 rounded bg-surface-elevated font-mono text-[11px] text-foreground">
            {client.preferencesFile}
          </code>{" "}
          so your agent searches and saves memories deliberately.
        </>
      ),
      content: (
        <CodeBlock
          code={USER_PREFERENCES}
          language="markdown"
          filename={client.preferencesFile}
        />
      ),
    });
  }

  return items;
}

function ClientPanel({ client }: { client: OAuthClientConfig }) {
  const isChat = client.kind === "chat";

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background-secondary shrink-0 [&_svg]:h-5 [&_svg]:w-5">
          {client.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold leading-tight">
              {client.name}
            </h2>
            <span className="rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-foreground-subtle">
              {isChat ? "Chat app" : "Coding agent"}
            </span>
          </div>
          <p className="text-xs text-foreground-muted mt-0.5">
            {client.summary}
          </p>
        </div>
      </div>

      {client.supportsAutoConfig && (
        <>
          <OAuthAutoConfigCard client={client} />
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-foreground-subtle px-2">
              or configure manually
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <StepTimeline items={buildTimeline(client)} />

      {client.note && (
        <div className="rounded-lg border border-warning/25 bg-warning-bg p-3 flex items-start gap-2.5">
          <Info className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
          <p className="text-xs text-foreground-muted leading-relaxed">
            {client.note}
          </p>
        </div>
      )}

      {isChat && client.instructionsDestination && (
        <div className="pt-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle px-2">
              Recommended instructions
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <p className="text-xs text-foreground-muted max-w-2xl leading-relaxed">
            Paste this into{" "}
            <span className="font-medium text-foreground">
              {client.instructionsDestination}
            </span>{" "}
            so {client.tabLabel} uses MemContext deliberately, not on every
            message.
          </p>

          <InstructionsBlock destination={client.instructionsDestination} />

          <p className="text-[11px] text-foreground-subtle leading-relaxed">
            {client.tabLabel} will call{" "}
            <code className="font-mono">search_memory</code>,{" "}
            <code className="font-mono">save_memory</code>, and{" "}
            <code className="font-mono">update_memory</code> on your behalf when
            it&apos;s actually useful.
          </p>
        </div>
      )}
    </div>
  );
}

export default function McpOAuthPage() {
  const [selectedId, setSelectedId] = useState<OAuthClientId>("claude");
  const client =
    oauthClients.find((c) => c.id === selectedId) ?? oauthClients[0];

  return (
    <div className="min-h-[calc(100vh-48px)] flex flex-col animate-fade-in overflow-hidden">
      <div className="pb-5 shrink-0">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 border border-accent/20 shrink-0">
            <ShieldCheck className="w-5 h-5 text-accent" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">
                Connect with OAuth
              </h1>
              <McpSetupBadge variant="recommended" />
            </div>
            <p className="text-sm text-foreground-muted mt-0.5">
              No API key needed. Your client opens a MemContext sign-in and
              consent screen, and stays connected.
            </p>
          </div>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden space-y-5">
        <Card className="shadow-none">
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
                Server URL
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground-muted">
                <ShieldCheck className="h-3 w-3 text-accent" />
                OAuth secured
              </span>
            </div>
            <ConnectorUrlField url={MCP_SERVER_URL} />
          </CardContent>
        </Card>

        <div className="overflow-x-auto">
          <AnimatedTabs<OAuthClientId>
            className="mx-auto flex w-max"
            ariaLabel="AI client"
            value={selectedId}
            onChange={setSelectedId}
            tabs={oauthClients.map((c) => ({
              value: c.id,
              label: (
                <span className="sr-only xl:not-sr-only">{c.tabLabel}</span>
              ),
              icon: c.icon,
            }))}
          />
        </div>

        <Card className="overflow-hidden shadow-none">
          <CardContent className="p-4 sm:p-6 space-y-6">
            <ClientPanel key={client.id} client={client} />

            <div className="rounded-lg border border-border bg-surface-elevated/60 p-3 flex items-start gap-2.5">
              <ShieldCheck className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
              <p className="text-xs text-foreground-muted leading-relaxed">
                The consent screen shows the client&apos;s name and the access
                it requests, and you pick the workspace it can use. Connections
                stay signed in. Disconnect anytime from the client, or reconnect
                to switch workspaces.
              </p>
            </div>
          </CardContent>
        </Card>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-foreground-subtle mb-2.5">
            Continue
          </p>
          <McpSectionTabs active="oauth" />
        </div>
      </div>
    </div>
  );
}
