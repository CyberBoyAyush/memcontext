"use client";

import { useState, useRef, useEffect } from "react";
import {
  Check,
  Terminal,
  ExternalLink,
  Sparkles,
  Wand2,
  Info,
  AlertCircle,
} from "lucide-react";
import { Claude, Cursor, OpenAI } from "@lobehub/icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CodeBlock } from "@/components/ui/code-block";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

type AgentId = "claude-code" | "cursor" | "opencode" | "codex";

interface AgentConfig {
  id: AgentId;
  name: string;
  icon: React.ReactNode;
  configFile: string;
  preferencesFile: string;
  getConfig: (apiKey: string) => string;
  cliCommand?: (apiKey: string) => string;
  hasCursorDeepLink?: boolean;
  supportsAutoConfig?: boolean;
  getAutoConfigPrompt?: (apiKey: string) => string;
}

const MCP_SERVER_URL = "https://mcp.memcontext.in/mcp";

const USER_PREFERENCES = `# MemContext
At conversation start, search memory for user preferences and project context before responding.
When user says "remember" or shares preferences, save to memory.
After important decisions or completed work, save key context for future sessions.
Before assuming or asking repetitive questions, search memory first.
Memory persists across all sessions - use project param for project-specific context only.`;

function OpenCodeIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 240 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-6 h-6"
    >
      <rect
        x="60"
        y="120"
        width="120"
        height="120"
        className="fill-foreground-muted"
      />
      <path
        d="M180 60H60V240H180V60ZM240 300H0V0H240V300Z"
        className="fill-foreground"
      />
    </svg>
  );
}

function getClaudeAutoConfigPrompt(apiKey: string): string {
  const hasApiKey = apiKey && apiKey !== "YOUR_API_KEY";

  return `Configure MemContext MCP server for Claude Code. Do the following:

## Step 1: Add MCP Server Configuration

Run this CLI command to add the MCP server:
\`\`\`bash
claude mcp add memcontext --scope user --transport http ${MCP_SERVER_URL} --header "MEMCONTEXT-API-KEY:${hasApiKey ? apiKey : "<YOUR_API_KEY>"}"
\`\`\`
${!hasApiKey ? "\n⚠️ IMPORTANT: Replace <YOUR_API_KEY> with the actual API key from https://memcontext.com/api-keys\n" : ""}
## Step 2: Add User Preferences

Append the following to the file \`~/.claude/CLAUDE.md\` (create it if it doesn't exist):

\`\`\`markdown
${USER_PREFERENCES}
\`\`\`

After completing both steps, confirm the setup is complete.`;
}

function getOpenCodeAutoConfigPrompt(apiKey: string): string {
  const hasApiKey = apiKey && apiKey !== "YOUR_API_KEY";

  const configJson = JSON.stringify(
    {
      $schema: "https://opencode.ai/config.json",
      mcp: {
        memcontext: {
          type: "local",
          command: [
            "npx",
            "-y",
            "mcp-remote",
            MCP_SERVER_URL,
            "--header",
            `MEMCONTEXT-API-KEY:${hasApiKey ? apiKey : "<YOUR_API_KEY>"}`,
          ],
          enabled: true,
        },
      },
    },
    null,
    2,
  );

  return `Configure MemContext MCP server for OpenCode. Do the following:

## Step 1: Update OpenCode Configuration

Read the existing config file at \`~/.config/opencode/opencode.json\` (if it exists) and merge the following MCP configuration into it. If the file doesn't exist, create it with this content:

\`\`\`json
${configJson}
\`\`\`
${!hasApiKey ? "\n⚠️ IMPORTANT: Replace <YOUR_API_KEY> with the actual API key from https://memcontext.com/api-keys\n" : ""}
**Note:** If there's existing config, preserve other settings and only add/update the \`mcp.memcontext\` section.

## Step 2: Add User Preferences

Append the following to the file \`~/.config/opencode/AGENTS.md\` (create it if it doesn't exist, preserve existing content):

\`\`\`markdown
${USER_PREFERENCES}
\`\`\`

After completing both steps, confirm the setup is complete.`;
}

function getCodexAutoConfigPrompt(apiKey: string): string {
  const hasApiKey = apiKey && apiKey !== "YOUR_API_KEY";

  const configToml = `[mcp_servers.memcontext]
url = "${MCP_SERVER_URL}"

[mcp_servers.memcontext.http_headers]
MEMCONTEXT-API-KEY = "${hasApiKey ? apiKey : "<YOUR_API_KEY>"}"`;

  return `Configure MemContext MCP server for Codex CLI. Do the following:

## Step 1: Update Codex Configuration

Read the existing config file at \`~/.codex/config.toml\` (if it exists) and add the following MCP configuration to it. If the file doesn't exist, create it with this content:

\`\`\`toml
${configToml}
\`\`\`
${!hasApiKey ? "\n⚠️ IMPORTANT: Replace <YOUR_API_KEY> with the actual API key from https://memcontext.com/api-keys\n" : ""}
**Note:** If there's existing config, preserve other settings and only add the \`[mcp_servers.memcontext]\` section.

## Step 2: Add User Preferences

Append the following to the file \`~/.codex/instructions.md\` (create it if it doesn't exist, preserve existing content):

\`\`\`markdown
${USER_PREFERENCES}
\`\`\`

After completing both steps, confirm the setup is complete.`;
}

