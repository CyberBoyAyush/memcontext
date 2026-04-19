"use client";

import { useState, ReactNode, Fragment } from "react";
import { Copy, Check, ArrowRight, Circle } from "lucide-react";
import { Claude, Cursor, OpenAI } from "@lobehub/icons";

// Warm, on-brand syntax palette matching the reference
const SYN = {
  key: "#EADDC8", // cream — JSON keys / TOML keys
  string: "#E8A17A", // soft terracotta — string literals
  punct: "#7A7168", // dim — braces, brackets, colons, commas
  plain: "#D7CFC3", // default text
  comment: "#6B6660",
  flag: "#C9A37A", // cURL flags like -H, -X
  method: "#E8A17A", // HTTP methods
} as const;

// Tokenize JSON/JSON-like text into colored spans.
// Handles strings (with their surrounding quotes), keys vs values via trailing colon,
// and punctuation. Everything else falls through as plain.
function highlightJson(source: string): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  const n = source.length;
  while (i < n) {
    const ch = source[i];
    // string literal
    if (ch === '"') {
      let j = i + 1;
      while (j < n) {
        if (source[j] === "\\" && j + 1 < n) {
          j += 2;
          continue;
        }
        if (source[j] === '"') break;
        j++;
      }
      const strEnd = Math.min(j + 1, n);
      const literal = source.slice(i, strEnd);
      // peek next non-space char — if it's ":" this string is a key
      let k = strEnd;
      while (k < n && (source[k] === " " || source[k] === "\t")) k++;
      const isKey = source[k] === ":";
      out.push(
        <span key={key++} style={{ color: isKey ? SYN.key : SYN.string }}>
          {literal}
        </span>,
      );
      i = strEnd;
      continue;
    }
    // punctuation
    if ("{}[],:".includes(ch)) {
      out.push(
        <span key={key++} style={{ color: SYN.punct }}>
          {ch}
        </span>,
      );
      i++;
      continue;
    }
    // whitespace / plain
    let j = i;
    while (j < n && !'"{}[],:'.includes(source[j])) j++;
    out.push(
      <span key={key++} style={{ color: SYN.plain }}>
        {source.slice(i, j)}
      </span>,
    );
    i = j;
  }
  return out;
}

// Lightweight highlighter for TOML-ish and shell (cURL) snippets.
// Strings in "..." get the string color, leading keys before "=" get the key color,
// cURL flags (-X, -H, --foo) get the flag color.
function highlightShellish(source: string): ReactNode[] {
  const lines = source.split("\n");
  const nodes: ReactNode[] = [];
  lines.forEach((line, li) => {
    let i = 0;
    let k = 0;
    const parts: ReactNode[] = [];
    // detect "key = ..." style TOML lines
    const tomlMatch = /^(\s*)([A-Za-z0-9_.\-\[\]]+)(\s*=\s*)/.exec(line);
    if (tomlMatch) {
      parts.push(tomlMatch[1]);
      parts.push(
        <span key={`k${k++}`} style={{ color: SYN.key }}>
          {tomlMatch[2]}
        </span>,
      );
      parts.push(
        <span key={`k${k++}`} style={{ color: SYN.punct }}>
          {tomlMatch[3]}
        </span>,
      );
      i = tomlMatch[0].length;
    }
    // detect section headers like [section]
    const sectionMatch = /^(\s*)(\[[^\]]+\])(\s*)$/.exec(line);
    if (sectionMatch && !tomlMatch) {
      parts.push(sectionMatch[1]);
      parts.push(
        <span key={`k${k++}`} style={{ color: SYN.key }}>
          {sectionMatch[2]}
        </span>,
      );
      parts.push(sectionMatch[3]);
      i = line.length;
    }
    while (i < line.length) {
      const ch = line[i];
      // string
      if (ch === '"') {
        let j = i + 1;
        while (j < line.length) {
          if (line[j] === "\\" && j + 1 < line.length) {
            j += 2;
            continue;
          }
          if (line[j] === '"') break;
          j++;
        }
        const end = Math.min(j + 1, line.length);
        parts.push(
          <span key={`k${k++}`} style={{ color: SYN.string }}>
            {line.slice(i, end)}
          </span>,
        );
        i = end;
        continue;
      }
      // cURL flag: -X, -H, --long
      if (
        ch === "-" &&
        (i === 0 || line[i - 1] === " " || line[i - 1] === "\t")
      ) {
        let j = i + 1;
        if (line[j] === "-") j++;
        while (j < line.length && /[A-Za-z0-9_-]/.test(line[j])) j++;
        if (j > i + 1) {
          parts.push(
            <span key={`k${k++}`} style={{ color: SYN.flag }}>
              {line.slice(i, j)}
            </span>,
          );
          i = j;
          continue;
        }
      }
      // HTTP methods at token boundaries
      const rest = line.slice(i);
      const methodMatch = /^(GET|POST|PUT|DELETE|PATCH)\b/.exec(rest);
      if (methodMatch && (i === 0 || /\s/.test(line[i - 1]))) {
        parts.push(
          <span key={`k${k++}`} style={{ color: SYN.method }}>
            {methodMatch[0]}
          </span>,
        );
        i += methodMatch[0].length;
        continue;
      }
      // plain run until next notable char
      let j = i;
      while (j < line.length && line[j] !== '"' && line[j] !== "-") j++;
      if (j === i) j = i + 1;
      parts.push(
        <span key={`k${k++}`} style={{ color: SYN.plain }}>
          {line.slice(i, j)}
        </span>,
      );
      i = j;
    }
    nodes.push(
      <Fragment key={`l${li}`}>
        {parts}
        {li < lines.length - 1 ? "\n" : ""}
      </Fragment>,
    );
  });
  return nodes;
}

