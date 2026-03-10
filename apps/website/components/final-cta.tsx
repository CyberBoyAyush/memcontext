"use client";

import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import Image from "next/image";
import { BsGithub } from "react-icons/bs";

export function FinalCTA() {
  const [showGithubModal, setShowGithubModal] = useState(false);

  return (
    <>
      <section className="py-20 sm:pt-16 md:pb-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Main CTA Card with Glass Effect */}
          <div className="relative">
            {/* Border glow - top left */}
            <div
              className="absolute -top-px -left-px w-40 h-24 rounded-2xl"
              style={{
                background:
                  "radial-gradient(ellipse at top left, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 35%, transparent 65%)",
              }}
            />
            {/* Border glow - bottom right */}
            <div
              className="absolute -bottom-px -right-px w-40 h-24 rounded-2xl"
              style={{
                background:
                  "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 35%, transparent 65%)",
              }}
            />

            {/* Main Card */}
            <div className="relative rounded-2xl overflow-hidden bg-surface/40 backdrop-blur-md border border-white/[0.08] p-8 sm:p-12 lg:p-14">
              {/* Noise/Grain texture overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  opacity: 0.08,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                  mixBlendMode: "overlay",
                }}
              />
              {/* Inner glow overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                {/* Left side - Content & Form */}
                <div className="flex-1 text-center lg:text-left">
                  {/* Shining logo */}
                  <div className="flex justify-center lg:justify-start mb-6">
                    <div className="relative">
                      {/* Border glow spot */}
                      <div
                        className="absolute -top-[0.5px] -left-[0.5px] w-8 h-8 rounded-xl blur-[0.5px]"
                        style={{
                          background:
                            "radial-gradient(ellipse at top left, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.4) 30%, transparent 60%)",
                        }}
                      />
                      {/* Glass container */}
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-surface/80 backdrop-blur-sm border border-white/10 flex items-center justify-center overflow-hidden">
                        {/* Inner glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
                        <Image
                          src="/sign.png"
                          alt="MemContext Logo"
                          width={32}
                          height={32}
                          className="w-7 h-7 sm:w-8 sm:h-8 relative z-10"
                        />
                      </div>
                    </div>
                  </div>

                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold mb-3 tracking-tight">
                    Stop repeating yourself.
                  </h2>
                  <p className="text-sm sm:text-base text-foreground-muted mb-6 max-w-md mx-auto lg:mx-0">
                    Connect once. Chat normally. Memory happens automatically.
                  </p>

                  {/* CTA Buttons - side by side */}
                  <div className="flex flex-col sm:flex-row items-center lg:items-start gap-3">
                    {/* Star on GitHub */}
                    <button
                      onClick={() => setShowGithubModal(true)}
                      className="group relative"
                    >
                      <div className="absolute -inset-0.5 rounded-xl border border-white/8" />
                      <div className="relative flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-surface/60 backdrop-blur-sm border border-white/[0.08] transition-all group-hover:border-white/15 group-hover:bg-surface/80 cursor-pointer">
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.04] via-transparent to-transparent" />
                        <BsGithub className="relative z-10 w-4 h-4 text-foreground-muted group-hover:text-foreground transition-colors" />
                        <span className="relative z-10 text-sm font-display font-semibold text-foreground">
                          Star on GitHub
                        </span>
                      </div>
                    </button>

                    {/* Sign Up */}
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
                        className="relative px-6 py-3 rounded-xl flex items-center justify-center gap-2 overflow-hidden transition-all group-hover:scale-[1.02] whitespace-nowrap"
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
                        <span className="font-display font-semibold text-sm text-white relative z-10">
                          Sign Up
                        </span>
                        <ArrowRight className="w-4 h-4 text-white relative z-10 transition-transform group-hover:translate-x-1" />
                      </div>
                    </a>
                  </div>
                </div>

                {/* Right side - Large rotated logo in glass container */}
                <div className="hidden lg:flex items-center justify-center flex-shrink-0 relative">
                  {/* Sparkle dots around the logo - positioned on right side */}
                  <div className="absolute w-96 h-96 xl:w-[28rem] xl:h-[28rem] pointer-events-none right-[-4rem] top-[-6rem]">
                    {[
                      // Top edge sparkles
                      { x: 25, y: 8, opacity: 0.6, size: 4 },
                      { x: 45, y: 3, opacity: 0.5, size: 3 },
                      { x: 65, y: 6, opacity: 0.55, size: 4 },
                      { x: 80, y: 10, opacity: 0.45, size: 3 },
                      // Right edge sparkles
                      { x: 92, y: 20, opacity: 0.6, size: 4 },
                      { x: 95, y: 35, opacity: 0.5, size: 3 },
                      { x: 90, y: 50, opacity: 0.55, size: 4 },
                      { x: 93, y: 65, opacity: 0.45, size: 3 },
                      { x: 88, y: 80, opacity: 0.5, size: 3 },
                      // Bottom edge sparkles
                      { x: 75, y: 92, opacity: 0.5, size: 3 },
                      { x: 55, y: 95, opacity: 0.45, size: 3 },
                      { x: 35, y: 90, opacity: 0.4, size: 2 },
                      // Left edge sparkles
                      { x: 8, y: 25, opacity: 0.45, size: 3 },
                      { x: 5, y: 45, opacity: 0.4, size: 2 },
                      { x: 10, y: 70, opacity: 0.35, size: 2 },
                      // Scattered inner sparkles
                      { x: 30, y: 20, opacity: 0.35, size: 2 },
                      { x: 70, y: 25, opacity: 0.4, size: 3 },
                      { x: 20, y: 60, opacity: 0.3, size: 2 },
                      { x: 78, y: 55, opacity: 0.4, size: 3 },
                      { x: 60, y: 85, opacity: 0.35, size: 2 },
                      { x: 85, y: 40, opacity: 0.5, size: 3 },
                      { x: 15, y: 85, opacity: 0.3, size: 2 },
                      { x: 50, y: 15, opacity: 0.45, size: 3 },
                    ].map((dot, i) => (
                      <div
                        key={i}
                        className="absolute rounded-full bg-white"
                        style={{
                          left: `${dot.x}%`,
                          top: `${dot.y}%`,
                          width: `${dot.size}px`,
                          height: `${dot.size}px`,
                          opacity: dot.opacity,
                          boxShadow: `0 0 ${dot.size * 4}px ${dot.size * 1.5}px rgba(255, 255, 255, ${dot.opacity * 0.6})`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Rotated glass container */}
                  <div className="relative top-20 -right-6 scale-150 rotate-[-12deg]">
                    {/* Glow behind container */}
                    <div
                      className="absolute -inset-8 blur-3xl opacity-30"
                      style={{
                        background:
                          "radial-gradient(circle, rgba(232,97,60,0.5) 0%, transparent 70%)",
                      }}
                    />
                    {/* Border glow spot - top left (longer) */}
                    <div
                      className="absolute -top-px -left-px w-32 h-28 rounded-2xl blur-[0.5px]"
                      style={{
                        background:
                          "radial-gradient(ellipse at top left, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.45) 25%, rgba(255,255,255,0.15) 50%, transparent 70%)",
                      }}
                    />
                    {/* Border glow spot - bottom right (smaller) */}
                    <div
                      className="absolute -bottom-px -right-px w-14 h-12 rounded-2xl blur-[0.5px]"
                      style={{
                        background:
                          "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 35%, transparent 65%)",
                      }}
                    />
                    {/* Glass container */}
                    <div className="relative w-40 h-40 xl:w-48 xl:h-48 rounded-2xl bg-surface/80 backdrop-blur-sm border border-white/10 flex items-center justify-center overflow-hidden">
                      {/* Inner glow */}
                      <div className="absolute inset-0 bg-linear-to-br from-white/10 via-transparent to-transparent" />

                      <Image
                        src="/sign.png"
                        alt="MemContext"
                        width={160}
                        height={160}
                        className="w-28 h-28 xl:w-32 xl:h-32 relative z-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GitHub Coming Soon Modal */}
      {showGithubModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowGithubModal(false)}
        >
          <div
            className="relative bg-background border border-border rounded-2xl p-6 sm:p-10 max-w-md w-full shadow-xl animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowGithubModal(false)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 text-foreground-subtle hover:text-foreground transition-colors hover:rotate-90 duration-200"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-5 rounded-full bg-surface-elevated flex items-center justify-center">
                <BsGithub className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
                Coming Soon
              </h3>
              <p className="text-foreground-muted text-sm sm:text-base mb-6 sm:mb-8">
                MemContext will be open source soon. Star the repo to get
                notified when we go public.
              </p>
              <a
                href="https://github.com/cyberboyayush"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium bg-accent text-background rounded-xl btn-hover-lift transition-all"
              >
                <BsGithub className="w-4 h-4 sm:w-5 sm:h-5" />
                Follow on GitHub
              </a>
              <p className="mt-4 sm:mt-5 text-xs sm:text-sm text-foreground-subtle font-mono">
                github.com/cyberboyayush
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
