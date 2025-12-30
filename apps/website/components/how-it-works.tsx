"use client";

import { useState, useEffect, ReactNode } from "react";
import { Copy, Check, Bookmark, ArrowDownToLine, Circle } from "lucide-react";
import { IoSend } from "react-icons/io5";
import { Claude, Cursor, OpenAI } from "@lobehub/icons";

interface ChatMessage {
  type: "user" | "ai" | "system";
  content: string;
  action?: "save" | "retrieve";
  delay: number;
}

interface ToolConfig {
  id: string;
  name: string;
  fileName: string;
  icon: ReactNode;
  config: string;
}

const HIDDEN_URL = "https://we-will-launch-this-soon";

const tools: ToolConfig[] = [
  {
    id: "claude",
    name: "Claude Code",
    fileName: "~/.claude.json",
    icon: <Claude size={18} />,
    config: `{
  "mcpServers": {
    "memcontext": {
      "url": "{{BLURRED_URL}}",
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
    icon: <Cursor size={18} />,
    config: `{
  "mcpServers": {
    "memcontext": {
      "url": "{{BLURRED_URL}}",
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
    icon: <OpenAI size={18} />,
    config: `[mcp_servers.memcontext]
url = "{{BLURRED_URL}}"

[mcp_servers.memcontext.http_headers]
x-api-key = "YOUR_MEMCONTEXT_API_KEY"`,
  },
];

const chatSequence: ChatMessage[] = [
  {
    type: "user",
    content: "I prefer using Tailwind CSS for styling",
    delay: 0,
  },
  { type: "system", content: "Memory saved", action: "save", delay: 1200 },
  {
    type: "ai",
    content: "Got it! I'll remember that preference.",
    delay: 1800,
  },
  { type: "user", content: "Build me a card component", delay: 4000 },
  {
    type: "system",
    content: "Retrieved: styling preferences",
    action: "retrieve",
    delay: 5200,
  },
  {
    type: "ai",
    content: "Here's a card using Tailwind CSS, since that's your preference:",
    delay: 5800,
  },
];

export function HowItWorks() {
  const [copied, setCopied] = useState(false);
  const [selectedTool, setSelectedTool] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);

  const currentTool = tools[selectedTool];

  useEffect(() => {
    const showMessage = (index: number) => {
      if (index >= chatSequence.length) {
        setTimeout(() => {
          setVisibleMessages([]);
          setCurrentPhase(0);
          showMessage(0);
        }, 4000);
        return;
      }

      const message = chatSequence[index];

      if (message.type === "ai") {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setVisibleMessages((prev) => [...prev, index]);
          setCurrentPhase(index);
          showMessage(index + 1);
        }, 800);
      } else {
        setTimeout(
          () => {
            setVisibleMessages((prev) => [...prev, index]);
            setCurrentPhase(index);
            showMessage(index + 1);
          },
          message.delay - (index > 0 ? chatSequence[index - 1].delay : 0),
        );
      }
    };

    const timer = setTimeout(() => showMessage(0), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentTool.config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="how-it-works" className="py-20 sm:py-28 overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          {/* Glowing badge pill */}
          <div className="flex justify-center mb-6">
            <div className="group relative">
              {/* Border glow spot - top left */}
              <div
                className="absolute -top-px -left-px w-16 h-9 rounded-full blur-[1px]"
                style={{
                  background:
                    "radial-gradient(ellipse at top left, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 70%)",
                }}
              />
              {/* Border glow spot - bottom right */}
              <div
                className="absolute -bottom-px -right-px w-16 h-9 rounded-full blur-[1px]"
                style={{
                  background:
                    "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 30%, transparent 70%)",
                }}
              />

              {/* Subtle border all around */}
              <div className="absolute -inset-0.5 rounded-full border border-white/10" />

              {/* Main container */}
              <div className="relative inline-flex items-center px-4 py-2 rounded-full bg-surface/95 backdrop-blur-sm">
                {/* Inner glow - top left */}
                <div className="absolute top-0 left-0 w-16 h-10 bg-white/5 rounded-full blur-xl -translate-x-1/3 -translate-y-1/2" />
                {/* Inner glow - bottom right */}
                <div className="absolute bottom-0 right-0 w-16 h-10 bg-white/5 rounded-full blur-xl translate-x-1/3 translate-y-1/2" />

                {/* Text */}
                <span className="relative z-10 text-xs sm:text-sm text-foreground font-medium">
                  Setup
                </span>
              </div>
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4 tracking-tight leading-[1.1]">
            Get started in under two minutes
          </h2>
          <p className="text-base sm:text-lg text-foreground-muted max-w-2xl mx-auto">
            One config file is all it takes. Your AI remembers everything from
            there.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Config Panel */}
          <div className="order-2 lg:order-1">
            {/* Tool Tabs with Glass Effect - CTA style */}
            <div className="relative mb-4">
              {/* Border glow - top left (longer) */}
              <div
                className="absolute -top-px -left-px w-20 h-12 rounded-xl"
                style={{
                  background:
                    "radial-gradient(ellipse at top left, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 40%, transparent 70%)",
                }}
              />
              {/* Border glow - bottom right (longer) */}
              <div
                className="absolute -bottom-px -right-px w-20 h-12 rounded-xl"
                style={{
                  background:
                    "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 40%, transparent 70%)",
                }}
              />

              {/* Subtle border all around */}
              <div className="absolute -inset-px rounded-xl border border-white/[0.08]" />

              {/* Main tabs container */}
              <div className="relative flex p-1 bg-surface/80 backdrop-blur-md rounded-xl">
                {/* Inner glow - top left */}
                <div className="absolute top-0 left-0 w-20 h-12 bg-white/[0.03] rounded-xl blur-xl -translate-x-1/4 -translate-y-1/4 pointer-events-none" />
                {/* Inner glow - bottom right */}
                <div className="absolute bottom-0 right-0 w-20 h-12 bg-white/[0.02] rounded-xl blur-xl translate-x-1/4 translate-y-1/4 pointer-events-none" />

                {/* Animated sliding indicator - coral glassy like folder */}
                <div
                  className="absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-out overflow-hidden shadow-[0_4px_16px_rgba(232,97,60,0.25)]"
                  style={{
                    width: `calc((100% - 8px) / 3)`,
                    left: `calc(4px + ${selectedTool} * ((100% - 8px) / 3))`,
                    background:
                      "linear-gradient(135deg, rgba(232, 97, 60, 0.85) 0%, rgba(201, 78, 46, 0.75) 100%)",
                  }}
                >
                  {/* Glass shine overlay - top left radial */}
                  <div
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background:
                        "radial-gradient(ellipse at 20% 10%, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 40%, transparent 70%)",
                    }}
                  />
                  {/* Top edge glow - horizontal fade */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[1px]"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.25) 40%, rgba(255, 255, 255, 0.05) 100%)",
                    }}
                  />
                  {/* Left edge glow - vertical fade */}
                  <div
                    className="absolute top-0 left-0 bottom-0 w-[1px]"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.2) 40%, transparent 100%)",
                    }}
                  />
                </div>

                {tools.map((tool, index) => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setSelectedTool(index);
                      setCopied(false);
                    }}
                    className={`relative cursor-pointer flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 flex-1 justify-center z-10 ${
                      selectedTool === index
                        ? "text-foreground"
                        : "text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    <span className="relative z-10">{tool.icon}</span>
                    <span className="relative z-10 hidden sm:inline">
                      {tool.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Code Panel with Glass Effect */}
            <div className="relative">
              {/* Border glow - top left (longer) */}
              <div
                className="absolute -top-px -left-px w-24 h-16 rounded-xl"
                style={{
                  background:
                    "radial-gradient(ellipse at top left, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 40%, transparent 70%)",
                }}
              />
              {/* Border glow - bottom right (longer) */}
              <div
                className="absolute -bottom-px -right-px w-24 h-16 rounded-xl"
                style={{
                  background:
                    "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 40%, transparent 70%)",
                }}
              />

              {/* Main code container */}
              <div className="relative rounded-xl bg-surface/60 backdrop-blur-md border border-white/[0.08] shadow-lg shadow-black/20 overflow-hidden">
                {/* Inner glow overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent rounded-xl pointer-events-none" />

                {/* Code header */}
                <div className="relative px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-surface/40">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#FF5F56]"></span>
                      <span className="w-3 h-3 rounded-full bg-[#FFBD2E]"></span>
                      <span className="w-3 h-3 rounded-full bg-[#27CA40]"></span>
                    </div>
                    <span className="text-xs text-foreground-subtle font-mono ml-2">
                      {currentTool.fileName}
                    </span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`relative cursor-pointer flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all ${
                      copied
                        ? "text-accent"
                        : "text-foreground-subtle hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Code content - horizontally scrollable */}
                <div className="overflow-x-auto max-w-[85vw] sm:max-w-none">
                  <pre className="p-5 text-sm font-mono min-h-[180px]">
                    <code className="text-foreground/90 whitespace-pre">
                      {currentTool.config
                        .split("{{BLURRED_URL}}")
                        .map((part, i, arr) => (
                          <span key={i}>
                            {part}
                            {i < arr.length - 1 && (
                              <span className="relative inline-block group/url cursor-default">
                                <span className="blur-[4px] select-none text-foreground-muted">
                                  {HIDDEN_URL}
                                </span>
                                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/url:opacity-100 transition-opacity duration-200 pointer-events-none">
                                  <span className="bg-accent text-white text-xs px-2 py-0.5 rounded-md whitespace-nowrap font-sans">
                                    Coming Soon
                                  </span>
                                </span>
                              </span>
                            )}
                          </span>
                        ))}
                    </code>
                  </pre>
                </div>
              </div>
            </div>

            {/* Steps with Glass Number Indicators */}
            <div className="mt-8 space-y-2">
              {[
                {
                  num: "01",
                  text: `Add the config to your ${currentTool.name}`,
                },
                { num: "02", text: "Chat with your AI as usual" },
                {
                  num: "03",
                  text: "Context is saved and retrieved automatically",
                },
              ].map((step, i) => {
                const isActive = currentPhase >= i * 2;
                return (
                  <div key={step.num} className="relative">
                    {/* Sharp shiny border corners - top left */}
                    <div
                      className="absolute -top-[0.5px] -left-[0.5px] w-10 h-6 rounded-lg"
                      style={{
                        background:
                          "radial-gradient(ellipse at top left, rgba(255,255,255,0.9) 2%, rgba(255,255,255,0.12) 5%, transparent 70%)",
                      }}
                    />
                    {/* Sharp shiny border corners - bottom right */}
                    <div
                      className="absolute -bottom-[0.5px] -right-[0.5px] w-10 h-6 rounded-lg"
                      style={{
                        background:
                          "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.9) 2%, rgba(255,255,255,0.08) 5%, transparent 65%)",
                      }}
                    />

                    {/* Main card - compact */}
                    <div className="relative flex gap-3 items-center px-3 py-2.5 rounded-lg transition-all duration-500 bg-surface/15 border border-white/[0.1]">
                      {/* Glass number indicator */}
                      <div className="relative">
                        {/* Border glow - top left */}
                        <div
                          className="absolute -top-[0.5px] -left-[0.5px] w-4 h-4 rounded-md"
                          style={{
                            background: isActive
                              ? "radial-gradient(ellipse at top left, rgba(232,97,60,0.55) 0%, rgba(232,97,60,0.15) 20%, transparent 70%)"
                              : "radial-gradient(ellipse at top left, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 20%, transparent 70%)",
                          }}
                        />
                        <div
                          className={`relative w-8 h-8 rounded-md flex items-center justify-center text-xs font-mono transition-all duration-300 border ${
                            isActive
                              ? "bg-accent/15 text-accent border-accent/20"
                              : "bg-white/5 text-foreground-subtle border-white/[0.06]"
                          }`}
                        >
                          <span className="relative z-10">{step.num}</span>
                        </div>
                      </div>
                      <p
                        className={`relative z-10 text-sm transition-colors duration-300 ${
                          isActive ? "text-foreground" : "text-foreground-muted"
                        }`}
                      >
                        {step.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat Simulation Panel */}
          <div className="order-1 lg:order-2">
            <div className="relative">
              {/* Border glow - top left (longer, more realistic) */}
              <div
                className="absolute -top-px -left-px w-20 h-64 rounded-xl"
                style={{
                  background:
                    "radial-gradient(ellipse at top left, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 15%, transparent 65%)",
                }}
              />
              {/* Border glow - bottom right (longer, more realistic) */}
              <div
                className="absolute -bottom-px -right-px w-40 h-72 rounded-xl"
                style={{
                  background:
                    "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.12) 15%, transparent 65%)",
                }}
              />

              {/* Main chat container */}
              <div className="relative rounded-xl overflow-hidden bg-surface/60 backdrop-blur-md border border-white/[0.08] shadow-xl shadow-black/30">
                {/* Inner glow overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent rounded-xl pointer-events-none" />

                {/* Chat Header */}
                <div className="relative px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-surface/40">
                  <div className="flex items-center gap-3">
                    {/* Tool icon with glass effect - logo style */}
                    <div className="relative">
                      <div
                        className="absolute -top-[0.5px] -left-[0.5px] w-5 h-5 rounded-lg blur-[0.5px]"
                        style={{
                          background:
                            "radial-gradient(ellipse at top left, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.4) 30%, transparent 60%)",
                        }}
                      />
                      <div className="relative w-8 h-8 rounded-lg bg-surface/80 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 via-transparent to-transparent" />
                        <span className="relative z-10">
                          {currentTool.icon}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium">
                        {currentTool.name}
                      </span>
                      <span className="text-xs text-foreground-subtle ml-1.5">
                        · MemContext
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Circle className="w-2 h-2 fill-accent text-accent" />
                    <span className="text-xs text-foreground-subtle">
                      Active
                    </span>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="relative p-4 min-h-[320px] sm:min-h-[360px] flex flex-col gap-3">
                  {/* Subtle gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface/30 pointer-events-none" />

                  {chatSequence.map((message, index) => {
                    const isVisible = visibleMessages.includes(index);
                    if (!isVisible) return null;

                    if (message.type === "system") {
                      return (
                        <div
                          key={index}
                          className="flex justify-center animate-fade-in relative z-10"
                        >
                          <div
                            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono backdrop-blur-sm ${
                              message.action === "save"
                                ? "bg-accent/10 text-accent border border-accent/20"
                                : "bg-white/5 text-foreground-muted border border-white/10"
                            }`}
                          >
                            {message.action === "save" ? (
                              <Bookmark className="w-3 h-3" />
                            ) : (
                              <ArrowDownToLine className="w-3 h-3" />
                            )}
                            <span>{message.content}</span>
                          </div>
                        </div>
                      );
                    }

                    if (message.type === "user") {
                      return (
                        <div
                          key={index}
                          className="flex justify-end animate-slide-in-right relative z-10"
                        >
                          <div className="max-w-[85%]">
                            <div className="bg-foreground text-background px-3.5 py-2.5 rounded-xl rounded-tr-sm text-sm">
                              {message.content}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={index}
                        className="flex justify-start animate-slide-in-left relative z-10"
                      >
                        <div className="flex gap-2.5 max-w-[85%]">
                          {/* AI avatar */}
                          <div className="w-6 h-6 rounded-md bg-surface-elevated border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                            {selectedTool === 0 && <Claude.Color size={14} />}
                            {selectedTool === 1 && <Cursor size={14} />}
                            {selectedTool === 2 && <OpenAI size={14} />}
                          </div>
                          {/* AI message bubble */}
                          <div className="bg-surface/80 backdrop-blur-sm px-3.5 py-2.5 rounded-xl rounded-tl-sm text-sm text-foreground border border-white/[0.06]">
                            {message.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex justify-start animate-fade-in relative z-10">
                      <div className="flex gap-2.5">
                        {/* AI avatar */}
                        <div className="w-6 h-6 rounded-md bg-surface-elevated border border-white/10 flex items-center justify-center shrink-0">
                          {selectedTool === 0 && <Claude.Color size={14} />}
                          {selectedTool === 1 && <Cursor size={14} />}
                          {selectedTool === 2 && <OpenAI size={14} />}
                        </div>
                        {/* Typing bubble */}
                        <div className="bg-surface/80 backdrop-blur-sm px-4 py-3 rounded-xl rounded-tl-sm border border-white/[0.06]">
                          <div className="flex gap-1">
                            <span
                              className="w-1.5 h-1.5 bg-foreground-subtle rounded-full animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            ></span>
                            <span
                              className="w-1.5 h-1.5 bg-foreground-subtle rounded-full animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            ></span>
                            <span
                              className="w-1.5 h-1.5 bg-foreground-subtle rounded-full animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            ></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="px-4 py-3 border-t border-white/[0.08] bg-surface/40">
                  <div className="flex items-center gap-2 px-3 py-2 bg-surface/60 backdrop-blur-sm rounded-lg border border-white/[0.08]">
                    <span className="text-sm text-foreground-subtle flex-1">
                      Message...
                    </span>
                    <button className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center hover:bg-accent/90 transition-colors">
                      <IoSend className="w-4 ml-1 h-4 -rotate-45 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Memory indicator */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-foreground-subtle">
              <span className="w-1.5 h-1.5 rounded-full bg-accent/60"></span>
              <span>Memories persist across sessions automatically</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
