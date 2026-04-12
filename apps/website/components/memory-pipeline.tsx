"use client";

import {
  Sparkles,
  Clock,
  GitBranch,
  Search,
  ThumbsUp,
  Timer,
} from "lucide-react";

const saveSteps = [
  {
    icon: Sparkles,
    title: "Expand + Classify",
    description:
      "LLM rewrites for searchability and classifies as permanent, short-term, medium-term, or long-term.",
  },
  {
    icon: Timer,
    title: "Auto-TTL",
    description:
      "Temporal content gets an automatic expiry. Permanent facts stay forever. No manual tagging needed.",
  },
  {
    icon: GitBranch,
    title: "Dedup + Version",
    description:
      "Detects duplicates, contradictions, and extensions. Old versions are preserved, new truth surfaces first.",
  },
];

const searchSteps = [
  {
    icon: Search,
    title: "Hybrid Search",
    description:
      "Vector similarity + keyword matching + query variants, all fused with Reciprocal Rank Fusion.",
  },
  {
    icon: Clock,
    title: "Temporal Filter",
    description:
      "Expired memories are excluded automatically. Only current, valid knowledge surfaces.",
  },
  {
    icon: ThumbsUp,
    title: "Feedback Scoring",
    description:
      "Memories marked wrong drop to the bottom. Helpful ones rise. Your signals shape every result.",
  },
];

export function MemoryPipeline() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <div className="flex justify-center mb-6">
            <div className="group relative">
              <div className="absolute -inset-0.5 rounded-full border border-white/10" />
              <div className="relative inline-flex items-center px-4 py-2 rounded-full bg-surface/95 backdrop-blur-sm">
                <span className="relative z-10 text-xs sm:text-sm text-foreground font-medium">
                  Under the Hood
                </span>
              </div>
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4 tracking-tight leading-[1.1]">
            Memory that evolves, not just stores
          </h2>
          <p className="text-base sm:text-lg text-foreground-muted max-w-2xl mx-auto">
            Every save is classified. Every search is fused. Every signal
            matters.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Save Pipeline */}
          <div className="relative">
            <div
              className="absolute -top-px -left-px w-20 h-14 rounded-2xl"
              style={{
                background:
                  "radial-gradient(ellipse at top left, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.15) 35%, transparent 65%)",
              }}
            />
            <div
              className="absolute -bottom-px -right-px w-20 h-14 rounded-2xl"
              style={{
                background:
                  "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.1) 35%, transparent 65%)",
              }}
            />
            <div className="relative rounded-2xl bg-surface/40 backdrop-blur-md border border-white/[0.08] p-6 sm:p-8 h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent rounded-2xl pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <span className="px-2 py-1 rounded-md text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                    Save
                  </span>
                  <span className="text-sm text-foreground-muted">
                    What happens when you save a memory
                  </span>
                </div>

                <div className="space-y-6">
                  {saveSteps.map((step, index) => (
                    <div key={step.title} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center shrink-0">
                          <step.icon className="w-5 h-5 text-accent" />
                        </div>
                        {index < saveSteps.length - 1 && (
                          <div className="w-px h-full bg-gradient-to-b from-accent/20 to-transparent mt-2" />
                        )}
                      </div>
                      <div className="pb-2">
                        <h4 className="text-sm font-semibold text-foreground mb-1">
                          {step.title}
                        </h4>
                        <p className="text-xs text-foreground-muted leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Search Pipeline */}
          <div className="relative">
            <div
              className="absolute -top-px -left-px w-20 h-14 rounded-2xl"
              style={{
                background:
                  "radial-gradient(ellipse at top left, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.15) 35%, transparent 65%)",
              }}
            />
            <div
              className="absolute -bottom-px -right-px w-20 h-14 rounded-2xl"
              style={{
                background:
                  "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.1) 35%, transparent 65%)",
              }}
            />
            <div className="relative rounded-2xl bg-surface/40 backdrop-blur-md border border-white/[0.08] p-6 sm:p-8 h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent rounded-2xl pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <span className="px-2 py-1 rounded-md text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                    Search
                  </span>
                  <span className="text-sm text-foreground-muted">
                    What happens when you search
                  </span>
                </div>

                <div className="space-y-6">
                  {searchSteps.map((step, index) => (
                    <div key={step.title} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
                          <step.icon className="w-5 h-5 text-blue-400" />
                        </div>
                        {index < searchSteps.length - 1 && (
                          <div className="w-px h-full bg-gradient-to-b from-blue-500/20 to-transparent mt-2" />
                        )}
                      </div>
                      <div className="pb-2">
                        <h4 className="text-sm font-semibold text-foreground mb-1">
                          {step.title}
                        </h4>
                        <p className="text-xs text-foreground-muted leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
