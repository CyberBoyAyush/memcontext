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
  { name: "Cursor", icon: <Cursor size={32} /> },
  { name: "Windsurf", icon: <Windsurf size={32} /> },
  { name: "Claude", icon: <Claude size={32} /> },
  { name: "Gemini", icon: <Gemini size={32} /> },
  { name: "GitHub Copilot", icon: <GithubCopilot size={32} /> },
  { name: "Cline", icon: <Cline size={32} /> },
  { name: "Qwen", icon: <Qwen size={32} /> },
  { name: "Goose", icon: <Goose size={32} /> },
  { name: "Kimi", icon: <Kimi size={32} /> },
];

export function TrustBlock() {
  return (
    <section className="py-6 sm:py-8 relative z-20">
      <div className="flex flex-col items-center gap-2 gap-y-4 overflow-hidden">
        {/* Left side - Label */}
        <div className="shrink-0 pl-4 sm:pl-8 pr-4 sm:pr-6">
          <p className="text-[10px] sm:text-lg text-foreground opacity-70 whitespace-nowrap">
            Compatible with any MCP-compatible tool
          </p>
        </div>
        
        {/* Right side - Marquee */}
        <div className="relative w-full overflow-hidden">
          {/* Left fade */}
          <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-20 bg-linear-to-r from-background to-transparent z-10 pointer-events-none" />
          {/* Right fade */}
          <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-20 bg-linear-to-l from-background to-transparent z-10 pointer-events-none" />
          
          {/* Scrolling content - two identical tracks for seamless loop */}
          <div className="flex animate-marquee py-2 sm:py-4">
            {/* First track */}
            <div className="flex shrink-0 gap-6 sm:gap-10">
              {tools.map((tool, index) => (
                <div
                  key={`first-${tool.name}-${index}`}
                  className="flex items-center gap-2 text-foreground px-3 sm:px-5 shrink-0"
                >
                  <span className="">
                    {tool.icon}
                  </span>
                  <span className="text-xs sm:text-3xl font-medium whitespace-nowrap">{tool.name}</span>
                </div>
              ))}
            </div>
            {/* Second track (duplicate for seamless loop) */}
            <div className="flex shrink-0 gap-6 sm:gap-10 ml-6 sm:ml-10">
              {tools.map((tool, index) => (
                <div
                  key={`second-${tool.name}-${index}`}
                  className="flex items-center gap-2 text-foreground px-3 sm:px-5 shrink-0"
                >
                  <span className="">
                    {tool.icon}
                  </span>
                  <span className="text-xs sm:text-3xl font-medium whitespace-nowrap">{tool.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
