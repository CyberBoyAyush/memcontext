"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { SiOpenai, SiGooglegemini } from "react-icons/si";
import { RiClaudeLine } from "react-icons/ri";
import { Cursor } from "@lobehub/icons";
import Image from "next/image";
import { useInView } from "@/lib/use-in-view";
import { useReducedMotion } from "@/lib/use-reduced-motion";

// Pre-defined line styles to avoid Math.random during render
const CODE_LINE_STYLES = [
  { width: "85%", opacity: 0.6 },
  { width: "72%", opacity: 0.5 },
  { width: "90%", opacity: 0.7 },
  { width: "65%", opacity: 0.4 },
  { width: "78%", opacity: 0.55 },
  { width: "82%", opacity: 0.5 },
  { width: "68%", opacity: 0.45 },
];

// Pre-defined particle positions
const PARTICLE_POSITIONS = [
  { left: "15%", top: "20%", duration: "3s", delay: "0s" },
  { left: "30%", top: "45%", duration: "3.5s", delay: "0.3s" },
  { left: "45%", top: "20%", duration: "4s", delay: "0.6s" },
  { left: "60%", top: "45%", duration: "4.5s", delay: "0.9s" },
  { left: "75%", top: "20%", duration: "5s", delay: "1.2s" },
  { left: "90%", top: "45%", duration: "5.5s", delay: "1.5s" },
];