function highlightSnippet(source: string, fileName: string): ReactNode[] {
  const looksJson = source.trimStart().startsWith("{");
  return looksJson &&
    !fileName.startsWith("POST") &&
    !fileName.startsWith("GET")
    ? highlightJson(source)
    : highlightShellish(source);
}

interface Snippet {
  id: string;
  name: string;
  fileName: string;
  icon?: ReactNode;
  config: string;
}

const MCP_SERVER_URL = "https://mcp.memcontext.in/mcp";

const mcpSnippets: Snippet[] = [
  {
    id: "claude",
    name: "Claude",
    fileName: "~/.claude.json",
    icon: <Claude size={16} />,
    config: `{
  "mcpServers": {
    "memcontext": {
      "url": "${MCP_SERVER_URL}",
      "headers": {
        "x-api-key": "YOUR_MEMCONTEXT_API_KEY"
      }
    }
  }
}`,
  },
  {
    id: "cursor",
    name: "Cursor",
    fileName: ".cursor/mcp.json",
    icon: <Cursor size={16} />,
    config: `{
  "mcpServers": {
    "memcontext": {
      "url": "${MCP_SERVER_URL}",
      "headers": {
        "x-api-key": "YOUR_MEMCONTEXT_API_KEY"
      }
    }
  }
}`,
  },
  {
    id: "codex",
    name: "Codex",
    fileName: "~/.codex/config.toml",
    icon: <OpenAI size={16} />,
    config: `[mcp_servers.memcontext]
url = "${MCP_SERVER_URL}"

[mcp_servers.memcontext.http_headers]
x-api-key = "YOUR_MEMCONTEXT_API_KEY"`,
  },
];

const apiSnippets: Snippet[] = [
  {
    id: "save",
    name: "Save",
    fileName: "POST /api/memories",
    config: `curl -X POST "https://api.memcontext.in/api/memories" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{
    "content": "User prefers dark mode in all editors",
    "category": "preference",
    "project": "my-app"
  }'`,
  },
  {
    id: "search",
    name: "Search",
    fileName: "GET /api/memories/search",
    config: `curl "https://api.memcontext.in/api/memories/search\\
?query=What%20theme%20does%20the%20user%20prefer\\
&project=my-app&limit=5" \\
  -H "X-API-Key: YOUR_API_KEY"`,
  },
  {
    id: "feedback",
    name: "Feedback",
    fileName: "POST /api/memories/:id/feedback",
    config: `curl -X POST "https://api.memcontext.in/api/memories/\\
MEMORY_ID/feedback" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{
    "type": "helpful",
    "context": "This memory was useful"
  }'`,
  },
];

type Mode = "mcp" | "api";

const mcpSteps = [
  {
    num: "01",
    title: "Drop the config",
    body: "into Claude Code, Cursor, Codex or any MCP client.",
  },
  {
    num: "02",
    title: "Chat as usual",
    body: "— nothing else changes. No prompts, no wrappers.",
  },
  {
    num: "03",
    title: "Context persists.",
    body: "Saved and retrieved automatically, across every session.",
  },
];

const apiSteps = [
  {
    num: "01",
    title: "Grab an API key",
    body: "from the dashboard. One header is all you need.",
  },
  {
    num: "02",
    title: "Call the REST API",
    body: "from any language — Node, Python, Go, cURL, anything.",
  },
  {
    num: "03",
    title: "Save, search, learn.",
    body: "Hybrid retrieval and feedback scoring built in.",
  },
];

