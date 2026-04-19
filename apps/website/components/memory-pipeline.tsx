"use client";

import dynamic from "next/dynamic";
import { ClassificationChart } from "./classification-chart";

const NeuralGlobe = dynamic(
  () => import("./neural-globe").then((m) => m.NeuralGlobe),
  { ssr: false },
);

function FadedSubCard({
  className,
  children,
  fadeSide = "left",
}: {
  className?: string;
  children: React.ReactNode;
  /** Which vertical edge fades out completely (no border drawn there) */
  fadeSide?: "left" | "right";
}) {
  // Border mask — top + bottom hairlines stay solid, one vertical edge fades out
  const borderMask =
    fadeSide === "left"
      ? `linear-gradient(to left, black 0%, black 35%, transparent 100%)`
      : `linear-gradient(to right, black 0%, black 35%, transparent 100%)`;

  // Background — direct white-tint gradient (no mask) so it dissolves seamlessly into the page bg.
  // Asymmetric: peaks at the kept side, ramps down to fully transparent at the faded side.
  const bgGradient =
    fadeSide === "left"
      ? // Left card: brightest on the right, fades to transparent on the left
        `linear-gradient(to left,
          rgba(255,255,255,0.025) 0%,
          rgba(255,255,255,0.024) 15%,
          rgba(255,255,255,0.022) 30%,
          rgba(255,255,255,0.018) 45%,
          rgba(255,255,255,0.012) 60%,
          rgba(255,255,255,0.007) 75%,
          rgba(255,255,255,0.003) 88%,
          rgba(255,255,255,0) 100%
        )`
      : // Right card: brightest on the left, fades to transparent on the right
        `linear-gradient(to right,
          rgba(255,255,255,0.025) 0%,
          rgba(255,255,255,0.024) 15%,
          rgba(255,255,255,0.022) 30%,
          rgba(255,255,255,0.018) 45%,
          rgba(255,255,255,0.012) 60%,
          rgba(255,255,255,0.007) 75%,
          rgba(255,255,255,0.003) 88%,
          rgba(255,255,255,0) 100%
        )`;

  return (
    <div className={`relative rounded-2xl overflow-hidden ${className ?? ""}`}>
      {/* Background — gradient tint that dissolves seamlessly into the page bg */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ background: bgGradient }}
      />
      {/* Border — masked: kept side + top/bottom solid, faded side dissolves */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none z-30 border border-white/10"
        style={{
          WebkitMaskImage: borderMask,
          maskImage: borderMask,
        }}
      />
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}

function SavePipelineCard() {
  return (
    <div className="absolute top-6 left-4 sm:top-16 sm:-left-6 z-20 w-[calc(100%-2rem)] sm:w-[340px] max-w-[360px]">
      <div className="relative rounded-xl bg-surface-elevated/95 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-foreground">
            Save Pipeline
          </h3>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-pulse-subtle absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            Live
          </span>
        </div>

        {/* Steps divider */}
        <p className="font-mono text-[9px] uppercase tracking-widest text-foreground-subtle mb-4">
          Steps
        </p>

        {/* Step 1 */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-[10px] text-foreground-subtle tracking-wider">
              01
            </span>
            <h4 className="text-[13px] font-semibold text-foreground">
              Expand + Classify
            </h4>
            <span className="text-[10px] text-foreground-subtle ml-auto">
              2s ago
            </span>
          </div>
          <div className="space-y-1 pl-6">
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              &ndash; LLM rewrites content for searchability
            </p>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              &ndash; Routes to permanent / short / medium / long buckets
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-[10px] text-foreground-subtle tracking-wider">
              02
            </span>
            <h4 className="text-[13px] font-semibold text-foreground">
              Auto-TTL
            </h4>
            <span className="text-[10px] text-foreground-subtle ml-auto">
              just now
            </span>
          </div>
          <div className="space-y-1 pl-6">
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              &ndash; Temporal content gets automatic expiry
            </p>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              &ndash; Permanent facts stay forever
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-[10px] text-foreground-subtle tracking-wider">
              03
            </span>
            <h4 className="text-[13px] font-semibold text-foreground">
              Dedup + Version
            </h4>
            <span className="text-[10px] text-foreground-subtle ml-auto">
              processing
            </span>
          </div>
          <div className="space-y-1 pl-6">
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              &ndash; Detects duplicates and contradictions
            </p>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              &ndash; Old versions preserved, latest truth first
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MemoryPipeline() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header — identical to original */}
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

        {/* Save Panel — top-fading border frame, no card fill */}
        <div className="relative mb-4 pt-6">
          {/* Top-only border that fades out on left and right */}
          <div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{
              background:
                "linear-gradient(to right, transparent 0%, rgba(255,255,255,0.12) 20%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.12) 80%, transparent 100%)",
            }}
          />
          {/* Soft top vignette glow under the border */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at top, rgba(255,255,255,0.04) 0%, transparent 70%)",
            }}
          />

          {/* Mobile: static card only */}
          <div className="block sm:hidden relative z-10 p-4">
            <SavePipelineCardInline />
          </div>

          {/* Tablet (sm-lg): chart sub-card + overlay points card */}
          <div className="hidden sm:block lg:hidden relative">
            <FadedSubCard className="min-h-[460px]">
              <ClassificationChart />
            </FadedSubCard>
            <SavePipelineCard />
          </div>

          {/* Desktop: chart sub-card + globe sub-card side-by-side, points card overlays both */}
          <div className="hidden lg:block relative">
            <div className="grid grid-cols-12 gap-4">
              <FadedSubCard
                fadeSide="left"
                className="col-span-7 min-h-[460px]"
              >
                <ClassificationChart />
              </FadedSubCard>
              <FadedSubCard
                fadeSide="right"
                className="col-span-5 min-h-[460px] flex items-center justify-center"
              >
                <NeuralGlobe />
              </FadedSubCard>
            </div>
            {/* Points card floats absolutely over the chart card on the left */}
            <SavePipelineCard />
          </div>
        </div>

        {/* Search Pipeline — full bordered rectangle with bracket corners */}
        <div className="relative pb-6">
          <SearchCard />
          {/* Bottom hairline that fades on left and right — mirrors the top one above the Save panel */}
          <div
            className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
            style={{
              background:
                "linear-gradient(to right, transparent 0%, rgba(255,255,255,0.12) 20%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.12) 80%, transparent 100%)",
            }}
          />
          {/* Soft bottom vignette glow under the hairline */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-24 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at bottom, rgba(255,255,255,0.04) 0%, transparent 70%)",
            }}
          />
        </div>
      </div>
    </section>
  );
}