// Memory Card Component - VERTICAL/PORTRAIT shape (tall)
function MemoryCard({
  title,
  content,
  category,
  delay = 0,
  className = "",
}: {
  title: string;
  content: string;
  category: string;
  delay?: number;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const categoryColors: Record<string, string> = {
    preference: "bg-accent/20 text-accent border-accent/30",
    fact: "bg-info/20 text-info border-info/30",
    decision: "bg-success/20 text-success border-success/30",
    context: "bg-warning/20 text-warning border-warning/30",
  };

  return (
    <div
      className={`
        absolute transition-all duration-700 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}
        ${className}
      `}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Border glow - top left */}
      <div
        className="absolute -top-px -left-px w-20 h-16 rounded-xl blur-[0.5px]"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.2) 30%, transparent 60%)",
        }}
      />
      {/* Border glow - bottom right */}
      <div
        className="absolute -bottom-px -right-px w-12 h-10 rounded-xl blur-[0.5px]"
        style={{
          background:
            "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 30%, transparent 60%)",
        }}
      />
      <div
        className="relative w-[150px] sm:w-[170px] h-50 sm:h-[230px] p-3 sm:p-4 rounded-xl
        bg-surface border border-white/10
        shadow-[0_8px_32px_rgba(0,0,0,0.5)]
        flex flex-col overflow-hidden"
      >
        {/* Inner glow overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />
        <div className="flex">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="text-xs sm:text-sm font-medium text-foreground leading-tight">
              {title}
            </h4>
            <span
              className={`
                text-[9px] font-mono px-1.5 py-0.5 rounded-full border
                ${categoryColors[category] || categoryColors.preference}
              `}
            >
              {category}
            </span>
          </div>
        </div>
        <p className="text-[10px] sm:text-xs text-foreground-muted leading-relaxed flex-1">
          {content}
        </p>
        <div className="mt-auto pt-2 border-t border-border/50 flex items-center justify-between">
          <span className="text-[8px] text-foreground-subtle font-mono">
            mem_01
          </span>
          <span className="text-[8px] text-foreground-subtle">now</span>
        </div>
      </div>
    </div>
  );
}

// File Card Component - VERTICAL/PORTRAIT shape (tall)
function FileCard({
  filename,
  lines,
  delay = 0,
  className = "",
}: {
  filename: string;
  lines: number;
  delay?: number;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const lineStyles = CODE_LINE_STYLES.slice(0, Math.min(lines, 7));

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`
        absolute transition-all duration-700 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}
        ${className}
      `}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Border glow - top left */}
      <div
        className="absolute -top-px -left-px w-20 h-16 rounded-xl blur-[0.5px]"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.2) 30%, transparent 60%)",
        }}
      />
      {/* Border glow - bottom right */}
      <div
        className="absolute -bottom-px -right-px w-12 h-10 rounded-xl blur-[0.5px]"
        style={{
          background:
            "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 30%, transparent 60%)",
        }}
      />
      <div
        className="relative w-[140px] sm:w-[160px] h-[190px] sm:h-[220px] rounded-xl overflow-hidden
        bg-surface-elevated border border-white/10
        shadow-[0_8px_32px_rgba(0,0,0,0.5)]
        flex flex-col"
      >
        {/* Inner glow overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />
        <div className="px-2.5 py-2 bg-background/80 border-b border-border flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-error/60" />
            <div className="w-1.5 h-1.5 rounded-full bg-warning/60" />
            <div className="w-1.5 h-1.5 rounded-full bg-success/60" />
          </div>
          <span className="text-[8px] font-mono text-foreground-muted truncate">
            {filename}
          </span>
        </div>
        <div className="p-2.5 font-mono text-[9px] space-y-1.5 flex-1">
          {lineStyles.map((style, i) => (
            <div key={i} className="flex gap-1.5">
              <span className="text-foreground-subtle w-2.5 text-right select-none">
                {i + 1}
              </span>
              <div
                className="h-2.5 rounded bg-foreground/5"
                style={{ width: style.width, opacity: style.opacity }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Folder Component with proper SVG tab shape
function FolderCard({
  name,
  items,
  delay = 0,
  className = "",
}: {
  name: string;
  items: number;
  delay?: number;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`
        absolute
        transition-all duration-700 ease-out
        ${isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"}
        ${className}
      `}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Shiny Logo Container - positioned on top of folder */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[60px] sm:top-[70px] z-10">
        <div className="relative">
          {/* Border glow - top left */}
          <div
            className="absolute -top-[1px] -left-[1px] w-8 h-8 rounded-xl blur-[0.5px]"
            style={{
              background:
                "radial-gradient(ellipse at top left, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 30%, transparent 60%)",
            }}
          />
          {/* Border glow - bottom right */}
          <div
            className="absolute -bottom-[1px] -right-[1px] w-6 h-6 rounded-xl blur-[0.5px]"
            style={{
              background:
                "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 60%)",
            }}
          />
          {/* Glass container with dark background */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-surface/95 backdrop-blur-sm border border-white/15 flex items-center justify-center overflow-hidden">
            {/* Inner glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
            <Image
              src="/sign.png"
              alt="MemContext Logo"
              width={40}
              height={40}
              className="w-8 h-8 sm:w-10 sm:h-10 relative z-10"
            />
          </div>
        </div>
      </div>
      <svg
        className="w-[280px] h-50 sm:w-[340px] sm:h-[240px] drop-shadow-[0_10px_30px_rgba(232,97,60,0.35)]"
        viewBox="0 0 340 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="folderGradient"
            x1="170"
            y1="28"
            x2="170"
            y2="228"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#E8613C" />
            <stop offset="100%" stopColor="#C94E2E" />
          </linearGradient>
          {/* Glass shine overlay on top-left */}
          <radialGradient
            id="folderGlowHero"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(40 20) scale(120 100)"
          >
            <stop offset="0%" stopColor="white" stopOpacity="0.3" />
            <stop offset="50%" stopColor="white" stopOpacity="0.1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          {/* Top edge glow gradient - horizontal */}
          <linearGradient
            id="folderEdgeGlowHero"
            x1="16"
            y1="0"
            x2="200"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="white" stopOpacity="0.6" />
            <stop offset="40%" stopColor="white" stopOpacity="0.25" />
            <stop offset="100%" stopColor="white" stopOpacity="0.05" />
          </linearGradient>
          {/* Left edge glow gradient - vertical */}
          <linearGradient
            id="folderEdgeGlowLeftHero"
            x1="0"
            y1="20"
            x2="0"
            y2="228"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="white" stopOpacity="0.6" />
            <stop offset="40%" stopColor="white" stopOpacity="0.2" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Main folder shape - tab on top LEFT side
            Path: rounded top-left → horizontal (tab) → diagonal down → horizontal (main top) → rest of folder
        */}
        <path
          d="M16 20
             C16 14 20 10 26 10
             H100
             Q110 10 115 18
             L125 32
             Q130 40 140 40
             H308
             C316.837 40 324 47.163 324 56
             V212
             C324 220.837 316.837 228 308 228
             H32
             C23.163 228 16 220.837 16 212
             V20Z"
          fill="url(#folderGradient)"
        />

        {/* Glass glow overlay */}
        <path
          d="M16 20
             C16 14 20 10 26 10
             H100
             Q110 10 115 18
             L125 32
             Q130 40 140 40
             H308
             C316.837 40 324 47.163 324 56
             V212
             C324 220.837 316.837 228 308 228
             H32
             C23.163 228 16 220.837 16 212
             V20Z"
          fill="url(#folderGlowHero)"
        />

        {/* Top edge highlight with glow on left */}
        <path
          d="M16 20
             C16 14 20 10 26 10
             H100
             Q110 10 115 18
             L125 32
             Q130 40 140 40
             H308
             C316.837 40 324 47.163 324 56"
          stroke="url(#folderEdgeGlowHero)"
          strokeWidth="1.5"
          fill="none"
        />
        {/* Left edge highlight going down */}
        <path
          d="M16 20 V212"
          stroke="url(#folderEdgeGlowLeftHero)"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Folder name */}
        <text
          x="170"
          y="160"
          textAnchor="middle"
          fill="white"
          fontSize="18"
          fontWeight="600"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {name}
        </text>

        {/* Item count */}
        <text
          x="170"
          y="185"
          textAnchor="middle"
          fill="white"
          fillOpacity="0.7"
          fontSize="13"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {items} memories
        </text>
      </svg>
    </div>
  );
}

