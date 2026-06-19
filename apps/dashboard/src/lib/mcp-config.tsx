import { Claude, Cursor, OpenAI } from "@lobehub/icons";

export const MCP_SERVER_URL = "https://mcp.memcontext.in/mcp";

export type AgentId = "claude-code" | "cursor" | "opencode" | "codex";

export interface AgentConfig {
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

export const USER_PREFERENCES = `# MemContext
At conversation start, ALWAYS call search_memory to load user context; do not skip.
Before making decisions or assumptions, search_memory to check for past context.
SAVE immediately (do not defer) when any of these happen:
- User shares a preference → save_memory(category: "preference")
- A technology or architecture decision is made → save_memory(category: "decision")
- User corrects you or says "remember" → save_memory(category: "fact")
- Important project fact learned → save_memory(category: "fact", project: "<known-project-name>")
- Significant work completed → save_memory(category: "context")
- Long notes may be accepted for background extraction into multiple atomic memories while shorter notes are saved immediately.
- MCP tools do not accept scope. Use the REST API or TypeScript SDK when an app needs hard per-user or per-tenant isolation.
- Use project only when a clear project/app name is already known. Good: "memcontext", "carq". Omit if unsure. Never invent vague names like "123" or "abc".
- MCP memories use automatic TTL. Use the REST API, TypeScript SDK, or dashboard when exact expiry is required.
After using search results, call memory_feedback to rate memories as helpful/not_helpful/outdated/wrong.
If a retrieved memory is wrong or outdated and you know the corrected fact, call update_memory with the corrected content. Feedback alone only changes retrieval ranking; update_memory changes the saved memory.
Use delete_memory only when a memory was saved incorrectly and should be removed entirely.
Duplicates are handled automatically; when in doubt, save.
Memory persists across all sessions - use project param for project-specific context only.`;

export const CLAUDE_INSTRUCTIONS = `Search MemContext before assuming my preferences, projects, or past decisions.
Save only stable preferences, recurring facts, and useful project context.
Do not save one-off questions, random searches, or temporary details unless I ask you to remember them.
Keep memory updates brief, accurate, and practical.`;

export function OpenCodeIcon() {
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

export const agents: AgentConfig[] = [
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
    preferencesFile: "Cursor Settings > Rules and commands > User Rules",
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
