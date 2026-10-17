"use client";

import Link from "next/link";
import { ArrowRight, Key, KeyRound, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { McpSetupBadge } from "@/components/mcp-setup-badge";

type ActiveSection = "oauth" | "api-key";

interface JumpCard {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  recommended?: boolean;
}

const API_KEYS_CARD: JumpCard = {
  label: "API Keys",
  description: "Manage your MemContext API keys",
  href: "/api-keys",
  icon: <Key className="w-6 h-6 text-foreground-muted" />,
};

const CARDS: Record<ActiveSection, JumpCard[]> = {
  oauth: [
    {
      label: "API key setup",
      description: "CI, servers, scripts, and non-OAuth clients",
      href: "/mcp/api-key",
      icon: <KeyRound className="w-6 h-6 text-foreground-muted" />,
    },
    API_KEYS_CARD,
  ],
  "api-key": [
    {
      label: "Connect with OAuth",
      description: "Browser sign-in, no API key required",
      href: "/mcp/oauth",
      icon: <ShieldCheck className="w-6 h-6 text-accent" />,
      recommended: true,
    },
    API_KEYS_CARD,
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
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl border shrink-0",
              card.recommended
                ? "bg-accent/10 border-accent/20"
                : "bg-background-secondary border-border",
            )}
          >
            {card.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-base font-semibold text-foreground truncate">
                {card.label}
              </p>
              {card.recommended && <McpSetupBadge variant="recommended" />}
            </div>
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