// Plane/Email Card Component - VERTICAL/PORTRAIT shape (tall)
function PlaneCard({
  delay = 0,
  className = "",
}: {
  delay?: number;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`
        absolute transition-all duration-700 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}
        ${className}
      `}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Border glow - top left */}
      <div
        className="absolute -top-px -left-px w-16 h-12 rounded-xl blur-[0.5px]"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.2) 30%, transparent 60%)",
        }}
      />
      {/* Border glow - bottom right */}
      <div
        className="absolute -bottom-px -right-px w-10 h-8 rounded-xl blur-[0.5px]"
        style={{
          background:
            "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 30%, transparent 60%)",
        }}
      />
      <div
        className="relative w-[120px] sm:w-[140px] h-[160px] sm:h-[180px] p-3 rounded-xl
        bg-gradient-to-br from-surface-elevated to-surface
        border border-white/10
        shadow-[0_8px_32px_rgba(0,0,0,0.5)]
        flex flex-col overflow-hidden"
      >
        {/* Inner glow overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />
        <div className="flex gap-2 items-center mb-1">
          <div className="w-9 h-9 sm:w-7 sm:h-7 rounded-md bg-accent/15 flex items-center justify-center mb-2">
            <Save className="w-4 h-4 sm:w-4 sm:h-4 text-accent" />
          </div>
          <div className="">
            <p className="text-[10px] sm:text-xs font-medium text-foreground">
              Quick Save
            </p>
            <p className="text-[8px] sm:text-[9px] text-foreground-muted mb-2">
              Instant sync
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-1.5 w-full rounded bg-foreground/5" />
          <div className="h-1.5 w-3/4 rounded bg-foreground/5" />
          <div className="h-1.5 w-1/2 rounded bg-foreground/5" />
        </div>
      </div>
    </div>
  );
}

// AI Icon Badge - colored background with white icon and shiny glow
function AIBadge({
  icon: Icon,
  name,
  bgColor,
  bgGradient,
  shinePosition = "tl",
  delay = 0,
  className = "",
}: {
  icon: React.ComponentType<{
    className?: string;
  }>;
  name: string;
  bgColor: string;
  bgGradient?: string;
  shinePosition?: "tl" | "tr" | "bl" | "br";
  delay?: number;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Gradient and shine positions based on shinePosition
  const gradientMap = {
    tl: "to bottom right",
    tr: "to bottom left",
    bl: "to top right",
    br: "to top left",
  };

  const shinePositionMap = {
    tl: "-top-2 -left-2",
    tr: "-top-2 -right-2",
    bl: "-bottom-2 -left-2",
    br: "-bottom-2 -right-2",
  };

  const borderGradientMap = {
    tl: "135deg",
    tr: "225deg",
    bl: "45deg",
    br: "315deg",
  };

  // Use custom gradient if provided, otherwise generate from bgColor
  const backgroundStyle = bgGradient
    ? bgGradient
    : `linear-gradient(${gradientMap[shinePosition]}, ${bgColor} 0%, ${bgColor} 40%, color-mix(in srgb, ${bgColor} 70%, black) 100%)`;

  return (
    <div
      className={`
        absolute flex flex-col items-center gap-1.5
        transition-all duration-500 ease-out
        ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-75"}
        ${className}
      `}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Outer border with bright white shine on one corner */}
      <div
        className="relative p-[0.5px] rounded-2xl"
        style={{
          background: `linear-gradient(${borderGradientMap[shinePosition]}, #ffffff 0%, rgba(255,255,255,0.8) 15%, rgba(255,255,255,0.2) 35%, transparent 50%)`,
        }}
      >
        {/* Main badge */}
        <div
          className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center overflow-hidden"
          style={{
            background: backgroundStyle,
            boxShadow: `0 4px 16px ${bgColor}30`,
          }}
        >
          {/* Subtle shine spot */}
          <div
            className={`absolute ${shinePositionMap[shinePosition]} w-8 h-8 rounded-full blur-lg opacity-30`}
            style={{ backgroundColor: "white" }}
          />
          {/* Very subtle top gradient for depth */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background: `linear-gradient(${gradientMap[shinePosition]}, rgba(255,255,255,0.15) 0%, transparent 50%)`,
            }}
          />
          {/* Icon */}
          <Icon className="relative z-10 w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </div>
      </div>
      <span className="text-[9px] sm:text-[10px] font-medium text-foreground-muted">
        {name}
      </span>
    </div>
  );
}

