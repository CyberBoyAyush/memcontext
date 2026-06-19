"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  ExternalLink,
  Info,
  Sparkles,
  Terminal,
  Wand2,
} from "lucide-react";
import { Cursor } from "@lobehub/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CodeBlock } from "@/components/ui/code-block";
import { Tooltip } from "@/components/ui/tooltip";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import {
  AgentConfig,
  AgentId,
  MCP_SERVER_URL,
  USER_PREFERENCES,
  agents,
} from "@/lib/mcp-config";
import { McpSectionTabs } from "@/components/mcp-section-tabs";

function ApiKeyInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Card className="border-border shadow-none">
      <CardContent className="p-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="shrink-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium">Your API Key</p>
              <Tooltip
                content="Used to authenticate requests to MemContext and generate personalized configurations."
                className="max-w-[220px] whitespace-normal text-left leading-relaxed"
              >
                <Info className="h-3.5 w-3.5 text-foreground-muted cursor-pointer" />
              </Tooltip>
            </div>
            <p className="text-[11px] text-foreground-muted mt-0.5">
              Paste your key to generate configs
            </p>
          </div>
          <div className="flex-1">
            <Input
              type="text"
              placeholder="mc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="font-mono text-xs h-8 w-full"
            />
          </div>
        </div>
        {!value && (
          <p className="mt-2.5 text-[11px] text-foreground-muted">
            Don&apos;t have an API key?{" "}
            <Link href="/api-keys" className="text-accent hover:underline">
              Create one here
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CursorDeepLinkButton({
  apiKey,
  disabled,
}: {
  apiKey: string;
  disabled?: boolean;
}) {
  const toast = useToast();

  function handleAddToCursor() {
    if (disabled) return;

    const serverConfig = {
      url: MCP_SERVER_URL,
      headers: {
        "x-api-key": apiKey,
      },
    };

    const base64Config = btoa(JSON.stringify(serverConfig));
    const deepLink = `cursor://anysphere.cursor-deeplink/mcp/install?name=memcontext&config=${base64Config}`;

    window.location.href = deepLink;
    toast.success("Opening Cursor...");
  }

  return (
    <Button
      onClick={handleAddToCursor}
      disabled={disabled}
      size="sm"
      className={cn(
        "gap-1.5 h-8 px-3 text-xs font-medium border shadow-sm hover:translate-y-0 hover:shadow-none",
        disabled
          ? "bg-surface-hover/50 text-foreground/50 border-border/50 cursor-not-allowed"
          : "bg-surface-hover hover:bg-border-hover text-foreground border-border cursor-pointer",
      )}
    >
      <Cursor className="w-3.5 h-3.5" />
      Add to Cursor
      <ExternalLink className="w-3 h-3 opacity-60" />
    </Button>
  );
}

function AutoConfigButton({
  agent,
  apiKey,
}: {
  agent: AgentConfig;
  apiKey: string;
}) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  if (!agent.supportsAutoConfig || !agent.getAutoConfigPrompt) {
    return null;
  }

  const hasApiKey = apiKey && apiKey !== "YOUR_API_KEY";

  async function handleCopyPrompt() {
    if (!agent.getAutoConfigPrompt) return;

    try {
      const prompt = agent.getAutoConfigPrompt(apiKey);
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success("Prompt copied! Paste it in your " + agent.name);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Failed to copy prompt");
    }
  }

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
              Copy and paste this prompt in {agent.name} to set up MemContext.
            </p>
          </div>
        </div>
        <Button
          onClick={handleCopyPrompt}
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
      {!hasApiKey && (
        <p className="mt-2.5 pt-2.5 border-t border-border text-[11px] text-foreground-muted flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3 shrink-0" />
          Enter your API key above for a complete configuration
        </p>
      )}
    </div>
  );
}

function AgentTabs({
  agents,
  selectedAgent,
  onSelect,
}: {
  agents: AgentConfig[];
  selectedAgent: AgentId;
  onSelect: (id: AgentId) => void;
}) {
  return (
    <div className="flex justify-center">
      <AnimatedTabs<AgentId>
        ariaLabel="Coding agent"
        value={selectedAgent}
        onChange={onSelect}
        tabs={agents.map((agent) => ({
          value: agent.id,
          label: <span className="hidden sm:inline">{agent.name}</span>,
          icon: agent.icon,
        }))}
      />
    </div>
  );
}

