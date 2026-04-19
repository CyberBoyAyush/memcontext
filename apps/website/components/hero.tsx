"use client";

import { ArrowRight, Sparkles } from "lucide-react";
// import { HeroCards } from "./hero-cards"; // temporarily hidden — swapped for dashboard preview
// import { HeroDashboard } from "./hero-dashboard"; // temporarily hidden — swapped for memory tower
import { HeroMemoryTower } from "./hero-memory-tower";
import { HeroShader } from "./hero-shader";
import { TrustBlock } from "./trust-block";

export function Hero() {
  return (
    <section className="pt-20 pb-8 sm:pt-24 sm:pb-12 lg:pt-24 lg:pb-16 min-h-screen flex flex-col relative overflow-hidden">
      {/* Atmospheric WebGL shader - domain-warped fBm embers.
          Masked top + bottom so the canvas fades into the page background
          instead of ending in a hard rectangle at the section edge. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 78%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 78%, transparent 100%)",
        }}
      >
        <HeroShader />
      </div>

      {/* Warm radial vignette — section-level so the glow bleeds freely into
          the surrounding content instead of clipping at the illustration's
          flex container. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-56 top-1/4"
        style={{
          background:
            "radial-gradient(1200px 400px at 50% 60%, rgba(169,67,42,0.28), transparent 65%)",
        }}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 relative z-10">
        <div className="text-center">
          {/* Glowing badge — refined glass pill with gradient ring */}
          <div className="animate-fade-in opacity-0 flex justify-center mb-4 sm:mb-4">
            <div className="group relative">
              {/* Outer ambient glow — very soft, accent-tinted */}
              <div
                aria-hidden
                className="absolute -inset-4 rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(232,97,60,0.25) 0%, rgba(255,255,255,0.04) 40%, transparent 70%)",
                }}
              />

              {/* Gradient ring — uses padding trick for a crisp 1px conic border */}
              <div
                className="relative rounded-full p-[1px]"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 35%, rgba(232,97,60,0.15) 65%, rgba(255,255,255,0.12) 100%)",
                }}
              >
                {/* Main pill */}
                <div
                  className="relative inline-flex items-center gap-2 sm:gap-2.5 pl-1 pr-3 sm:pr-4 py-1 rounded-full overflow-hidden cursor-default transition-all duration-300"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(24,24,24,0.95) 0%, rgba(14,14,14,0.95) 100%)",
                    boxShadow: [
                      "inset 0 1px 0 rgba(255,255,255,0.06)",
                      "inset 0 -1px 0 rgba(0,0,0,0.4)",
                      "0 2px 8px rgba(0,0,0,0.4)",
                    ].join(", "),
                  }}
                >
                  {/* Top specular sheen */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-px"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
                    }}
                  />

                  {/* Icon bubble — spherical with inner gradient + highlight */}
                  <div className="relative shrink-0 z-10">
                    {/* accent halo under the bubble */}
                    <div
                      aria-hidden
                      className="absolute inset-0 rounded-full blur-md opacity-70"
                      style={{
                        background:
                          "radial-gradient(circle at 30% 30%, rgba(232,97,60,0.35) 0%, transparent 70%)",
                      }}
                    />
                    <div
                      className="relative w-7 h-7 rounded-full flex items-center justify-center"
                      style={{
                        background:
                          "linear-gradient(145deg, #2a2a2a 0%, #151515 55%, #0a0a0a 100%)",
                        boxShadow: [
                          "inset 0 1px 0 rgba(255,255,255,0.12)",
                          "inset 0 -1px 0 rgba(0,0,0,0.5)",
                          "0 1px 2px rgba(0,0,0,0.4)",
                        ].join(", "),
                      }}
                    >
                      {/* top-left highlight */}
                      <div
                        aria-hidden
                        className="absolute top-0 left-1/4 w-3 h-1.5 rounded-full blur-[2px]"
                        style={{
                          background:
                            "radial-gradient(ellipse, rgba(255,255,255,0.35) 0%, transparent 70%)",
                        }}
                      />
                      <Sparkles className="relative w-3.5 h-3.5 text-[#e8613c]" />
                    </div>
                  </div>

                  {/* Text */}
                  <span className="relative z-10 text-xs sm:text-sm text-foreground/95 font-medium tracking-tight">
                    Persistent, evolving memory for AI
                  </span>
                </div>
              </div>
            </div>
          </div>

          <h1 className="animate-fade-in opacity-0 animation-delay-100 text-3xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1]">
            Memory that evolves.
            <br />
            <span className="text-foreground-muted">Not just stores.</span>
          </h1>

          <p className="animate-fade-in opacity-0 animation-delay-200 mt-4 sm:mt-5 text-sm sm:text-base text-foreground-muted/80 max-w-2xl mx-auto leading-relaxed">
            Hybrid search. Auto-expiring temporal facts. Feedback-driven
            ranking. Version history. Connect via MCP or build on the REST API.
          </p>

          {/* CTA Buttons */}
          <div className="animate-fade-in opacity-0 animation-delay-300 mt-6 sm:mt-8 flex justify-center gap-3">
            {/* Docs Button - glass pill */}
            <a
              href="https://docs.memcontext.in"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative"
            >
              <div className="absolute -inset-0.5 rounded-xl border border-white/8" />
              <div className="relative flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-surface/60 backdrop-blur-sm border border-white/[0.08] transition-all group-hover:border-white/15 group-hover:bg-surface/80">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.04] via-transparent to-transparent" />
                <span className="text-sm sm:text-base text-foreground font-display font-semibold relative z-10">
                  Read the Docs
                </span>
              </div>
            </a>

            {/* Sign Up Button */}
            <a
              href="https://app.memcontext.in/login"
              className="relative group inline-block"
            >
              <div
                className="absolute -top-px -left-px w-12 h-6 rounded-xl blur-[0.5px] opacity-80 group-hover:opacity-100 transition-opacity"
                style={{
                  background:
                    "radial-gradient(ellipse at top left, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.25) 40%, transparent 70%)",
                }}
              />
              <div
                className="relative px-6 py-2.5 sm:py-3 rounded-xl flex items-center justify-center gap-2 overflow-hidden transition-all group-hover:scale-[1.02] whitespace-nowrap"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(232, 97, 60, 0.9) 0%, rgba(201, 78, 46, 0.8) 100%)",
                }}
              >
                <div
                  className="absolute inset-0 opacity-60"
                  style={{
                    background:
                      "radial-gradient(ellipse at top left, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 40%, transparent 70%)",
                  }}
                />
                <div
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
                  }}
                />
                <span className="font-display font-semibold text-sm sm:text-base text-white relative z-10">
                  Sign Up
                </span>
                <ArrowRight className="w-4 h-4 text-white relative z-10 transition-transform group-hover:translate-x-1" />
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Memory Tower — isometric illustration of the memory layer.
          Dashboard preview temporarily swapped out; restore by importing
          HeroDashboard and replacing <HeroMemoryTower /> with <HeroDashboard />. */}
      <div className="animate-fade-in opacity-0 animation-delay-400  mb-8 sm:mb-12 flex-1 flex items-center justify-center relative z-10">
        <HeroMemoryTower className="relative pointer-events-none w-[min(1100px,92%)]" />
      </div>

      {/* Trust Block - overlays hero cards */}
      <div className="animate-fade-in opacity-0 animation-delay-500 relative z-30">
        <TrustBlock />
      </div>
    </section>
  );
}
