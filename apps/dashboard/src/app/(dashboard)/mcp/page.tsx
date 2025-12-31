"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  Terminal,
  FileCode,
  AlertCircle,
  ExternalLink,
  Plug,
  KeyRound,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Claude, Cursor, OpenAI } from "@lobehub/icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

function CodeBlock({
  code,
  language,
  filename,
}: {
  code: string;
  language: string;
  filename?: string;
}) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-surface max-w-full">
      {filename && (
        <div className="px-4 py-2.5 border-b border-border bg-surface-elevated flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileCode className="w-4 h-4 text-foreground-subtle shrink-0" />
            <span className="text-sm font-mono text-foreground-muted truncate">
              {filename}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 text-xs gap-1.5 shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-success" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </Button>
        </div>
      )}
      <div className="relative">
        <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed max-w-full">
          <code
            className={`language-${language} break-all whitespace-pre-wrap`}
          >
            {code}
          </code>
        </pre>
        {!filename && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="absolute top-2 right-2 h-8 w-8 shrink-0"
          >
            {copied ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function ApiKeyInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-elevated">
              <KeyRound className="h-4 w-4 text-foreground-muted" />
            </div>
            <div>
              <p className="text-sm font-medium">Your API Key</p>
              <p className="text-xs text-foreground-muted">
                Paste your key to generate configs
              </p>
            </div>
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
          <p className="mt-3 text-xs text-foreground-subtle">
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
        "gap-2 font-medium border shadow-sm",
        disabled
          ? "bg-[#1a1a1a]/50 text-white/50 border-[#333]/50 cursor-not-allowed"
          : "bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white border-[#333]",
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
    <div className="relative rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 shrink-0">
          <Wand2 className="h-4.5 w-4.5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium flex items-center gap-2">
            Auto-Configure with AI
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-accent/20 text-accent">
              Quick Setup
            </span>
          </h4>
          <p className="text-sm text-foreground-muted mt-1">
            Copy this prompt and paste it in {agent.name} running in your home
            directory. It will automatically configure MemContext for you.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleCopyPrompt}
          className="gap-2"
          variant={copied ? "secondary" : "default"}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Copy Setup Prompt
            </>
          )}
        </Button>

        {!hasApiKey && (
          <span className="text-xs text-foreground-muted">
            <AlertCircle className="h-3.5 w-3.5 inline mr-1" />
            Enter API key above for complete configuration
          </span>
        )}
      </div>
    </div>
  );
}

function AgentTab({
  agent,
  isActive,
  onClick,
}: {
  agent: AgentConfig;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-accent/10 text-accent"
          : "text-foreground-muted hover:text-foreground hover:bg-surface-elevated/50",
      )}
    >
      <span className="flex items-center justify-center w-6 h-6">
        {agent.icon}
      </span>
      <span className="hidden sm:inline">{agent.name}</span>
    </button>
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
    <div className="space-y-8 animate-fade-in">
      {/* Auto-Config Button (for CLI tools) */}
      <AutoConfigButton agent={agent} apiKey={apiKey} />

      {/* Manual Configuration Section */}
      <div className="space-y-6">
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
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground text-sm font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold">Add MCP Configuration</h3>
              <p className="text-sm text-foreground-muted">
                Add this to your{" "}
                <code className="px-1.5 py-0.5 rounded bg-surface-elevated font-mono text-xs">
                  {agent.configFile}
                </code>
              </p>
            </div>
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

        {/* Step 2: User Preferences */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground text-sm font-bold">
              2
            </div>
            <div>
              <h3 className="font-semibold">
                Add User Preferences (Recommended)
              </h3>
              <p className="text-sm text-foreground-muted">
                Add this to{" "}
                <code className="px-1.5 py-0.5 rounded bg-surface-elevated font-mono text-xs">
                  {agent.preferencesFile}
                </code>{" "}
                for best results
              </p>
            </div>
          </div>

          <CodeBlock
            code={USER_PREFERENCES}
            language="markdown"
            filename={agent.preferencesFile}
          />

          <p className="text-sm text-foreground-subtle pl-11">
            These instructions help your AI agent use MemContext more
            effectively by automatically searching and saving memories.
          </p>
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
    <div className="min-h-[calc(100vh-48px)] flex flex-col animate-fade-in pb-8 overflow-hidden">
      {/* Header */}
      <div className="pb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-elevated shrink-0">
            <Plug className="h-5 w-5 text-foreground-muted" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">MCP Setup</h1>
            <p className="text-sm text-foreground-muted">
              Connect MemContext to your AI coding agent
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6 min-w-0">
        {/* API Key Input */}
        <ApiKeyInput value={apiKey} onChange={setApiKey} />

        {/* Agent Tabs */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-surface rounded-xl border border-border">
          {agents.map((agent) => (
            <AgentTab
              key={agent.id}
              agent={agent}
              isActive={selectedAgent === agent.id}
              onClick={() => setSelectedAgent(agent.id)}
            />
          ))}
        </div>

        {/* Agent Configuration */}
        <Card className="overflow-hidden">
          <CardContent className="p-6 overflow-hidden">
            <AgentConfigSection agent={currentAgent} apiKey={displayApiKey} />
          </CardContent>
        </Card>

        {/* Info Section */}
        {!apiKey && (
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 shrink-0">
                  <AlertCircle className="h-4 w-4 text-accent" />
                </div>
                <div className="text-sm space-y-1">
                  <p className="font-medium">Paste your API key above</p>
                  <p className="text-foreground-muted">
                    Enter your full API key in the input above to generate
                    ready-to-use configurations. Don&apos;t have a key yet?{" "}
                    <Link
                      href="/api-keys"
                      className="text-accent hover:underline"
                    >
                      Create one here
                    </Link>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
