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

// OAuth clients (recommended path, no API key)

export function VSCodeIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className="w-6 h-6"
      aria-hidden
    >
      <path
        fill="#007ACC"
        d="M23.15 2.587 18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"
      />
    </svg>
  );
}

export type OAuthClientId =
  | "claude"
  | "chatgpt"
  | "claude-code"
  | "codex"
  | "cursor"
  | "vscode"
  | "opencode";

export type OAuthClientKind = "chat" | "agent";

export interface OAuthSnippet {
  code: string;
  language: "bash" | "json" | "toml";
  filename?: string;
}

export interface OAuthStep {
  title: string;
  description: React.ReactNode;
  snippet?: OAuthSnippet;
  alternative?: { label: string; snippet: OAuthSnippet };
  showDeepLink?: boolean;
}

export interface OAuthDeepLink {
  label: string;
  icon: React.ReactNode;
  getHref: () => string;
}

export interface OAuthClientConfig {
  id: OAuthClientId;
  name: string;
  tabLabel: string;
  icon: React.ReactNode;
  kind: OAuthClientKind;
  summary: string;
  steps: OAuthStep[];
  note?: React.ReactNode;
  configFile?: string;
  configSnippet?: OAuthSnippet;
  cliCommand?: string;
  loginHint?: string;
  preferencesFile?: string;
  instructionsDestination?: string;
  deepLink?: OAuthDeepLink;
  supportsAutoConfig?: boolean;
}

function Em({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-foreground">{children}</span>;
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-surface-elevated font-mono text-[11px] text-foreground break-words">
      {children}
    </code>
  );
}

const CLAUDE_CODE_OAUTH_CLI = `claude mcp add --transport http --scope user memcontext ${MCP_SERVER_URL}`;
const CODEX_OAUTH_CLI = `codex mcp add memcontext --url ${MCP_SERVER_URL}`;
const OPENCODE_OAUTH_CLI = `opencode mcp add memcontext --global --url ${MCP_SERVER_URL}`;
const VSCODE_SERVER_ENTRY = {
  name: "memcontext",
  type: "http",
  url: MCP_SERVER_URL,
};
const VSCODE_OAUTH_CLI = `code --add-mcp '${JSON.stringify(VSCODE_SERVER_ENTRY)}'`;

const CODEX_OAUTH_SNIPPET: OAuthSnippet = {
  code: `[mcp_servers.memcontext]\nurl = "${MCP_SERVER_URL}"`,
  language: "toml",
  filename: "~/.codex/config.toml",
};

const CURSOR_OAUTH_SNIPPET: OAuthSnippet = {
  code: JSON.stringify(
    { mcpServers: { memcontext: { url: MCP_SERVER_URL } } },
    null,
    2,
  ),
  language: "json",
  filename: "~/.cursor/mcp.json",
};

const VSCODE_OAUTH_SNIPPET: OAuthSnippet = {
  code: JSON.stringify(
    { servers: { memcontext: { type: "http", url: MCP_SERVER_URL } } },
    null,
    2,
  ),
  language: "json",
  filename: ".vscode/mcp.json",
};

const OPENCODE_OAUTH_SNIPPET: OAuthSnippet = {
  code: JSON.stringify(
    {
      $schema: "https://opencode.ai/config.json",
      mcp: { memcontext: { type: "remote", url: MCP_SERVER_URL } },
    },
    null,
    2,
  ),
  language: "json",
  filename: "~/.config/opencode/opencode.json",
};