export function HowItWorks() {
  const [mode, setMode] = useState<Mode>("mcp");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const snippets = mode === "mcp" ? mcpSnippets : apiSnippets;
  const steps = mode === "mcp" ? mcpSteps : apiSteps;
  const current = snippets[Math.min(selectedIdx, snippets.length - 1)];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(current.config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setSelectedIdx(0);
    setCopied(false);
  };

  return (
    <section
      id="how-it-works"
      className="py-20 sm:py-28 lg:py-32 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Centered header — badge pill + heading + subtitle */}
        <div className="text-center mb-12 sm:mb-16">
          {/* Glowing Setup badge */}
          <div className="flex justify-center mb-6">
            <div className="group relative">
              <div
                aria-hidden
                className="absolute -top-px -left-px w-16 h-9 rounded-full blur-[1px]"
                style={{
                  background:
                    "radial-gradient(ellipse at top left, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 70%)",
                }}
              />
              <div
                aria-hidden
                className="absolute -bottom-px -right-px w-16 h-9 rounded-full blur-[1px]"
                style={{
                  background:
                    "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 30%, transparent 70%)",
                }}
              />
              <div className="absolute -inset-0.5 rounded-full border border-white/10" />
              <div className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/95 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="relative z-10 text-xs sm:text-sm text-foreground font-medium">
                  Setup
                </span>
              </div>
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight leading-[1.1]">
            Get started in under two minutes.
          </h2>

          <p className="mt-5 text-base sm:text-lg text-foreground-muted/80 max-w-2xl mx-auto leading-relaxed">
            {mode === "mcp"
              ? "One config file. That's it. Your AI remembers everything from there."
              : "One API key. That's it. Build memory into any app with a few HTTP calls."}
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-16 items-start">
          {/* LEFT — toggle + steps + CTA */}
          <div>
            {/* MCP / REST API toggle — shiny pill, left-aligned */}
            <div className="mb-10 flex">
              <div className="relative">
                <div className="absolute -inset-px rounded-xl border border-white/[0.08]" />
                <div className="relative flex p-1 bg-surface/80 backdrop-blur-md rounded-xl">
                  <div
                    className="absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-out overflow-hidden shadow-[0_4px_16px_rgba(232,97,60,0.25)]"
                    style={{
                      width: `calc((100% - 8px) / 2)`,
                      left:
                        mode === "mcp" ? `4px` : `calc(4px + (100% - 8px) / 2)`,
                      background:
                        "linear-gradient(135deg, rgba(232, 97, 60, 0.85) 0%, rgba(201, 78, 46, 0.75) 100%)",
                    }}
                  >
                    <div
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background:
                          "radial-gradient(ellipse at 20% 10%, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 40%, transparent 70%)",
                      }}
                    />
                    <div
                      className="absolute top-0 left-0 right-0 h-px"
                      style={{
                        background:
                          "linear-gradient(90deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.25) 40%, rgba(255,255,255,0.05) 100%)",
                      }}
                    />
                  </div>
                  {(["mcp", "api"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => switchMode(m)}
                      className={`relative cursor-pointer px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 z-10 ${
                        mode === m
                          ? "text-foreground"
                          : "text-foreground-muted hover:text-foreground"
                      }`}
                    >
                      {m === "mcp" ? "MCP Server" : "REST API"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Numbered steps — shiny glass badges, center-aligned with first line */}
            <div className="space-y-4">
              {steps.map((step) => (
                <div key={step.num} className="flex items-start gap-4 sm:gap-5">
                  {/* Glass number badge — tighter, aligned with text baseline */}
                  <div className="relative shrink-0 mt-0.5">
                    <div
                      aria-hidden
                      className="absolute -top-[0.5px] -left-[0.5px] w-5 h-5 rounded-lg"
                      style={{
                        background:
                          "radial-gradient(ellipse at top left, rgba(232,97,60,0.6) 0%, rgba(232,97,60,0.15) 25%, transparent 70%)",
                      }}
                    />
                    <div
                      aria-hidden
                      className="absolute -bottom-[0.5px] -right-[0.5px] w-5 h-5 rounded-lg"
                      style={{
                        background:
                          "radial-gradient(ellipse at bottom right, rgba(232,97,60,0.4) 0%, rgba(232,97,60,0.08) 30%, transparent 70%)",
                      }}
                    />
                    <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-[11px] font-mono text-accent bg-accent/10 border border-accent/20">
                      <span className="relative z-10">{step.num}</span>
                    </div>
                  </div>

                  {/* Text — flows naturally, badge sits next to first line */}
                  <p className="flex-1 text-sm sm:text-base leading-7 sm:leading-8">
                    <span className="font-semibold text-foreground">
                      {step.title}
                    </span>{" "}
                    <span className="text-foreground-muted">{step.body}</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Full setup guide CTA — glass pill */}
            <div className="mt-10">
              <a
                href="https://docs.memcontext.in"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-block"
              >
                <div className="absolute -inset-0.5 rounded-xl border border-white/8" />
                <div className="relative flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-surface/60 backdrop-blur-sm border border-white/[0.08] transition-all group-hover:border-white/15 group-hover:bg-surface/80">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.04] via-transparent to-transparent" />
                  <span className="text-sm sm:text-base text-foreground font-display font-semibold relative z-10">
                    Full setup guide
                  </span>
                  <ArrowRight className="w-4 h-4 text-foreground relative z-10 transition-transform group-hover:translate-x-1" />
                </div>
              </a>
            </div>
          </div>

          {/* RIGHT — code panel */}
          <div className="relative">
            {/* Border glow - top left */}
            <div
              aria-hidden
              className="absolute -top-px -left-px w-28 h-20 rounded-2xl"
              style={{
                background:
                  "radial-gradient(ellipse at top left, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 40%, transparent 70%)",
              }}
            />
            {/* Border glow - bottom right */}
            <div
              aria-hidden
              className="absolute -bottom-px -right-px w-28 h-20 rounded-2xl"
              style={{
                background:
                  "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 40%, transparent 70%)",
              }}
            />

            {/* Soft ambient accent glow behind panel */}
            <div
              aria-hidden
              className="absolute -inset-8 rounded-3xl blur-3xl opacity-40 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 70% 30%, rgba(232,97,60,0.18) 0%, transparent 60%)",
              }}
            />

            {/* Main panel */}
            <div className="relative rounded-2xl bg-surface/50 backdrop-blur-md border border-white/[0.08] shadow-2xl shadow-black/40 overflow-hidden">
              {/* Inner gradient overlay */}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent rounded-2xl pointer-events-none"
              />

              {/* Snippet tabs row — shiny pill switcher inside panel */}
              <div className="relative p-3 sm:p-4 border-b border-white/[0.06]">
                <div className="relative flex items-center p-1 rounded-xl bg-background/40 border border-white/[0.06]">
                  {/* Sliding indicator — equal slices, aligned to each button */}
                  <div
                    className="absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-out overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.5)] pointer-events-none"
                    style={{
                      width: `calc((100% - 8px) / ${snippets.length})`,
                      left: `calc(4px + ${selectedIdx} * ((100% - 8px) / ${snippets.length}))`,
                      background:
                        "linear-gradient(180deg, rgba(42,42,42,0.95) 0%, rgba(24,24,24,0.95) 100%)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      aria-hidden
                      className="absolute top-0 left-0 right-0 h-px"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
                      }}
                    />
                  </div>
                  {snippets.map((snip, i) => (
                    <button
                      key={snip.id}
                      onClick={() => {
                        setSelectedIdx(i);
                        setCopied(false);
                      }}
                      className={`relative z-10 flex-1 cursor-pointer flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors duration-300 ${
                        selectedIdx === i
                          ? "text-foreground"
                          : "text-foreground-muted hover:text-foreground"
                      }`}
                    >
                      {snip.icon && (
                        <span className="shrink-0">{snip.icon}</span>
                      )}
                      <span className="whitespace-nowrap">{snip.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filename + copy button row */}
              <div className="relative px-4 sm:px-5 py-3 flex items-center justify-between border-b border-white/[0.06]">
                <span className="text-xs sm:text-sm text-foreground-subtle font-mono truncate">
                  {current.fileName}
                </span>
                <button
                  onClick={handleCopy}
                  className={`relative cursor-pointer shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    copied
                      ? "text-accent border-accent/20 bg-accent/10"
                      : "text-foreground-subtle border-white/[0.08] hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code body — warm syntax highlighting */}
              <div className="relative overflow-x-auto max-w-[85vw] sm:max-w-none">
                <pre className="p-5 sm:p-6 text-xs sm:text-sm font-mono leading-relaxed min-h-[280px] sm:min-h-[300px]">
                  <code className="whitespace-pre">
                    {highlightSnippet(current.config, current.fileName)}
                  </code>
                </pre>
              </div>

              {/* Footer status row */}
              <div className="relative px-4 sm:px-5 py-3 border-t border-white/[0.06] flex items-center justify-between bg-background/20">
                <div className="flex items-center gap-2">
                  <Circle className="w-2 h-2 fill-accent text-accent" />
                  <span className="text-xs text-foreground-muted">
                    {mode === "mcp"
                      ? "Memories persist across sessions automatically."
                      : "Works in any language — Node, Python, Go, cURL."}
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs text-foreground-subtle font-mono hidden sm:block">
                  {mode === "mcp" ? "mcp.memcontext.in" : "api.memcontext.in"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
