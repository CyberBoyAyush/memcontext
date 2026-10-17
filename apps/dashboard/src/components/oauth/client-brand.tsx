"use client";

import { useState, type ReactNode } from "react";
import {
  Claude,
  Cline,
  Cursor,
  Gemini,
  GithubCopilot,
  Goose,
  Grok,
  Kimi,
  Lovable,
  Manus,
  MCP,
  OpenAI,
  Perplexity,
  Replit,
  Trae,
  Windsurf,
} from "@lobehub/icons";
import { OpenCodeIcon } from "@/lib/mcp-config";

const LOGO_SIZE = 22;
const MONO_COLOR = "#fafafa";
const NEUTRAL_ACCENT = "#a1a1a1";

export interface ClientBrandInput {
  clientId?: string | null;
  clientName?: string | null;
  clientUri?: string | null;
  redirectUri?: string | null;
  logoUri?: string | null;
}

export interface ClientBrand {
  name: string;
  logo: ReactNode;
  /** 6-digit hex so callers can append alpha (e.g. `${accent}33`). */
  accent: string;
  known: boolean;
}

interface BrandDefinition {
  name: string;
  match: string[];
  accent: string;
  logo: () => ReactNode;
}

const mono = (color = MONO_COLOR) => ({ color });

// Order matters: more specific brands must come before broader ones.
const BRANDS: BrandDefinition[] = [
  {
    name: "Claude Code",
    match: ["claude code", "claude-code", "claude_code", "claudecode"],
    accent: "#D97757",
    logo: () => <Claude.Color size={LOGO_SIZE} />,
  },
  {
    name: "Claude",
    match: ["claude", "anthropic"],
    accent: "#D97757",
    logo: () => <Claude.Color size={LOGO_SIZE} />,
  },
  {
    name: "Codex",
    match: ["codex"],
    accent: "#10A37F",
    logo: () => <OpenAI size={LOGO_SIZE} style={mono()} />,
  },
  {
    name: "ChatGPT",
    match: ["chatgpt", "openai"],
    accent: "#10A37F",
    logo: () => <OpenAI size={LOGO_SIZE} style={mono()} />,
  },
  {
    name: "Cursor",
    match: ["cursor", "anysphere"],
    accent: "#E5E5E5",
    logo: () => <Cursor size={LOGO_SIZE} style={mono()} />,
  },
  {
    name: "VS Code",
    match: ["visual studio code", "vscode", "vs code"],
    accent: "#3B9EFF",
    logo: () => <GithubCopilot size={LOGO_SIZE} style={mono()} />,
  },
  {
    name: "GitHub Copilot",
    match: ["copilot"],
    accent: "#3B9EFF",
    logo: () => <GithubCopilot size={LOGO_SIZE} style={mono()} />,
  },
  {
    name: "OpenCode",
    match: ["opencode"],
    accent: "#E5E5E5",
    logo: () => (
      <span className="flex h-[20px] w-[20px] items-center justify-center [&_.fill-foreground-muted]:fill-[#6b6b6b] [&_.fill-foreground]:fill-[#fafafa] [&_svg]:h-[20px] [&_svg]:w-[20px]">
        <OpenCodeIcon />
      </span>
    ),
  },
  {
    name: "Grok",
    match: ["grok", "x.ai"],
    accent: "#E5E5E5",
    logo: () => <Grok size={LOGO_SIZE} style={mono()} />,
  },
  {
    name: "Gemini",
    match: ["gemini"],
    accent: "#4796E3",
    logo: () => <Gemini.Color size={LOGO_SIZE} />,
  },
  {
    name: "Windsurf",
    match: ["windsurf", "codeium"],
    accent: "#34E8BB",
    logo: () => <Windsurf size={LOGO_SIZE} style={mono()} />,
  },
  {
    name: "Perplexity",
    match: ["perplexity"],
    accent: "#22B8CD",
    logo: () => <Perplexity.Color size={LOGO_SIZE} />,
  },
  {
    name: "Cline",
    match: ["cline"],
    accent: "#E5E5E5",
    logo: () => <Cline size={LOGO_SIZE} style={mono()} />,
  },
  {
    name: "Goose",
    match: ["goose"],
    accent: "#E5E5E5",
    logo: () => <Goose size={LOGO_SIZE} style={mono()} />,
  },
  {
    name: "Trae",
    match: ["trae"],
    accent: "#FF4C4C",
    logo: () => <Trae.Color size={LOGO_SIZE} />,
  },
  {
    name: "Kimi",
    match: ["kimi", "moonshot"],
    accent: "#4B8BFF",
    logo: () => <Kimi.Color size={LOGO_SIZE} />,
  },
  {
    name: "Manus",
    match: ["manus"],
    accent: "#E5E5E5",
    logo: () => <Manus size={LOGO_SIZE} style={mono()} />,
  },
  {
    name: "Replit",
    match: ["replit"],
    accent: "#F26207",
    logo: () => <Replit.Color size={LOGO_SIZE} />,
  },
  {
    name: "Lovable",
    match: ["lovable"],
    accent: "#FF5C87",
    logo: () => <Lovable.Color size={LOGO_SIZE} />,
  },
  {
    name: "MCP Inspector",
    match: ["inspector"],
    accent: "#E5E5E5",
    logo: () => <MCP size={LOGO_SIZE} style={mono()} />,
  },
];

