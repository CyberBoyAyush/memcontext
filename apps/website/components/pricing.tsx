"use client";

import { Check, ArrowRight } from "lucide-react";
import { GrTopCorner } from "react-icons/gr";
import Link from "next/link";

interface Plan {
  id: string;
  name: string;
  price: number;
  memories: number;
  popular?: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    memories: 300,
    features: [
      "300 memories",
      "Limited memory retrieval",
      "Unlimited projects",
      "MCP integration",
      "Community support",
    ],
  },
  {
    id: "hobby",
    name: "Hobby",
    price: 5,
    memories: 2000,
    popular: true,
    features: [
      "2,000 memories",
      "Unlimited memory retrieval",
      "Unlimited projects",
      "MCP integration",
      "Priority support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 15,
    memories: 10000,
    features: [
      "10,000 memories",
      "Unlimited memory retrieval",
      "Unlimited projects",
      "MCP integration",
      "Priority support",
      "Early access to features",
    ],
  },
];

function PricingCard({ plan, index }: { plan: Plan; index: number }) {
  const isPopular = !!plan.popular;

  return (
    <div
      className="animate-fade-in-up h-full"
      style={{
        animationDelay: `${index * 120}ms`,
        animationFillMode: "backwards",
      }}
    >
      <div className="relative group h-full flex flex-col">
        {/* Outer glow for popular plan */}
        {isPopular && (
          <div
            className="pointer-events-none absolute -inset-3 rounded-3xl opacity-40 blur-xl transition-opacity duration-500 group-hover:opacity-60"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(232,97,60,0.4) 0%, transparent 70%)",
            }}
          />
        )}

        {/* ── Top: Coral Folder Shape (plan name, price, CTA) ── */}
        <div className="relative">
          {/* Mobile: shorter folder */}
          <svg
            viewBox="0 0 300 130"
            fill="none"
            preserveAspectRatio="none"
            className={`w-full h-auto relative z-10 drop-shadow-[0_8px_24px_rgba(232,97,60,0.3)] sm:hidden`}
          >
            <defs>
              <linearGradient
                id={`folderGradientSm-${plan.id}`}
                x1="0"
                y1="0"
                x2="300"
                y2="130"
                gradientUnits="userSpaceOnUse"
              >
                <stop
                  offset="0%"
                  stopColor="#E8613C"
                  stopOpacity={isPopular ? "0.9" : "0.75"}
                />
                <stop
                  offset="100%"
                  stopColor="#C94E2E"
                  stopOpacity={isPopular ? "0.8" : "0.6"}
                />
              </linearGradient>
              <radialGradient
                id={`folderGlowSm-${plan.id}`}
                cx="0"
                cy="0"
                r="1"
                gradientUnits="userSpaceOnUse"
                gradientTransform="translate(30 10) scale(100 80)"
              >
                <stop offset="0%" stopColor="white" stopOpacity="0.3" />
                <stop offset="50%" stopColor="white" stopOpacity="0.1" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </radialGradient>
              <linearGradient
                id={`folderEdgeTopSm-${plan.id}`}
                x1="0"
                y1="0"
                x2="140"
                y2="0"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="white" stopOpacity="0.6" />
                <stop offset="40%" stopColor="white" stopOpacity="0.25" />
                <stop offset="100%" stopColor="white" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient
                id={`folderEdgeLeftSm-${plan.id}`}
                x1="0"
                y1="0"
                x2="0"
                y2="130"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="white" stopOpacity="0.6" />
                <stop offset="40%" stopColor="white" stopOpacity="0.2" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 8
                 C0 3.6 3.6 0 8 0
                 H292
                 C296.4 0 300 3.6 300 8
                 V122
                 C300 126.4 296.4 130 290 130
                 H114
                 Q104 130 100 124
                 L94 116
                 Q90 110 80 110
                 H10
                 C4 110 0 106 0 100
                 V8Z"
              fill={`url(#folderGradientSm-${plan.id})`}
            />
            <path
              d="M0 8
                 C0 3.6 3.6 0 8 0
                 H292
                 C296.4 0 300 3.6 300 8
                 V122
                 C300 126.4 296.4 130 290 130
                 H114
                 Q104 130 100 124
                 L94 116
                 Q90 110 80 110
                 H10
                 C4 110 0 106 0 100
                 V8Z"
              fill={`url(#folderGlowSm-${plan.id})`}
            />
            <path
              d="M0 8 C0 3.6 3.6 0 8 0 H292 C296.4 0 300 3.6 300 8"
              stroke={`url(#folderEdgeTopSm-${plan.id})`}
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M0 8 V100"
              stroke={`url(#folderEdgeLeftSm-${plan.id})`}
              strokeWidth="1.5"
              fill="none"
            />
          </svg>

          {/* Desktop: taller folder */}
          <svg
            viewBox="0 0 300 180"
            fill="none"
            preserveAspectRatio="none"
            className={`w-full h-auto relative z-10 drop-shadow-[0_8px_24px_rgba(232,97,60,0.3)] hidden sm:block`}
          >
            <defs>
              <linearGradient
                id={`folderGradient-${plan.id}`}
                x1="0"
                y1="0"
                x2="300"
                y2="180"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#E8613C" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#C94E2E" stopOpacity="0.8" />
              </linearGradient>
              <radialGradient
                id={`folderGlow-${plan.id}`}
                cx="0"
                cy="0"
                r="1"
                gradientUnits="userSpaceOnUse"
                gradientTransform="translate(30 10) scale(100 80)"
              >
                <stop offset="0%" stopColor="white" stopOpacity="0.3" />
                <stop offset="50%" stopColor="white" stopOpacity="0.1" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </radialGradient>
              <linearGradient
                id={`folderEdgeTop-${plan.id}`}
                x1="0"
                y1="0"
                x2="140"
                y2="0"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="white" stopOpacity="0.6" />
                <stop offset="40%" stopColor="white" stopOpacity="0.25" />
                <stop offset="100%" stopColor="white" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient
                id={`folderEdgeLeft-${plan.id}`}
                x1="0"
                y1="0"
                x2="0"
                y2="180"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="white" stopOpacity="0.6" />
                <stop offset="40%" stopColor="white" stopOpacity="0.2" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Folder body with tab notch on bottom-left */}
            <path
              d="M0 8
                 C0 3.6 3.6 0 8 0
                 H292
                 C296.4 0 300 3.6 300 8
                 V172
                 C300 176.4 296.4 180 290 180
                 H114
                 Q104 180 100 174
                 L94 166
                 Q90 160 80 160
                 H10
                 C4 160 0 156 0 150
                 V8Z"
              fill={`url(#folderGradient-${plan.id})`}
            />
            {/* Glow overlay */}
            <path
              d="M0 8
                 C0 3.6 3.6 0 8 0
                 H292
                 C296.4 0 300 3.6 300 8
                 V172
                 C300 176.4 296.4 180 290 180
                 H114
                 Q104 180 100 174
                 L94 166
                 Q90 160 80 160
                 H10
                 C4 160 0 156 0 150
                 V8Z"
              fill={`url(#folderGlow-${plan.id})`}
            />
            {/* Top edge highlight */}
            <path
              d="M0 8
                 C0 3.6 3.6 0 8 0
                 H292
                 C296.4 0 300 3.6 300 8"
              stroke={`url(#folderEdgeTop-${plan.id})`}
              strokeWidth="1.5"
              fill="none"
            />
            {/* Left edge highlight */}
            <path
              d="M0 8 V150"
              stroke={`url(#folderEdgeLeft-${plan.id})`}
              strokeWidth="1.5"
              fill="none"
            />
          </svg>

          {/* Folder content: plan name, price, CTA */}
          <div className="absolute inset-0 flex flex-col justify-center px-5 md:pt-3 pb-4 z-20">
            {/* Plan name + badge */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-2xl sm:text-3xl font-bold text-white font-display tracking-tight">
                {plan.name}
              </h3>
              {isPopular && (
                <span className="px-2 py-0.5 rounded-md bg-white/15 backdrop-blur-sm text-[10px] font-semibold uppercase tracking-wide text-white/90">
                  Popular
                </span>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tighter font-display text-white">
                ${plan.price}
              </span>
              <span className="text-sm sm:text-base font-medium text-white/60">
                /month
              </span>
            </div>

            {/* Memories included */}
            <p className="text-xs text-white/50 mt-1">
              {plan.memories.toLocaleString()} memories included
            </p>
          </div>
        </div>

        {/* ── Bottom: Features Card with corner brackets ── */}
        <div
          className={`relative rounded-xl overflow-hidden -mt-4 flex-1 flex flex-col ${
            isPopular
              ? "border border-accent/25 bg-accent/[0.06]"
              : "border border-white/10 bg-border-hover/30"
          }`}
        >
          {/* Inner card with L-shaped corner brackets */}
          <div
            className={`relative rounded-xl m-2 flex-1 flex flex-col ${
              isPopular
                ? "bg-background/90 border border-accent/15"
                : "bg-background/80 border border-white/10"
            }`}
          >
            {/* Top Left */}
            <GrTopCorner
              className={`absolute top-2 left-2 w-4 h-4 ${isPopular ? "text-accent/50" : "text-foreground-muted"}`}
            />
            {/* Top Right */}
            <GrTopCorner
              className={`absolute top-2 right-2 w-4 h-4 rotate-90 ${isPopular ? "text-accent/50" : "text-foreground-muted"}`}
            />
            {/* Bottom Right */}
            <GrTopCorner
              className={`absolute bottom-2 right-2 w-4 h-4 rotate-180 ${isPopular ? "text-accent/50" : "text-foreground-muted"}`}
            />
            {/* Bottom Left */}
            <GrTopCorner
              className={`absolute bottom-2 left-2 w-4 h-4 -rotate-90 ${isPopular ? "text-accent/50" : "text-foreground-muted"}`}
            />

            {/* Features list + CTA */}
            <div className="relative p-5 pt-6 flex-1 flex flex-col">
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                        isPopular
                          ? "bg-accent/15 text-accent"
                          : "bg-white/5 border border-white/10 text-foreground-muted"
                      }`}
                    >
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </div>
                    <span className="text-sm text-foreground/80">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Spacer to push CTA to bottom */}
              <div className="flex-1" />

              {/* Divider */}
              <div
                className="h-px w-full my-5"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.08) 70%, transparent 100%)",
                }}
              />

              {/* CTA Button */}
              {isPopular ? (
                <a
                  href="https://app.memcontext.in/login"
                  className="group/btn relative w-full block"
                >
                  <div
                    className="absolute -top-px -left-px w-16 h-8 rounded-xl blur-[0.5px] opacity-80 group-hover/btn:opacity-100 transition-opacity"
                    style={{
                      background:
                        "radial-gradient(ellipse at top left, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 40%, transparent 70%)",
                    }}
                  />
                  <div
                    className="relative flex items-center justify-center gap-2 px-5 py-3 rounded-xl overflow-hidden transition-all group-hover/btn:scale-[1.02]"
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
                      Start with {plan.name}
                    </span>
                    <ArrowRight className="w-4 h-4 text-white relative z-10 transition-transform group-hover/btn:translate-x-1" />
                  </div>
                </a>
              ) : (
                <a
                  href="https://app.memcontext.in/login"
                  className="group/btn relative w-full block"
                >
                  <div
                    className="absolute -top-px -left-px w-14 h-7 rounded-xl blur-[0.5px]"
                    style={{
                      background:
                        "radial-gradient(ellipse at top left, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.12) 40%, transparent 70%)",
                    }}
                  />
                  <div className="absolute -inset-0.5 rounded-xl border border-white/8" />
                  <div className="relative flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-surface/60 backdrop-blur-sm border border-white/[0.08] transition-all group-hover/btn:border-white/15 group-hover/btn:bg-surface/80">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.04] via-transparent to-transparent" />
                    <span className="font-display font-semibold text-sm text-foreground relative z-10">
                      {plan.id === "free"
                        ? "Start for Free"
                        : `Start with ${plan.name}`}
                    </span>
                    <ArrowRight className="w-4 h-4 text-foreground-muted relative z-10 transition-transform group-hover/btn:translate-x-1" />
                  </div>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateDots(count: number, seed: number) {
  const dots = [];
  for (let i = 0; i < count; i++) {
    const x = (i * 17 + seed) % 100;
    const y = (i * 23 + seed * 7) % 100;
    const opacity = [0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6][i % 7];
    const size = [2, 2, 3, 3, 4][i % 5];
    dots.push({ x, y, opacity, size });
  }
  return dots;
}

const leftDots = generateDots(25, 42);
const rightDots = generateDots(25, 73);

export function Pricing() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      {/* Starry glow background - Top Left */}
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
        <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-background" />
      </div>

      {/* Starry glow background - Top Right */}
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
        <div className="absolute inset-0 bg-linear-to-bl from-transparent via-transparent to-background" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-14">
          {/* Glowing badge pill */}
          <div className="flex justify-center mb-6">
            <div className="group relative">
              <div
                className="absolute -top-px -left-px w-16 h-9 rounded-full blur-[1px]"
                style={{
                  background:
                    "radial-gradient(ellipse at top left, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 70%)",
                }}
              />
              <div
                className="absolute -bottom-px -right-px w-16 h-9 rounded-full blur-[1px]"
                style={{
                  background:
                    "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 30%, transparent 70%)",
                }}
              />
              <div className="absolute -inset-0.5 rounded-full border border-white/10" />
              <div className="relative inline-flex items-center px-4 py-2 rounded-full bg-surface/95 backdrop-blur-sm">
                <div className="absolute top-0 left-0 w-16 h-10 bg-white/5 rounded-full blur-xl -translate-x-1/3 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-16 h-10 bg-white/5 rounded-full blur-xl translate-x-1/3 translate-y-1/2" />
                <span className="relative z-10 text-xs sm:text-sm text-foreground font-medium">
                  Pricing
                </span>
              </div>
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4 tracking-tight leading-[1.1]">
            Simple, transparent pricing
          </h2>
          <p className="text-base sm:text-lg text-foreground-muted max-w-2xl mx-auto">
            Start free, scale as your AI memory grows. No hidden fees, no
            surprises.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 max-w-4xl mx-auto">
          {PLANS.map((plan, index) => (
            <PricingCard key={plan.id} plan={plan} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
