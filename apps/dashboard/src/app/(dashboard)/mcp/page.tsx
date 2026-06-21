"use client";

import Link from "next/link";
import { ArrowRight, Terminal } from "lucide-react";
import { Claude } from "@lobehub/icons";

interface OptionCardProps {
  href: string;
  title: string;
  tagline: string;
  icon: React.ReactNode;
}

function OptionCard({ href, title, tagline, icon }: OptionCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center text-center rounded-2xl border border-border bg-surface px-6 py-10 transition-all duration-200 hover:bg-surface-hover hover:border-border-hover"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background-secondary border border-border">
        {icon}
      </div>

      <h2 className="mt-5 text-base font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-1.5 text-sm text-foreground-muted max-w-[260px]">
        {tagline}
      </p>

      <div className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium text-foreground-subtle transition-colors duration-200 group-hover:text-foreground">
        <span>Continue</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

export default function McpPage() {
  return (
    <div className="min-h-[calc(100vh-48px)] flex flex-col items-center justify-center animate-fade-in">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="pb-10 text-center">
          <h1 className="text-2xl font-bold tracking-tight">MCP Setup</h1>
          <p className="text-sm text-foreground-muted max-w-xl mx-auto mt-1.5">
            Connect MemContext to Claude.ai, Claude Desktop, or your AI coding
            agent. Pick the path that matches how you work, you can always
            add the other one later.
          </p>
        </div>

        {/* Selector */}
        <div className="grid items-stretch gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <OptionCard
            href="/mcp/claude"
            title="Claude.ai & Claude Desktop"
            tagline="Remote connector. No API key required."
            icon={<Claude.Color className="w-7 h-7" />}
          />

          {/* OR divider */}
          <div className="flex sm:flex-col items-center justify-center gap-3">
            <div className="h-px sm:h-full sm:w-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-wider text-foreground-subtle">
              or
            </span>
            <div className="h-px sm:h-full sm:w-px flex-1 bg-border" />
          </div>

          <OptionCard
            href="/mcp/cli"
            title="CLI & editor integrations"
            tagline="API key + config for coding agents."
            icon={<Terminal className="w-7 h-7 text-foreground-muted" />}
          />
        </div>
      </div>
    </div>
  );
}