// Main Hero Cards Stack Component
export function HeroCards() {
  const { ref, isInView } = useInView<HTMLDivElement>({ threshold: 0.1 });
  const prefersReducedMotion = useReducedMotion();

  // Pause floating animation when not in view or user prefers reduced motion
  const shouldAnimate = isInView && !prefersReducedMotion;

  return (
    <div
      ref={ref}
      className="relative w-full h-[380px] sm:h-[420px] lg:h-[460px] flex items-center justify-center"
    >
      {/* Enhanced glow background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible">
        {/* Primary large glow - accent color */}
        <div className="absolute w-150 h-150 sm:w-225 sm:h-225 rounded-full bg-accent/15 blur-[150px]" />
        {/* Secondary intense glow - center */}
        <div className="absolute w-100 h-100 sm:w-150 sm:h-150 rounded-full bg-accent/20 blur-[100px]" />
        {/* Accent glow layer */}
        <div className="absolute w-75 h-75 sm:w-112.5 sm:h-112.5 rounded-full bg-accent/25 blur-[80px] translate-y-5" />
        {/* Purple accent glow - left */}
        <div className="absolute w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] rounded-full bg-orange-300/10 blur-[100px] -translate-x-[150px] -translate-y-[80px]" />
        {/* Blue accent glow - right */}
        <div className="absolute w-75 h-75 sm:w-112.5 sm:h-112.5 rounded-full bg-orange-300/10 blur-[100px] translate-x-[150px] translate-y-[50px]" />
        {/* Warm highlight glow */}
        <div className="absolute w-50 h-50 sm:w-75 sm:h-75 rounded-full bg-orange-300/15 blur-[60px] -translate-y-[30px]" />
      </div>

      {/* Card Stack Container */}
      <div className="relative w-full scale-110 max-w-150 h-full flex items-center justify-center">
        {/* File Card - Left side, behind folder */}
        <FileCard
          filename="preferences.json"
          lines={7}
          delay={400}
          className="
            -translate-x-14 rotate-[-10deg] sm:-translate-x-25
            translate-y-[-70px] sm:-translate-y-25
            z-10
          "
        />

        {/* Memory Card - Right side, behind folder */}
        <MemoryCard
          title="TypeScript"
          content="User prefers strict mode enabled. Always use strict: true in tsconfig.json"
          category="preference"
          delay={500}
          className="
            translate-x-16 rotate-[20deg] md:rotate-[10deg] sm:translate-x-[80px]
            translate-y-[-70px] sm:-translate-y-25
            z-20
          "
        />

        {/* Plane Card - Right bottom, behind folder */}
        <PlaneCard
          delay={650}
          className="
            translate-x-0 -rotate-3 sm:-translate-x-[30px]
            translate-y-[-50px] sm:translate-y-[-90px]
            z-30
          "
        />

        {/* Folder - Center front */}
        <FolderCard name="memcontext" items={24} delay={200} className="z-40" />

        {/* AI Icons - positioned around the stack, rotated, closer to folder */}
        <AIBadge
          icon={RiClaudeLine}
          name="Claude"
          bgColor="#D97757"
          shinePosition="tr"
          delay={850}
          className="
            -translate-x-[140px] sm:-translate-x-[225px]
            -translate-y-[25px] sm:-translate-y-[130px]
            rotate-[-12deg]
            z-50
          "
        />

        <AIBadge
          icon={SiOpenai}
          name="ChatGPT"
          bgColor="#10A37F"
          shinePosition="tl"
          delay={950}
          className="
            translate-x-[140px] sm:translate-x-[205px]
            -translate-y-[35px] sm:-translate-y-25
            rotate-[20deg]
            z-50
          "
        />

        <AIBadge
          icon={SiGooglegemini}
          name="Gemini"
          bgColor="#3b82f6"
          bgGradient="linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)"
          shinePosition="bl"
          delay={1050}
          className="
            translate-x-[130px] sm:translate-x-[175px]
            translate-y-[110px] sm:translate-y-[70px]
            rotate-[-15deg]
            z-50
          "
        />

        <AIBadge
          icon={({ className }: { className?: string }) => (
            <Cursor size={32} className={className} />
          )}
          name="Cursor"
          bgColor="#1a1a1a"
          shinePosition="br"
          delay={1150}
          className="
            -translate-x-[130px] sm:-translate-x-[190px]
            translate-y-25 sm:translate-y-[60px]
            rotate-[-8deg]
            z-50
          "
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {PARTICLE_POSITIONS.map((particle, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 rounded-full bg-accent/30 will-change-transform ${shouldAnimate ? "animate-float" : ""}`}
            style={{
              left: particle.left,
              top: particle.top,
              animationDuration: particle.duration,
              animationDelay: particle.delay,
            }}
          />
        ))}
      </div>
    </div>
  );
}