const searchSteps = [
  {
    title: "Hybrid Retrieval",
    description:
      "Vector similarity + keyword matching + query variants, fused via Reciprocal Rank Fusion.",
  },
  {
    title: "Temporal Filter",
    description:
      "Expired memories are excluded automatically. Only current, valid knowledge surfaces.",
  },
  {
    title: "Feedback Scoring",
    description:
      "Memories marked wrong drop. Helpful ones rise. Your signals shape every result.",
  },
];

function SearchCard() {
  // Border mask — keep tight, top/bottom hairlines stay anchored, sides fade out
  const borderMask = `linear-gradient(to right,
    transparent 0%,
    rgba(0,0,0,0.3) 12%,
    rgba(0,0,0,0.7) 22%,
    black 32%,
    black 68%,
    rgba(0,0,0,0.7) 78%,
    rgba(0,0,0,0.3) 88%,
    transparent 100%
  )`;

  // Background — use a faint white tint (not bg-surface) gradient directly. Because the page
  // bg is near-black and the tint is also near-black, an opacity ramp dissolves invisibly.
  // Two-sided cosine-shaped ramp via many small stops.
  const bgGradient = `linear-gradient(to right,
    rgba(255,255,255,0) 0%,
    rgba(255,255,255,0.003) 10%,
    rgba(255,255,255,0.008) 20%,
    rgba(255,255,255,0.015) 30%,
    rgba(255,255,255,0.022) 40%,
    rgba(255,255,255,0.025) 50%,
    rgba(255,255,255,0.022) 60%,
    rgba(255,255,255,0.015) 70%,
    rgba(255,255,255,0.008) 80%,
    rgba(255,255,255,0.003) 90%,
    rgba(255,255,255,0) 100%
  )`;

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Background fill — gradient tint that dissolves seamlessly */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ background: bgGradient }}
      />
      {/* Border — top + bottom hairlines, left/right fade out */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none z-30 border border-white/10"
        style={{
          WebkitMaskImage: borderMask,
          maskImage: borderMask,
        }}
      />

      <div className="relative z-10 p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <h3 className="text-xl font-semibold text-foreground">
            Search Pipeline
          </h3>
          <span className="font-mono text-sm uppercase tracking-widest text-foreground-subtle">
            · what happens when you search
          </span>
        </div>

        {/* Steps */}
        <div className="space-y-5">
          {searchSteps.map((step, i) => (
            <div key={step.title}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-[10px] text-foreground-subtle tracking-wider">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h4 className="text-[13px] font-semibold text-foreground">
                  {step.title}
                </h4>
              </div>
              <p className="text-[11px] text-foreground-muted leading-relaxed pl-6">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SavePipelineCardInline() {
  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-foreground">Save Pipeline</h3>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-pulse-subtle absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          Live
        </span>
      </div>

      <p className="font-mono text-[9px] uppercase tracking-widest text-foreground-subtle mb-4">
        Steps
      </p>

      {/* Step 1 */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="font-mono text-[10px] text-foreground-subtle tracking-wider">
            01
          </span>
          <h4 className="text-[13px] font-semibold text-foreground">
            Expand + Classify
          </h4>
          <span className="text-[10px] text-foreground-subtle ml-auto">
            2s ago
          </span>
        </div>
        <div className="space-y-1 pl-6">
          <p className="text-[11px] text-foreground-muted leading-relaxed">
            &ndash; LLM rewrites content for searchability
          </p>
          <p className="text-[11px] text-foreground-muted leading-relaxed">
            &ndash; Routes to permanent / short / medium / long buckets
          </p>
        </div>
      </div>

      {/* Step 2 */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="font-mono text-[10px] text-foreground-subtle tracking-wider">
            02
          </span>
          <h4 className="text-[13px] font-semibold text-foreground">
            Auto-TTL
          </h4>
          <span className="text-[10px] text-foreground-subtle ml-auto">
            just now
          </span>
        </div>
        <div className="space-y-1 pl-6">
          <p className="text-[11px] text-foreground-muted leading-relaxed">
            &ndash; Temporal content gets automatic expiry
          </p>
          <p className="text-[11px] text-foreground-muted leading-relaxed">
            &ndash; Permanent facts stay forever
          </p>
        </div>
      </div>

      {/* Step 3 */}
      <div>
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="font-mono text-[10px] text-foreground-subtle tracking-wider">
            03
          </span>
          <h4 className="text-[13px] font-semibold text-foreground">
            Dedup + Version
          </h4>
          <span className="text-[10px] text-foreground-subtle ml-auto">
            processing
          </span>
        </div>
        <div className="space-y-1 pl-6">
          <p className="text-[11px] text-foreground-muted leading-relaxed">
            &ndash; Detects duplicates and contradictions
          </p>
          <p className="text-[11px] text-foreground-muted leading-relaxed">
            &ndash; Old versions preserved, latest truth first
          </p>
        </div>
      </div>
    </div>
  );
}