// Web domains a brand's OAuth redirect may use. A public web redirect is only
// branded when it lands on one of these, so a self-registered (DCR) client
// cannot borrow another product's name and logo to phish users.
const BRAND_DOMAINS: Record<string, string[]> = {
  "Claude Code": ["claude.ai", "claude.com", "anthropic.com"],
  Claude: ["claude.ai", "claude.com", "anthropic.com"],
  Codex: ["chatgpt.com", "openai.com"],
  ChatGPT: ["chatgpt.com", "openai.com"],
  Cursor: ["cursor.com", "cursor.sh"],
  "VS Code": ["vscode.dev", "visualstudio.com", "github.com"],
  "GitHub Copilot": ["github.com", "githubcopilot.com"],
  OpenCode: ["opencode.ai"],
  Grok: ["grok.com", "x.ai", "x.com"],
  Gemini: ["google.com"],
  Windsurf: ["windsurf.com", "codeium.com"],
  Perplexity: ["perplexity.ai"],
  Cline: ["cline.bot"],
  Goose: ["block.xyz"],
  Trae: ["trae.ai"],
  Kimi: ["kimi.com", "moonshot.cn"],
  Manus: ["manus.im"],
  Replit: ["replit.com"],
  Lovable: ["lovable.dev"],
};

function isTrustedRedirect(brand: BrandDefinition, publicHost: string | null) {
  if (!publicHost) return true;
  return (BRAND_DOMAINS[brand.name] ?? []).some(
    (domain) => publicHost === domain || publicHost.endsWith(`.${domain}`),
  );
}

function parseUrl(value?: string | null): URL | null {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isLoopback(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "");
  return host === "localhost" || host === "::1" || host.startsWith("127.");
}

function hostOf(value?: string | null): string | null {
  const url = parseUrl(value);
  if (!url || !/^https?:$/.test(url.protocol) || !url.hostname) return null;
  return url.hostname.replace(/^www\./, "");
}

/** Human-readable redirect target, e.g. "claude.ai", "cursor://", or "this device". */
export function describeRedirectTarget(
  redirectUri?: string | null,
): string | null {
  const url = parseUrl(redirectUri);
  if (!url) return null;
  if (!/^https?:$/.test(url.protocol)) return `${url.protocol}//`;
  if (isLoopback(url.hostname)) return "this device";
  return url.hostname.replace(/^www\./, "");
}

function initials(name: string): string {
  const words = name
    .replace(/\.[a-z]+$/i, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  const letters = words.slice(0, 2).map((w) => w.charAt(0));
  return (letters.join("") || "?").toUpperCase();
}

function Monogram({ name }: { name: string }) {
  return (
    <span
      className="relative z-10 text-[12px] font-semibold tracking-wide"
      style={{ color: "#d4d4d4" }}
    >
      {initials(name)}
    </span>
  );
}

function RemoteLogo({ src, fallback }: { src: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary third-party client logo
    <img
      src={src}
      alt=""
      width={LOGO_SIZE}
      height={LOGO_SIZE}
      referrerPolicy="no-referrer"
      className="relative z-10 h-[22px] w-[22px] rounded object-contain"
      onError={() => setFailed(true)}
    />
  );
}

export function getClientBrand({
  clientId,
  clientName,
  clientUri,
  redirectUri,
  logoUri,
}: ClientBrandInput): ClientBrand {
  const redirect = parseUrl(redirectUri);
  const haystack = [
    clientName,
    clientId,
    hostOf(clientUri),
    redirect?.hostname,
    redirect?.protocol,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .toLowerCase();

  const publicHost =
    redirect && /^https?:$/.test(redirect.protocol) && !isLoopback(redirect.hostname)
      ? redirect.hostname.replace(/^www\./, "")
      : null;
  const brand = BRANDS.find(
    (b) =>
      b.match.some((m) => haystack.includes(m)) && isTrustedRedirect(b, publicHost),
  );
  if (brand) {
    return {
      name: brand.name,
      logo: <span className="relative z-10 flex">{brand.logo()}</span>,
      accent: brand.accent,
      known: true,
    };
  }

  const name =
    clientName?.trim() ||
    hostOf(clientId) ||
    hostOf(clientUri) ||
    "An MCP client";
  const fallback =
    name === "An MCP client" ? (
      <span className="relative z-10 flex">
        <MCP size={LOGO_SIZE} style={mono()} />
      </span>
    ) : (
      <Monogram name={name} />
    );
  const logo =
    logoUri && parseUrl(logoUri)?.protocol === "https:" ? (
      <RemoteLogo key={logoUri} src={logoUri} fallback={fallback} />
    ) : (
      fallback
    );

  return { name, logo, accent: NEUTRAL_ACCENT, known: false };
}
