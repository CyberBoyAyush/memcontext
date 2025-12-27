"use client";

import { useState, useEffect, ReactNode } from "react";
import { Copy, Check, Bookmark, ArrowDownToLine, Circle } from "lucide-react";
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
    icon: <Claude.Color size={18} />,
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
  { type: "user", content: "I prefer using Tailwind CSS for styling", delay: 0 },
  { type: "system", content: "Memory saved", action: "save", delay: 1200 },
  { type: "ai", content: "Got it! I'll remember that preference.", delay: 1800 },
  { type: "user", content: "Build me a card component", delay: 4000 },
  { type: "system", content: "Retrieved: styling preferences", action: "retrieve", delay: 5200 },
  { type: "ai", content: "Here's a card using Tailwind CSS, since that's your preference:", delay: 5800 },
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
          setVisibleMessages(prev => [...prev, index]);
          setCurrentPhase(index);
          showMessage(index + 1);
        }, 800);
      } else {
        setTimeout(() => {
          setVisibleMessages(prev => [...prev, index]);
          setCurrentPhase(index);
          showMessage(index + 1);
        }, message.delay - (index > 0 ? chatSequence[index - 1].delay : 0));
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
    <section id="how-it-works" className="py-20 sm:py-28 bg-surface-elevated overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4">
            Get started in 2 minutes
          </h2>
          <p className="text-base sm:text-lg text-foreground-muted">
            Add to your config. That&apos;s it.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Config Panel */}
          <div className="order-2 lg:order-1">
            {/* Tool Tabs */}
            <div className="flex gap-1 p-1 bg-surface-elevated rounded-lg border border-border mb-4">
              {tools.map((tool, index) => (
                <button
                  key={tool.id}
                  onClick={() => {
                    setSelectedTool(index);
                    setCopied(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex-1 justify-center ${
                    selectedTool === index
                      ? "bg-background text-foreground shadow-sm"
                      : "text-foreground-muted hover:text-foreground hover:bg-background/50"
                  }`}
                >
                  {tool.icon}
                  <span className="hidden sm:inline">{tool.name}</span>
                </button>
              ))}
            </div>

            <div className="border border-border rounded-xl overflow-hidden bg-background shadow-sm hover:shadow-md transition-all duration-300">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-code-bg">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-foreground/10"></span>
                    <span className="w-3 h-3 rounded-full bg-foreground/10"></span>
                    <span className="w-3 h-3 rounded-full bg-foreground/10"></span>
                  </div>
                  <span className="text-xs text-foreground-subtle font-mono ml-2">
                    {currentTool.fileName}
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-foreground-subtle hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-foreground/5"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-success" />
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
              <pre className="p-5 text-sm font-mono overflow-x-auto bg-code-bg min-h-[180px]">
                <code className="text-foreground whitespace-pre-wrap">
                  {currentTool.config.split("{{BLURRED_URL}}").map((part, i, arr) => (
                    <span key={i}>
                      {part}
                      {i < arr.length - 1 && (
                        <span className="relative inline-block group/url cursor-default">
                          <span className="blur-[4px] select-none text-foreground-muted">
                            {HIDDEN_URL}
                          </span>
                          <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/url:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <span className="bg-foreground text-background text-xs px-2 py-0.5 rounded whitespace-nowrap">
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

            {/* Steps */}
            <div className="mt-8 space-y-4">
              {[
                { num: "01", text: `Add the config to your ${currentTool.name}` },
                { num: "02", text: "Chat with your AI as usual" },
                { num: "03", text: "Context is saved and retrieved automatically" },
              ].map((step, i) => (
                <div
                  key={step.num}
                  className={`flex gap-4 items-center p-3 rounded-lg transition-all duration-500 ${
                    currentPhase >= i * 2 ? "bg-foreground/5 translate-x-1" : ""
                  }`}
                >
                  <span className={`font-mono text-sm w-8 shrink-0 transition-colors duration-300 ${
                    currentPhase >= i * 2 ? "text-foreground" : "text-foreground-subtle"
                  }`}>
                    {step.num}
                  </span>
                  <p className={`text-sm transition-colors duration-300 ${
                    currentPhase >= i * 2 ? "text-foreground" : "text-foreground-muted"
                  }`}>
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Simulation Panel */}
          <div className="order-1 lg:order-2">
            <div className="border border-border rounded-xl overflow-hidden bg-background shadow-lg">
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-border bg-code-bg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-border flex items-center justify-center">
                    {currentTool.icon}
                  </div>
                  <div>
                    <span className="text-sm font-medium">{currentTool.name}</span>
                    <span className="text-xs text-foreground-subtle ml-1.5">· MemContext</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Circle className="w-2 h-2 fill-success text-success" />
                  <span className="text-xs text-foreground-subtle">Active</span>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="p-4 min-h-[320px] sm:min-h-[360px] flex flex-col gap-3 bg-gradient-to-b from-background to-surface-elevated/30">
                {chatSequence.map((message, index) => {
                  const isVisible = visibleMessages.includes(index);
                  if (!isVisible) return null;

                  if (message.type === "system") {
                    return (
                      <div
                        key={index}
                        className="flex justify-center animate-fade-in"
                      >
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono ${
                          message.action === "save"
                            ? "bg-success/8 text-success border border-success/20"
                            : "bg-foreground/5 text-foreground-muted border border-border"
                        }`}>
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
                        className="flex justify-end animate-slide-in-right"
                      >
                        <div className="max-w-[85%] bg-foreground text-background px-3.5 py-2.5 rounded-xl rounded-tr-sm text-sm">
                          {message.content}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={index}
                      className="flex justify-start animate-slide-in-left"
                    >
                      <div className="flex gap-2.5 max-w-[85%]">
                        <div className="w-6 h-6 rounded-md bg-surface-elevated border border-border flex items-center justify-center shrink-0 mt-0.5">
                          {selectedTool === 0 && <Claude.Color size={14} />}
                          {selectedTool === 1 && <Cursor size={14} />}
                          {selectedTool === 2 && <OpenAI size={14} />}
                        </div>
                        <div className="bg-surface-elevated px-3.5 py-2.5 rounded-xl rounded-tl-sm text-sm text-foreground">
                          {message.content}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="flex gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-surface-elevated border border-border flex items-center justify-center shrink-0">
                        {selectedTool === 0 && <Claude.Color size={14} />}
                        {selectedTool === 1 && <Cursor size={14} />}
                        {selectedTool === 2 && <OpenAI size={14} />}
                      </div>
                      <div className="bg-surface-elevated px-4 py-3 rounded-xl rounded-tl-sm">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-foreground-subtle rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                          <span className="w-1.5 h-1.5 bg-foreground-subtle rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                          <span className="w-1.5 h-1.5 bg-foreground-subtle rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="px-4 py-3 border-t border-border bg-code-bg">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-background rounded-lg border border-border">
                  <span className="text-sm text-foreground-subtle flex-1">Message...</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-surface-elevated text-foreground-subtle rounded border border-border">↵</kbd>
                </div>
              </div>
            </div>

            {/* Memory indicator */}
            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-foreground-subtle">
              <span className="w-1 h-1 rounded-full bg-foreground-subtle"></span>
              <span>Memories persist across sessions automatically</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
