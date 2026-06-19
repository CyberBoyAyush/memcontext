"use client";

import Link from "next/link";
import { ArrowRight, Key, Terminal } from "lucide-react";
import { Claude } from "@lobehub/icons";
import { cn } from "@/lib/utils";

type ActiveSection = "claude" | "cli";

interface JumpCard {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

const CARDS: Record<ActiveSection, JumpCard[]> = {
  // On Claude page: show CLI section + API Keys
  claude: [
    {
      label: "CLI & editor integrations",
      description: "Claude Code, Cursor, OpenCode, Codex CLI",
      href: "/mcp/cli",
      icon: <Terminal className="w-6 h-6 text-foreground-muted" />,
    },
    {
      label: "API Keys",
      description: "Manage your MemContext API keys",
      href: "/api-keys",
      icon: <Key className="w-6 h-6 text-foreground-muted" />,
    },
  ],
  // On CLI page: show Claude section + API Keys
  cli: [
    {
      label: "Claude.ai & Desktop",
      description: "Remote connector, no API key required",
      href: "/mcp/claude",
      icon: <Claude.Color className="w-6 h-6" />,
    },
    {
      label: "API Keys",
      description: "Manage your MemContext API keys",
      href: "/api-keys",
      icon: <Key className="w-6 h-6 text-foreground-muted" />,
    },
  ],
};

export function McpSectionTabs({ active }: { active: ActiveSection }) {
  const cards = CARDS[active];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className={cn(
            "group flex items-center gap-4 rounded-2xl border border-border bg-surface px-5 py-5 shadow-sm",
            "transition-all duration-200 hover:bg-surface-hover hover:border-border-hover hover:-translate-y-0.5 hover:shadow-md",
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background-secondary border border-border shrink-0">
            {card.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-foreground truncate">
              {card.label}
            </p>
            <p className="text-sm text-foreground-muted truncate mt-0.5">
              {card.description}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-foreground-subtle shrink-0 transition-all duration-200 group-hover:text-foreground group-hover:translate-x-1" />
        </Link>
      ))}
    </div>
  );
}