function AgentConfigSection({
  agent,
  apiKey,
}: {
  agent: AgentConfig;
  apiKey: string;
}) {
  return (
    <div className="space-y-5 animate-fade-in overflow-hidden">
      {/* Auto-Config Button (for CLI tools) */}
      <AutoConfigButton agent={agent} apiKey={apiKey} />

      {/* Manual Configuration Section */}
      <div className="space-y-5">
        {agent.supportsAutoConfig && (
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-foreground-subtle px-2">
              or configure manually
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        )}

        {/* Step 1: MCP Configuration */}
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-[11px] font-semibold shrink-0">
              1
            </div>
            <div className="w-px flex-1 border-l border-dashed border-border mt-2" />
          </div>
          <div className="flex-1 min-w-0 pb-1 space-y-3">
            <div>
              <h3 className="text-sm font-semibold leading-tight">
                Add MCP Configuration
              </h3>
              <p className="text-xs text-foreground-muted mt-0.5">
                Add this to your{" "}
                <code className="px-1.5 py-0.5 rounded bg-surface-elevated font-mono text-[11px]">
                  {agent.configFile}
                </code>
              </p>
            </div>

            <CodeBlock
              code={agent.getConfig(apiKey)}
              language={agent.id === "codex" ? "toml" : "json"}
              filename={agent.configFile}
            />

            {/* CLI Command for Claude Code */}
            {agent.cliCommand && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Or use the CLI command:</span>
                </div>
                <CodeBlock code={agent.cliCommand(apiKey)} language="bash" />
              </div>
            )}

            {/* Add to Cursor Button */}
            {agent.hasCursorDeepLink && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <CursorDeepLinkButton
                  apiKey={apiKey}
                  disabled={!apiKey || apiKey === "YOUR_API_KEY"}
                />
                <span className="text-xs text-foreground-subtle">
                  {!apiKey || apiKey === "YOUR_API_KEY"
                    ? "Enter your API key above to enable"
                    : "One-click install for Cursor"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: User Preferences */}
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-[11px] font-semibold shrink-0">
              2
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <h3 className="text-sm font-semibold leading-tight">
                Add User Preferences
              </h3>
              <p className="text-xs text-foreground-muted mt-0.5">
                Add this to{" "}
                <code className="px-1.5 py-0.5 rounded bg-surface-elevated font-mono text-[11px]">
                  {agent.preferencesFile}
                </code>{" "}
                for best results
              </p>
            </div>

            <CodeBlock
              code={USER_PREFERENCES}
              language="markdown"
              filename={agent.preferencesFile}
            />

            <p className="text-xs text-foreground-subtle leading-relaxed">
              These instructions help your AI agent use MemContext more
              effectively by automatically searching and saving memories.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function McpCliPage() {
  const [selectedAgent, setSelectedAgent] = useState<AgentId>("claude-code");
  const [apiKey, setApiKey] = useState("");

  const currentAgent = agents.find((a) => a.id === selectedAgent)!;
  const displayApiKey = apiKey || "YOUR_API_KEY";

  return (
    <div className="min-h-[calc(100vh-48px)] flex flex-col animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="pb-5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background-secondary border border-border shrink-0">
            <Terminal className="w-6 h-6 text-foreground-muted" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">
              CLI & editor integrations
            </h1>
            <p className="text-sm text-foreground-muted mt-0.5">
              Wire MemContext into Claude Code, Cursor, OpenCode, or Codex CLI
              using an API key and a small config file.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-5 min-w-0 overflow-hidden">
        {/* API Key Input */}
        <ApiKeyInput value={apiKey} onChange={setApiKey} />

        {/* Agent Tabs */}
        <AgentTabs
          agents={agents}
          selectedAgent={selectedAgent}
          onSelect={setSelectedAgent}
        />

        {/* Agent Configuration */}
        <Card className="overflow-hidden shadow-none">
          <CardContent className="p-4 sm:p-5 overflow-hidden">
            <AgentConfigSection
              agent={currentAgent}
              apiKey={displayApiKey}
            />
          </CardContent>
        </Card>

        {/* Continue exploring */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-foreground-subtle mb-2.5">
            Continue
          </p>
          <McpSectionTabs active="cli" />
        </div>
      </div>
    </div>
  );
}
