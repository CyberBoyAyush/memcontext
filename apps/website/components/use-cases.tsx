"use client";

import { Code2, PenTool, Blocks, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface UseCaseProps {
  icon: LucideIcon;
  title: string;
  description: string;
  examples: string[];
  cta: string;
  href: string;
}

const useCases: UseCaseProps[] = [
  {
    icon: Code2,
    title: "AI Coding Assistants",
    description:
      "Connect via MCP. Your preferences, decisions, and project context persist across every session and every tool.",
    examples: [
      "Prefers TypeScript and pnpm",
      "Chose PostgreSQL for the DB",
      "Uses kebab-case filenames",
    ],
    cta: "Set up MCP",
    href: "https://app.memcontext.in/mcp",
  },
  {
    icon: PenTool,
    title: "Content Generation",
    description:
      "Store evolving strategies with auto-TTL. Expired tactics drop out. Current best practices surface first.",
    examples: [
      "Carousel posts work right now",
      "Old poll strategy auto-expired",
      "Post feedback shapes ranking",
    ],
    cta: "Read the guide",
    href: "https://docs.memcontext.in/guides/evolving-memory",
  },
  {
    icon: Blocks,
    title: "Custom Applications",
    description:
      "Use the REST API to build memory into any app. CRM context, support bots, onboarding flows, personalization.",
    examples: [
      "Profile endpoint for fast context",
      "Feedback API for learning loops",
      "Version history for audit trails",
    ],
    cta: "View API docs",
    href: "https://docs.memcontext.in/api-reference/overview",
  },
];

export function UseCases() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <div className="flex justify-center mb-6">
            <div className="group relative">
              <div className="absolute -inset-0.5 rounded-full border border-white/10" />
              <div className="relative inline-flex items-center px-4 py-2 rounded-full bg-surface/95 backdrop-blur-sm">
                <span className="relative z-10 text-xs sm:text-sm text-foreground font-medium">
                  Use Cases
                </span>
              </div>
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4 tracking-tight leading-[1.1]">
            One memory layer, any application
          </h2>
          <p className="text-base sm:text-lg text-foreground-muted max-w-2xl mx-auto">
            MemContext is infrastructure. Plug it into coding tools, content
            workflows, or your own product.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
          {useCases.map((useCase) => (
            <div key={useCase.title} className="relative group">
              <div
                className="absolute -top-px -left-px w-16 h-12 rounded-2xl"
                style={{
                  background:
                    "radial-gradient(ellipse at top left, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.15) 35%, transparent 65%)",
                }}
              />
              <div
                className="absolute -bottom-px -right-px w-16 h-12 rounded-2xl"
                style={{
                  background:
                    "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.1) 35%, transparent 65%)",
                }}
              />

              <div className="relative rounded-2xl bg-surface/40 backdrop-blur-md border border-white/[0.08] p-6 h-full flex flex-col group-hover:border-white/[0.12] transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent rounded-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center mb-4">
                    <useCase.icon className="w-5 h-5 text-accent" />
                  </div>

                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {useCase.title}
                  </h3>

                  <p className="text-sm text-foreground-muted leading-relaxed mb-4">
                    {useCase.description}
                  </p>

                  <div className="space-y-2 mb-6 flex-1">
                    {useCase.examples.map((example) => (
                      <div
                        key={example}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className="w-1 h-1 rounded-full bg-accent/60 shrink-0" />
                        <span className="text-foreground-subtle">
                          {example}
                        </span>
                      </div>
                    ))}
                  </div>

                  <a
                    href={useCase.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
                  >
                    {useCase.cta}
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
