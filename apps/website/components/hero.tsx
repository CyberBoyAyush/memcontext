"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { HeroCards } from "./hero-cards";
import { TrustBlock } from "./trust-block";

export function Hero() {
  // Generate dots with varying opacities for the glow effect
  const generateDots = (count: number, seed: number) => {
    const dots = [];
    for (let i = 0; i < count; i++) {
      const x = (i * 17 + seed) % 100;
      const y = (i * 23 + seed * 7) % 100;
      const opacity = [0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6][i % 7];
      const size = [2, 2, 3, 3, 4][i % 5];
      dots.push({ x, y, opacity, size });
    }
    return dots;
  };

  const leftDots = generateDots(25, 42);
  const rightDots = generateDots(25, 73);

  return (
    <section className="pt-20 pb-8 sm:pt-24 sm:pb-12 lg:pt-24 lg:pb-16 min-h-screen flex flex-col relative overflow-visible">
      {/* Dotted glow background - Top Left */}
      <div className="absolute top-0 left-0 w-75 h-75 sm:w-100 sm:h-100 pointer-events-none">
        <div className="relative w-full h-full">
          {leftDots.map((dot, i) => (
            <div
              key={`left-${i}`}
              className="absolute rounded-full bg-white"
              style={{
                left: `${dot.x}%`,
                top: `${dot.y}%`,
                width: `${dot.size}px`,
                height: `${dot.size}px`,
                opacity: dot.opacity,
                boxShadow: `0 0 ${dot.size * 3}px ${dot.size}px rgba(255, 255, 255, ${dot.opacity * 0.5})`,
              }}
            />
          ))}
        </div>
        {/* Gradient fade */}
        <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-background" />
      </div>

      {/* Dotted glow background - Top Right */}
      <div className="absolute top-0 right-0 w-75 h-75 sm:w-100 sm:h-100 pointer-events-none">
        <div className="relative w-full h-full">
          {rightDots.map((dot, i) => (
            <div
              key={`right-${i}`}
              className="absolute rounded-full bg-white"
              style={{
                left: `${dot.x}%`,
                top: `${dot.y}%`,
                width: `${dot.size}px`,
                height: `${dot.size}px`,
                opacity: dot.opacity,
                boxShadow: `0 0 ${dot.size * 3}px ${dot.size}px rgba(255, 255, 255, ${dot.opacity * 0.5})`,
              }}
            />
          ))}
        </div>
        {/* Gradient fade */}
        <div className="absolute inset-0 bg-linear-to-bl from-transparent via-transparent to-background" />
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 relative z-10">
        <div className="text-center">
          {/* Glowing badge */}
          <div className="animate-fade-in opacity-0 flex justify-center mb-4 sm:mb-4">
            <div className="group relative">
              {/* Border glow spot - top left */}
              <div
                className="absolute -top-px -left-px w-20 h-11 rounded-full blur-[1px]"
                style={{
                  background:
                    "radial-gradient(ellipse at top left, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.3) 30%, transparent 70%)",
                }}
              />
              {/* Border glow spot - bottom right */}
              <div
                className="absolute -bottom-px -right-px w-20 h-11 rounded-full blur-[1px]"
                style={{
                  background:
                    "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 70%)",
                }}
              />

              {/* Subtle border all around */}
              <div className="absolute -inset-0.5 rounded-full border border-white/10" />

              {/* Main container */}
              <div className="relative inline-flex items-center gap-2 sm:gap-3 px-1.5 py-1.5 sm:px-2 sm:py-2 rounded-full bg-surface/95 backdrop-blur-sm transition-all duration-300 cursor-default overflow-hidden">
                {/* Inner glow - top left */}
                <div className="absolute top-0 left-0 w-20 h-12 bg-white/8 rounded-full blur-xl -translate-x-1/3 -translate-y-1/2" />
                {/* Inner glow - bottom right */}
                <div className="absolute bottom-0 right-0 w-20 h-12 bg-white/8 rounded-full blur-xl translate-x-1/3 translate-y-1/2" />

                {/* Left icon */}
                <div className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-linear-to-br from-surface to-border-hover border border-border-hover/60 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-foreground-muted" />
                </div>

                {/* Text */}
                <span className="relative z-10 text-xs sm:text-sm text-foreground font-medium pr-1 sm:pr-2">
                  Persistent, evolving memory for AI
                </span>

                {/* Right arrow */}
                {/* <div className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface-elevated flex items-center justify-center">
                  <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-foreground-muted" />
                </div> */}
              </div>
            </div>
          </div>

          <h1 className="animate-fade-in opacity-0 animation-delay-100 text-3xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1]">
            Your AI remembers everything.
            <br />
            <span className="text-foreground-muted">Automatically.</span>
          </h1>

          <p className="animate-fade-in opacity-0 animation-delay-200 mt-4 sm:mt-5 text-sm sm:text-base text-foreground-muted/80 max-w-2xl mx-auto leading-relaxed">
            Connect via MCP or REST API. Memories evolve over time, expire when
            stale, and get smarter from your feedback. Works with any AI tool or
            custom application.
          </p>

          {/* CTA Buttons */}
          <div className="animate-fade-in opacity-0 animation-delay-300 mt-6 sm:mt-8 flex justify-center gap-3">
            {/* Pricing Button - glass pill */}
            <Link href="/pricing" className="group relative">
              <div className="absolute -inset-0.5 rounded-xl border border-white/8" />
              <div className="relative flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-surface/60 backdrop-blur-sm border border-white/[0.08] transition-all group-hover:border-white/15 group-hover:bg-surface/80">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.04] via-transparent to-transparent" />
                <span className="text-sm sm:text-base text-foreground font-display font-semibold relative z-10">
                  Pricing
                </span>
              </div>
            </Link>

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

      {/* Hero Cards Stack - Visual showcase */}
      <div className="animate-fade-in opacity-0 animation-delay-400 mt-8 sm:mt-10 lg:mt-16 flex-1 flex items-center justify-center">
        <HeroCards />
      </div>

      {/* Trust Block - overlays hero cards */}
      <div className="animate-fade-in opacity-0 animation-delay-500 relative z-30">
        <TrustBlock />
      </div>
    </section>
  );
}
