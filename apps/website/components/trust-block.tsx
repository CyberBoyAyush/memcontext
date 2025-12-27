"use client";

import {
  Claude,
  Cursor,
  Windsurf,
  Cline,
  Qwen,
  GithubCopilot,
  Gemini,
  Goose,
  Kimi,
} from "@lobehub/icons";
import { ReactNode } from "react";

interface Tool {
  name: string;
  icon: ReactNode;
}

const tools: Tool[] = [
  { name: "Cursor", icon: <Cursor size={20} /> },
  { name: "Windsurf", icon: <Windsurf size={20} /> },
  { name: "Claude", icon: <Claude size={20} /> },
  { name: "Gemini", icon: <Gemini size={20} /> },
  { name: "GitHub Copilot", icon: <GithubCopilot size={20} /> },
  { name: "Cline", icon: <Cline size={20} /> },
  { name: "Qwen", icon: <Qwen size={20} /> },
  { name: "Goose", icon: <Goose size={20} /> },
  { name: "Kimi", icon: <Kimi size={20} /> },
];

export function TrustBlock() {
  return (
    <section className="py-12 sm:py-16 border-y border-border bg-surface-elevated/50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-xs sm:text-sm tracking-wider uppercase text-foreground-subtle mb-8 sm:mb-10">
          Compatible with
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="flex items-center gap-2 sm:gap-2.5 text-foreground-muted hover:text-foreground transition-all duration-200 group cursor-default px-3 py-2 rounded-lg hover:bg-surface-elevated"
            >
              <span className="opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200">
                {tool.icon}
              </span>
              <span className="text-xs sm:text-sm font-medium">{tool.name}</span>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-foreground-subtle mt-6 sm:mt-8">
          + any MCP-compatible tool
        </p>
      </div>
    </section>
  );
}
