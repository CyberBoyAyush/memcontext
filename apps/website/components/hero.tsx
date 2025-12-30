"use client";

import { useState } from "react";
import {
  Loader2,
  Check,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { useReferrer } from "@/lib/use-referrer";
import { joinWaitlist } from "@/lib/waitlist";
import { HeroCards } from "./hero-cards";
import { TrustBlock } from "./trust-block";

export function Hero() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "exists" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const { referrer, clearReferrer } = useReferrer();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setErrorMessage("");

    const result = await joinWaitlist({
      email,
      source: "hero",
      referrer,
    });

    if (result.success) {
      setStatus(result.alreadyExists ? "exists" : "success");
      setEmail("");
      clearReferrer();
      setTimeout(() => setStatus("idle"), 4000);
    } else {
      setStatus("error");
      setErrorMessage(result.error);
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

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
      <div className="absolute top-0 left-0 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] pointer-events-none">
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
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-background" />
      </div>

      {/* Dotted glow background - Top Right */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] pointer-events-none">
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
        <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-transparent to-background" />
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 relative z-10">
        <div className="text-center">
          {/* Glowing badge */}
          <div className="animate-fade-in opacity-0 flex justify-center mb-4 sm:mb-4">
            <div className="group relative">
              {/* Border glow spot - top left */}
              <div
                className="absolute -top-[1px] -left-[1px] w-20 h-11 rounded-full blur-[1px]"
                style={{
                  background:
                    "radial-gradient(ellipse at top left, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.3) 30%, transparent 70%)",
                }}
              />
              {/* Border glow spot - bottom right */}
              <div
                className="absolute -bottom-[1px] -right-[1px] w-20 h-11 rounded-full blur-[1px]"
                style={{
                  background:
                    "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 70%)",
                }}
              />

              {/* Subtle border all around */}
              <div className="absolute -inset-[2px] rounded-full border border-white/10" />

              {/* Main container */}
              <div className="relative inline-flex items-center gap-2 sm:gap-3 px-1.5 py-1.5 sm:px-2 sm:py-2 rounded-full bg-surface/95 backdrop-blur-sm transition-all duration-300 cursor-default overflow-hidden">
                {/* Inner glow - top left */}
                <div className="absolute top-0 left-0 w-20 h-12 bg-white/8 rounded-full blur-xl -translate-x-1/3 -translate-y-1/2" />
                {/* Inner glow - bottom right */}
                <div className="absolute bottom-0 right-0 w-20 h-12 bg-white/8 rounded-full blur-xl translate-x-1/3 translate-y-1/2" />

                {/* Left icon */}
                <div className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-surface to-border-hover border border-border-hover/60 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-foreground-muted" />
                </div>

                {/* Text */}
                <span className="relative z-10 text-xs sm:text-sm text-foreground font-medium pr-1 sm:pr-2">
                  Persistent memory for AI coding agents
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
            Connect the MCP server to Claude, Cursor, or Cline. Chat normally.
            Context is saved and retrieved automatically.
          </p>

          {/* Email Signup Form */}
          <div className="animate-fade-in opacity-0 animation-delay-300 mt-6 sm:mt-8 max-w-lg mx-auto px-2">
            <form
              onSubmit={handleSubmit}
              className="flex flex-row gap-1.5 md:gap-3"
            >
              <div className="flex-1 relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  disabled={status === "loading" || status === "success"}
                  className="w-full px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base font-mono bg-neutral-950/70 border border-neutral-700/60 rounded-xl input-focus-glow focus:outline-none focus:border-foreground transition-all placeholder:text-foreground-subtle "
                />
              </div>
              <button
                type="submit"
                disabled={
                  status === "loading" ||
                  status === "success" ||
                  status === "exists"
                }
                className="px-3 sm:px-6 py-1 sm:py-3 text-xs sm:text-base font-medium bg-accent cursor-pointer text-background rounded-xl  transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span>Joining...</span>
                  </>
                ) : status === "success" ? (
                  <>
                    <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>You&apos;re in!</span>
                  </>
                ) : status === "exists" ? (
                  <>
                    <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Already on the list!</span>
                  </>
                ) : status === "error" ? (
                  <span className="text-sm">{errorMessage}</span>
                ) : (
                  <>
                    <span className="text-foreground font-display font-semibold">
                      Get Early Access
                    </span>
                    <ArrowRight className="w-3 h-3 sm:w-5 sm:h-5 transition-transform text-foreground group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
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