export const oauthClients: OAuthClientConfig[] = [
  {
    id: "claude",
    name: "Claude.ai & Claude Desktop",
    tabLabel: "Claude",
    icon: <Claude.Color className="w-6 h-6" />,
    kind: "chat",
    summary: "Add MemContext as a custom connector.",
    instructionsDestination: "Settings → Profile → Instructions for Claude",
    deepLink: {
      label: "Add to Claude",
      icon: <Claude.Color className="w-3.5 h-3.5" />,
      getHref: () =>
        `https://claude.ai/customize/connectors?${new URLSearchParams({
          modal: "add-custom-connector",
          connectorName: "MemContext",
          connectorUrl: MCP_SERVER_URL,
        })}`,
    },
    steps: [
      {
        title: "Add the connector",
        description: (
          <>
            Open Claude with MemContext pre-filled, or go to{" "}
            <Em>Settings → Connectors → Add custom connector</Em>, name it{" "}
            <Mono>MemContext</Mono>, and paste the server URL above.
          </>
        ),
        showDeepLink: true,
      },
      {
        title: "Connect and approve",
        description: (
          <>
            Click <Em>Add</Em>, then <Em>Connect</Em>. Sign in to MemContext,
            pick a workspace, and approve access.
          </>
        ),
      },
    ],
    note: (
      <>
        On Team or Enterprise plans, an owner adds the connector under{" "}
        <Em>Organization settings → Connectors</Em>, then members click{" "}
        <Em>Connect</Em>.
      </>
    ),
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    tabLabel: "ChatGPT",
    icon: <OpenAI className="w-6 h-6" />,
    kind: "chat",
    summary: "Create a custom connector in developer mode.",
    instructionsDestination: "Settings → Personalization → Custom instructions",
    steps: [
      {
        title: "Enable developer mode",
        description: (
          <>
            Open <Em>Settings → Apps & Connectors → Advanced settings</Em> and
            turn on <Em>Developer mode</Em>.
          </>
        ),
      },
      {
        title: "Create the connector",
        description: (
          <>
            In <Em>Settings → Connectors</Em>, click <Em>Create</Em>. Name it{" "}
            <Mono>memcontext</Mono>, paste the server URL as the{" "}
            <Em>Connector URL</Em>, set authentication to <Em>OAuth</Em>, then
            click <Em>Create</Em>.
          </>
        ),
      },
      {
        title: "Sign in to MemContext",
        description: (
          <>
            Complete the MemContext sign-in, pick a workspace, and approve
            access.
          </>
        ),
      },
      {
        title: "Use it in a chat",
        description: (
          <>
            In any chat, click <Em>+ → More</Em> and select{" "}
            <Mono>memcontext</Mono>.
          </>
        ),
      },
    ],
    note: (
      <>
        Developer mode and custom connectors depend on your ChatGPT plan and
        your workspace admin settings.
      </>
    ),
  },
  {
    id: "claude-code",
    name: "Claude Code",
    tabLabel: "Claude Code",
    icon: <Claude.Color className="w-6 h-6" />,
    kind: "agent",
    summary: "Add the remote server, then authenticate in Claude Code.",
    cliCommand: CLAUDE_CODE_OAUTH_CLI,
    loginHint:
      "running `/mcp` inside Claude Code, selecting memcontext, and choosing Authenticate",
    preferencesFile: "~/.claude/CLAUDE.md",
    supportsAutoConfig: true,
    steps: [
      {
        title: "Add the server",
        description: <>Run this in your terminal:</>,
        snippet: { code: CLAUDE_CODE_OAUTH_CLI, language: "bash" },
      },
      {
        title: "Authenticate",
        description: (
          <>
            Run <Mono>/mcp</Mono> inside Claude Code, select{" "}
            <Mono>memcontext</Mono>, and choose <Em>Authenticate</Em>. Your
            browser opens the MemContext sign-in.
          </>
        ),
        alternative: {
          label: "Or from your terminal:",
          snippet: { code: "claude mcp login memcontext", language: "bash" },
        },
      },
    ],
  },
  {
    id: "codex",
    name: "Codex CLI",
    tabLabel: "Codex CLI",
    icon: <OpenAI className="w-6 h-6" />,
    kind: "agent",
    summary: "Register the server, then log in with Codex.",
    cliCommand: CODEX_OAUTH_CLI,
    configFile: "~/.codex/config.toml",
    configSnippet: CODEX_OAUTH_SNIPPET,
    loginHint: "running `codex mcp login memcontext`",
    preferencesFile: "~/.codex/instructions.md",
    supportsAutoConfig: true,
    steps: [
      {
        title: "Add the server",
        description: <>Run this in your terminal:</>,
        snippet: { code: CODEX_OAUTH_CLI, language: "bash" },
        alternative: {
          label: "Or add it to ~/.codex/config.toml:",
          snippet: CODEX_OAUTH_SNIPPET,
        },
      },
      {
        title: "Log in",
        description: (
          <>Start the OAuth flow and approve access in your browser:</>
        ),
        snippet: { code: "codex mcp login memcontext", language: "bash" },
      },
    ],
  },
  {
    id: "cursor",
    name: "Cursor",
    tabLabel: "Cursor",
    icon: <Cursor className="w-6 h-6" />,
    kind: "agent",
    summary: "One click install, then connect from Cursor settings.",
    configFile: "~/.cursor/mcp.json",
    configSnippet: CURSOR_OAUTH_SNIPPET,
    preferencesFile: "Cursor Settings → Rules → User Rules",
    deepLink: {
      label: "Add to Cursor",
      icon: <Cursor className="w-3.5 h-3.5" />,
      getHref: () =>
        `cursor://anysphere.cursor-deeplink/mcp/install?name=memcontext&config=${btoa(JSON.stringify({ url: MCP_SERVER_URL }))}`,
    },
    steps: [
      {
        title: "Add the server",
        description: (
          <>
            Install with one click, or add this to{" "}
            <Mono>~/.cursor/mcp.json</Mono>:
          </>
        ),
        showDeepLink: true,
        snippet: CURSOR_OAUTH_SNIPPET,
      },
      {
        title: "Connect",
        description: (
          <>
            Open <Em>Cursor Settings → Tools & MCP</Em>. When{" "}
            <Mono>memcontext</Mono> shows <Em>Needs authentication</Em>, click{" "}
            <Em>Connect</Em> and approve access.
          </>
        ),
      },
    ],
  },
  {
    id: "vscode",
    name: "VS Code",
    tabLabel: "VS Code",
    icon: <VSCodeIcon />,
    kind: "agent",
    summary: "Install the server for Copilot agent mode, then sign in.",
    configFile: ".vscode/mcp.json",
    configSnippet: VSCODE_OAUTH_SNIPPET,
    cliCommand: VSCODE_OAUTH_CLI,
    preferencesFile: ".github/copilot-instructions.md",
    deepLink: {
      label: "Add to VS Code",
      icon: <VSCodeIcon />,
      getHref: () =>
        `vscode:mcp/install?${encodeURIComponent(JSON.stringify(VSCODE_SERVER_ENTRY))}`,
    },
    steps: [
      {
        title: "Add the server",
        description: (
          <>
            Install with one click, or add this to <Mono>.vscode/mcp.json</Mono>{" "}
            (or your user <Mono>mcp.json</Mono>):
          </>
        ),
        showDeepLink: true,
        snippet: VSCODE_OAUTH_SNIPPET,
        alternative: {
          label: "Or use the VS Code CLI:",
          snippet: { code: VSCODE_OAUTH_CLI, language: "bash" },
        },
      },
      {
        title: "Sign in",
        description: (
          <>
            Click the <Em>Auth</Em> CodeLens above the <Mono>memcontext</Mono>{" "}
            entry, or accept the sign-in prompt the first time a tool runs.
          </>
        ),
      },
    ],
  },
  {
    id: "opencode",
    name: "OpenCode",
    tabLabel: "OpenCode",
    icon: <OpenCodeIcon />,
    kind: "agent",
    summary: "Add a remote server, then authenticate with OpenCode.",
    cliCommand: OPENCODE_OAUTH_CLI,
    configFile: "~/.config/opencode/opencode.json",
    configSnippet: OPENCODE_OAUTH_SNIPPET,
    loginHint: "running `opencode mcp auth memcontext`",
    preferencesFile: "~/.config/opencode/AGENTS.md",
    supportsAutoConfig: true,
    steps: [
      {
        title: "Add the server",
        description: (
          <>
            Add this to <Mono>~/.config/opencode/opencode.json</Mono>:
          </>
        ),
        snippet: OPENCODE_OAUTH_SNIPPET,
        alternative: {
          label: "Or use the CLI:",
          snippet: { code: OPENCODE_OAUTH_CLI, language: "bash" },
        },
      },
      {
        title: "Authenticate",
        description: (
          <>Start the OAuth flow and approve access in your browser:</>
        ),
        snippet: { code: "opencode mcp auth memcontext", language: "bash" },
      },
    ],
  },
];

export function getOAuthAutoConfigPrompt(client: OAuthClientConfig): string {
  const addServer = [
    client.cliCommand
      ? `Run this command:\n\`\`\`bash\n${client.cliCommand}\n\`\`\``
      : "",
    client.configSnippet && client.configFile
      ? `${client.cliCommand ? "If the command is unavailable, instead read" : "Read"} \`${client.configFile}\` (if it exists) and merge the following into it, preserving all existing settings. If the file doesn't exist, create it:\n\`\`\`${client.configSnippet.language}\n${client.configSnippet.code}\n\`\`\``
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return `Configure the MemContext MCP server for ${client.name} using OAuth. No API key or auth headers are needed. Do the following:

## Step 1: Add the MCP Server

${addServer}

## Step 2: Add User Preferences

Append the following to \`${client.preferencesFile}\` (create it if it doesn't exist, preserve existing content):

\`\`\`markdown
${USER_PREFERENCES}
\`\`\`

## Step 3: Finish Sign-in

Do not add any API key. When done, tell me to finish signing in by ${client.loginHint}. This opens the MemContext sign-in and consent screen in my browser.`;
}
