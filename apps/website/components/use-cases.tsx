"use client";

import { ArrowRight } from "lucide-react";
import { Cube, PenNib, SquaresFour } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { GrTopCorner } from "react-icons/gr";

interface UseCaseProps {
  icon: Icon;
  title: string;
  description: string;
  examples: string[];
  cta: string;
  href: string;
}

const useCases: UseCaseProps[] = [
  {
    icon: Cube,
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
    icon: PenNib,
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
    icon: SquaresFour,
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

function UseCaseCard({ useCase }: { useCase: UseCaseProps }) {
  return (
    <div className="relative group h-full">
      {/* Bracketed tile — holds all content including CTA */}
      <div className="relative h-full rounded-xl border border-white/10 bg-border-hover/30 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-background/80 rounded-xl border border-white/10 m-2">
          <GrTopCorner className="absolute top-2 left-2 w-4 h-4 text-foreground-muted z-10" />
          <GrTopCorner className="absolute top-2 right-2 w-4 h-4 text-foreground-muted rotate-90 z-10" />
          <GrTopCorner className="absolute bottom-2 right-2 w-4 h-4 text-foreground-muted rotate-180 z-10" />
          <GrTopCorner className="absolute bottom-2 left-2 w-4 h-4 text-foreground-muted -rotate-90 z-10" />
        </div>

        <div className="relative p-7 sm:p-8 flex flex-col h-full min-h-[340px]">
          <useCase.icon weight="duotone" className="w-7 h-7 mb-7 text-accent" />

          <h3 className="text-lg font-semibold text-foreground mb-2">
            {useCase.title}
          </h3>

          <p className="text-sm text-foreground-muted leading-relaxed mb-4">
            {useCase.description}
          </p>

          <div className="space-y-2 mb-6 flex-1">
            {useCase.examples.map((example) => (
              <div key={example} className="flex items-center gap-2 text-xs">
                <span className="w-1 h-1 rounded-full bg-accent/60 shrink-0" />
                <span className="text-foreground-subtle">{example}</span>
              </div>
            ))}
          </div>

          <a
            href={useCase.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent/80 transition-colors w-fit"
          >
            {useCase.cta}
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

export function UseCases() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          {/* Glowing badge pill — matches Features / Pricing / FAQ sections */}
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

        <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
          {useCases.map((useCase) => (
            <UseCaseCard key={useCase.title} useCase={useCase} />
          ))}
        </div>
      </div>
    </section>
  );
}