const agents: AgentConfig[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    icon: <Claude.Color className="w-6 h-6" />,
    configFile: "~/.claude.json",
    preferencesFile: "~/.claude/CLAUDE.md",
    getConfig: (apiKey: string) =>
      JSON.stringify(
        {
          mcpServers: {
            memcontext: {
              url: MCP_SERVER_URL,
              headers: {
                "MEMCONTEXT-API-KEY": apiKey,
              },
            },
          },
        },
        null,
        2,
      ),
    cliCommand: (apiKey: string) =>
      `claude mcp add memcontext --scope user --transport http ${MCP_SERVER_URL} --header "MEMCONTEXT-API-KEY:${apiKey}"`,
    supportsAutoConfig: true,
    getAutoConfigPrompt: getClaudeAutoConfigPrompt,
  },
  {
    id: "cursor",
    name: "Cursor",
    icon: <Cursor className="w-6 h-6" />,
    configFile: "~/.cursor/mcp.json",
    preferencesFile: "Cursor Settings > Rules",
    getConfig: (apiKey: string) =>
      JSON.stringify(
        {
          mcpServers: {
            memcontext: {
              url: MCP_SERVER_URL,
              headers: {
                "x-api-key": apiKey,
              },
            },
          },
        },
        null,
        2,
      ),
    hasCursorDeepLink: true,
    supportsAutoConfig: false,
  },
  {
    id: "opencode",
    name: "OpenCode",
    icon: <OpenCodeIcon />,
    configFile: "~/.config/opencode/opencode.json",
    preferencesFile: "~/.config/opencode/AGENTS.md",
    getConfig: (apiKey: string) =>
      JSON.stringify(
        {
          $schema: "https://opencode.ai/config.json",
          mcp: {
            memcontext: {
              type: "local",
              command: [
                "npx",
                "-y",
                "mcp-remote",
                MCP_SERVER_URL,
                "--header",
                `MEMCONTEXT-API-KEY:${apiKey}`,
              ],
              enabled: true,
            },
          },
        },
        null,
        2,
      ),
    supportsAutoConfig: true,
    getAutoConfigPrompt: getOpenCodeAutoConfigPrompt,
  },
  {
    id: "codex",
    name: "Codex CLI",
    icon: <OpenAI className="w-6 h-6" />,
    configFile: "~/.codex/config.toml",
    preferencesFile: "~/.codex/instructions.md",
    getConfig: (apiKey: string) =>
      `[mcp_servers.memcontext]
url = "${MCP_SERVER_URL}"

[mcp_servers.memcontext.http_headers]
MEMCONTEXT-API-KEY = "${apiKey}"`,
    supportsAutoConfig: true,
    getAutoConfigPrompt: getCodexAutoConfigPrompt,
  },
];

function ApiKeyInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Card className="border-border shadow-none">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="shrink-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Your API Key</p>
              <div className="relative group">
                <Info className="h-4 w-4 text-foreground-muted" />
                <div className="absolute left-0 top-full mt-2 px-3 py-2 bg-surface-elevated border border-border rounded-lg text-xs text-foreground-muted w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] shadow-lg">
                  Your API key is used to authenticate requests to MemContext
                  and generate personalized configurations.
                </div>
              </div>
            </div>
            <p className="text-xs text-foreground-muted mt-0.5">
              Paste your key to generate configs
            </p>
          </div>
          <div className="flex-1">
            <Input
              type="text"
              placeholder="mc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="font-mono text-sm w-full"
            />
          </div>
        </div>
        {!value && (
          <p className="mt-3 text-xs text-foreground-muted">
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
      className={cn(
        "gap-2 font-medium border shadow-sm hover:translate-y-0 hover:shadow-none",
        disabled
          ? "bg-surface-hover/50 text-foreground/50 border-border/50 cursor-not-allowed"
          : "bg-surface-hover hover:bg-border-hover text-foreground border-border cursor-pointer",
      )}
    >
      <Cursor className="w-4 h-4" />
      Add to Cursor
      <ExternalLink className="w-3.5 h-3.5 opacity-60" />
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
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 shrink-0">
            <Wand2 className="h-5 w-5 text-accent" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold">Auto-Configure with AI</h4>
            <p className="text-sm text-foreground-muted">
              Copy and paste this prompt in {agent.name} to automatically set up
              MemContext.
            </p>
          </div>
        </div>
        <Button
          onClick={handleCopyPrompt}
          className="gap-2 w-full sm:w-auto shrink-0 cursor-pointer hover:translate-y-0 hover:shadow-none"
          variant={copied ? "secondary" : "default"}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Copy Prompt
            </>
          )}
        </Button>
      </div>
      {!hasApiKey && (
        <p className="mt-3 pt-3 border-t border-border text-xs text-foreground-muted flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
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
  const tabsRef = useRef<Map<AgentId, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const activeTab = tabsRef.current.get(selectedAgent);
    if (activeTab) {
      const container = activeTab.parentElement;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const tabRect = activeTab.getBoundingClientRect();
        setIndicatorStyle({
          left: tabRect.left - containerRect.left,
          width: tabRect.width,
        });
      }
    }
  }, [selectedAgent]);

  return (
    <div className="flex justify-center">
      <div className="relative inline-flex gap-1 p-1.5 bg-background-secondary rounded-xl border border-border">
        <div
          className="absolute top-1.5 bottom-1.5 bg-accent rounded-lg transition-all duration-300 ease-out shadow-sm"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />
        {agents.map((agent) => (
          <button
            key={agent.id}
            ref={(el) => {
              if (el) tabsRef.current.set(agent.id, el);
            }}
            onClick={() => onSelect(agent.id)}
            className={cn(
              "relative z-10 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer",
              selectedAgent === agent.id
                ? "text-white [&_svg]:fill-white [&_svg]:text-white [&_svg_*]:fill-white"
                : "text-foreground-muted hover:text-foreground [&_svg]:fill-foreground-muted [&_svg]:text-foreground-muted [&_svg_*]:fill-foreground-muted hover:[&_svg]:fill-foreground hover:[&_svg]:text-foreground hover:[&_svg_*]:fill-foreground",
            )}
          >
            <span className="flex items-center justify-center w-5 h-5">
              {agent.icon}
            </span>
            <span className="hidden sm:inline">{agent.name}</span>
          </button>
        ))}
      </div>
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
    <div className="space-y-8 animate-fade-in overflow-hidden">
      {/* Auto-Config Button (for CLI tools) */}
      <AutoConfigButton agent={agent} apiKey={apiKey} />

      {/* Manual Configuration Section */}
      <div className="space-y-8">
        {agent.supportsAutoConfig && (
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-foreground-subtle px-2">
              or configure manually
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        )}

        {/* Step 1: MCP Configuration */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground text-sm font-bold shrink-0">
              1
            </div>
            <div className="w-px flex-1 border-l border-dashed border-border mt-3" />
          </div>
          <div className="flex-1 min-w-0 pb-2 space-y-4">
            <div>
              <h3 className="font-semibold">Add MCP Configuration</h3>
              <p className="text-sm text-foreground-muted mt-0.5">
                Add this to your{" "}
                <code className="px-1.5 py-0.5 rounded bg-surface-elevated font-mono text-xs">
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
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-foreground-muted">
                  <Terminal className="w-4 h-4" />
                  <span>Or use the CLI command:</span>
                </div>
                <CodeBlock code={agent.cliCommand(apiKey)} language="bash" />
              </div>
            )}

            {/* Add to Cursor Button */}
            {agent.hasCursorDeepLink && (
              <div className="flex items-center gap-4 pt-2">
                <CursorDeepLinkButton
                  apiKey={apiKey}
                  disabled={!apiKey || apiKey === "YOUR_API_KEY"}
                />
                <span className="text-sm text-foreground-subtle">
                  {!apiKey || apiKey === "YOUR_API_KEY"
                    ? "Enter your API key above to enable"
                    : "One-click install for Cursor"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: User Preferences */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground text-sm font-bold shrink-0">
              2
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-4">
            <div>
              <h3 className="font-semibold">Add User Preferences</h3>
              <p className="text-sm text-foreground-muted mt-0.5">
                Add this to{" "}
                <code className="px-1.5 py-0.5 rounded bg-surface-elevated font-mono text-xs">
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

            <p className="text-sm text-foreground-subtle">
              These instructions help your AI agent use MemContext more
              effectively by automatically searching and saving memories.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function McpPage() {
  const [selectedAgent, setSelectedAgent] = useState<AgentId>("claude-code");
  const [apiKey, setApiKey] = useState("");

  const currentAgent = agents.find((a) => a.id === selectedAgent)!;
  const displayApiKey = apiKey || "YOUR_API_KEY";

  return (
    <div className="min-h-[calc(100vh-48px)] flex flex-col animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="pb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">MCP Setup</h1>
            <p className="text-sm text-foreground-muted">
              Connect MemContext to your AI coding agent
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6 min-w-0 overflow-hidden">
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
          <CardContent className="p-6 overflow-hidden">
            <AgentConfigSection agent={currentAgent} apiKey={displayApiKey} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
