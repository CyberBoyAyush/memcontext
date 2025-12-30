"use client";

import {
  Brain,
  Sparkles,
  Search,
  RefreshCcw,
  Shield,
  GitBranch,
  LucideIcon,
  Plus,
} from "lucide-react";
import { SiOpenai } from "react-icons/si";
import { RiClaudeLine } from "react-icons/ri";
import { VscCopilot, VscVscode } from "react-icons/vsc";
import { GrTopCorner } from "react-icons/gr";
import { ReactNode } from "react";
import { BsFillCursorFill } from "react-icons/bs";
import { IoLockClosed, IoShield } from "react-icons/io5";
import Image from "next/image";

interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
  visual: ReactNode;
}

interface BentoCardProps {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}

function BentoCard({
  title,
  description,
  children,
  className = "",
}: BentoCardProps) {
  return (
    <div className={`relative group ${className}`}>
      {/* Top Card with Visual - shorter aspect ratio */}
      <div className="relative rounded-xl border border-white/10 bg-border-hover/30 overflow-hidden aspect-[4/3]">
        {/* L-shaped corner brackets using GrTopCorner */}
        <div className="absolute inset-0 pointer-events-none bg-background/80 rounded-xl border border-white/10 m-2">
          {/* Top Left */}
          <GrTopCorner className="absolute top-2 left-2 w-4 h-4 text-foreground-muted" />
          {/* Top Right */}
          <GrTopCorner className="absolute top-2 right-2 w-4 h-4 text-foreground-muted rotate-90" />
          {/* Bottom Right */}
          <GrTopCorner className="absolute bottom-2 right-2 w-4 h-4 text-foreground-muted rotate-180" />
          {/* Bottom Left */}
          <GrTopCorner className="absolute bottom-2 left-2 w-4 h-4 text-foreground-muted -rotate-90" />
        </div>

        {/* Visual Content */}
        <div className="relative w-full h-full flex items-center justify-center p-6">
          {children}
        </div>
      </div>

      {/* Bottom Folder Shape - Coral with glass effect */}
      <div className="relative -mt-4">
        {/* Folder SVG shape */}
        <svg
          viewBox="0 0 300 120"
          fill="none"
          preserveAspectRatio="none"
          className="w-full h-auto relative z-10 drop-shadow-[0_8px_24px_rgba(232,97,60,0.3)]"
        >
          <defs>
            {/* Coral/Orange gradient with glass effect - lower opacity */}
            <linearGradient
              id="folderGradientFeature"
              x1="0"
              y1="0"
              x2="300"
              y2="120"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#E8613C" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#C94E2E" stopOpacity="0.75" />
            </linearGradient>
            {/* Glass shine overlay on top-left */}
            <radialGradient
              id="folderGlowFeature"
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
            {/* Top edge glow gradient - horizontal */}
            <linearGradient
              id="folderEdgeGlowFeature"
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
            {/* Left edge glow gradient - vertical */}
            <linearGradient
              id="folderEdgeGlowLeft"
              x1="0"
              y1="0"
              x2="0"
              y2="120"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="white" stopOpacity="0.6" />
              <stop offset="40%" stopColor="white" stopOpacity="0.2" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Folder body with notch/tab on top-left - shorter diagonal */}
          <path
            d="M0 12
               C0 6 4 2 10 2
               H80
               Q90 2 94 8
               L100 16
               Q104 22 114 22
               H290
               C295.5 22 300 26.5 300 32
               V112
               C300 116.4 296.4 120 292 120
               H8
               C3.6 120 0 116.4 0 112
               V12Z"
            fill="url(#folderGradientFeature)"
          />
          {/* Glow overlay */}
          <path
            d="M0 12
               C0 6 4 2 10 2
               H80
               Q90 2 94 8
               L100 16
               Q104 22 114 22
               H290
               C295.5 22 300 26.5 300 32
               V112
               C300 116.4 296.4 120 292 120
               H8
               C3.6 120 0 116.4 0 112
               V12Z"
            fill="url(#folderGlowFeature)"
          />
          {/* Top edge highlight with glow on left */}
          <path
            d="M0 12
               C0 6 4 2 10 2
               H80
               Q90 2 94 8
               L100 16
               Q104 22 114 22
               H290
               C295.5 22 300 26.5 300 32"
            stroke="url(#folderEdgeGlowFeature)"
            strokeWidth="1.5"
            fill="none"
          />
          {/* Left edge highlight going down */}
          <path
            d="M0 12 V112"
            stroke="url(#folderEdgeGlowLeft)"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>

        {/* Text content */}
        <div className="absolute inset-0 flex flex-col justify-center px-4 pt-8 pb-4 z-20">
          <h3 className="text-base sm:text-xl font-semibold mb-1 text-white ">
            {title}
          </h3>
          <p className="text-sm leading-tight text-white/70">{description}</p>
        </div>
      </div>
    </div>
  );
}

// Visual Components

function IntelligentMemoryVisual() {
  const gridSize = 7;

  // Get distance from center (3,3)
  const getDistanceFromCenter = (row: number, col: number) => {
    return Math.sqrt(Math.pow(row - 3, 2) + Math.pow(col - 3, 2));
  };

  // Determine opacity based on distance - center bright, edges fade
  const getOpacity = (row: number, col: number) => {
    const dist = getDistanceFromCenter(row, col);
    if (dist === 0) return 1;
    if (dist <= 1.5) return 0.6;
    if (dist <= 2.2) return 0.55;
    if (dist <= 3) return 0.3;
    if (dist <= 3.6) return 0.15;
    return 0.08;
  };

  // Some cells are brighter (lit), creating the cross pattern
  const isHighlight = (row: number, col: number) => {
    const dist = getDistanceFromCenter(row, col);
    return dist <= 2.5;
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Radial fade background - positioned top right */}
      <div
        className="absolute -top-12 -right-12 w-32 h-32"
        style={{
          background:
            "radial-gradient(circle at center, rgba(232,97,60,0.2) 0%, rgba(232,97,60,0.08) 40%, transparent 70%)",
        }}
      />

      {/* Glass tile grid - positioned top right */}
      <div className="absolute -top-12 -right-12  grid grid-cols-7 gap-[3px]">
        {Array.from({ length: gridSize * gridSize }).map((_, i) => {
          const row = Math.floor(i / gridSize);
          const col = i % gridSize;
          const opacity = getOpacity(row, col);
          const highlight = isHighlight(row, col);
          const dist = getDistanceFromCenter(row, col);

          return (
            <div
              key={i}
              className="w-9 h-9 rounded-[3px]"
              style={{
                background: highlight
                  ? `linear-gradient(145deg, 
                      rgba(232, 97, 60, ${opacity}) 0%, 
                      rgba(201, 78, 46, ${opacity * 0.85}) 50%,
                      rgba(170, 60, 35, ${opacity * 0.7}) 100%)`
                  : `linear-gradient(145deg, 
                      rgba(50, 50, 50, ${opacity * 0.5}) 0%, 
                      rgba(25, 25, 25, ${opacity * 0.6}) 100%)`,
                boxShadow:
                  highlight && dist <= 2
                    ? `0 0 ${10 * opacity}px rgba(232, 97, 60, ${0.3 * opacity}), 
                     inset 0 1px 1px rgba(255,255,255,${0.25 * opacity}),
                     inset 0 -1px 1px rgba(0,0,0,${0.2 * opacity})`
                    : `inset 0 1px 1px rgba(255,255,255,${0.08 * opacity}),
                     inset 0 -1px 1px rgba(0,0,0,${0.3 * opacity})`,
                opacity: opacity < 0.1 ? opacity : 1,
              }}
            >
              {dist == 0 && (
                <div className="relative w-full h-full flex items-center justify-center">
                  <Plus className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-white/80" />
                  <BsFillCursorFill className="absolute -bottom-4 -right-4 transform -rotate-90 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-white/80" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SemanticRetrievalVisual() {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-visible">
      {/* Split glass cards container */}
      <div className="relative flex scale-110 items-center">
        {/* Left card - User query */}
        <div
          className="relative w-28 h-32 rounded-l-lg p-2 mr-[-8px] z-10"
          style={{
            background:
              "linear-gradient(135deg, rgba(60,60,60,0.6) 0%, rgba(40,40,40,0.4) 100%)",
            backdropFilter: "blur(8px)",
            boxShadow:
              "inset 0 1px 1px rgba(255,255,255,0.1), 0 4px 20px rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div className="py-1">
            <p className="text-[11px] text-white/90 font-medium mb-1">Query:</p>
            <p className="text-[9px] text-white/70 leading-relaxed">
              How do I <span className="text-white/90">handle auth</span> in
              this project?
            </p>
            <p className="text-[9px] text-white/50 mt-1 leading-relaxed">
              Looking for authentication approach...
            </p>
          </div>
        </div>

        {/* Center divider with glow dot */}
        <div className="relative z-20 flex flex-col items-center mx-1">
          <div className="w-[1px] h-24 bg-linear-to-b from-transparent via-white/30 to-transparent" />
          <div className="w-2 h-2 rounded-full bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
          <div className="w-[1px] h-24 bg-linear-to-b from-transparent via-white/30 to-transparent" />
        </div>

        {/* Right card - Semantic match */}
        <div
          className="relative w-28 h-32 rounded-r-lg p-3 ml-[-8px]"
          style={{
            background:
              "linear-gradient(135deg, rgba(50,50,50,0.5) 0%, rgba(30,30,30,0.3) 100%)",
            backdropFilter: "blur(8px)",
            boxShadow:
              "inset 0 1px 1px rgba(255,255,255,0.08), 0 4px 20px rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <p className="text-[11px] text-[#E8613C]/90 font-medium mb-1">
            Found:
          </p>
          <p className="text-[9px] text-white/60 leading-relaxed">
            <span className="text-[#E8613C]/80 text-[10px]">JWT token</span>{" "}
            preferences saved on Mar 12
          </p>
          <p className="text-[9px] text-white/40 mt-1 leading-relaxed">
            Use refresh tokens, 15min expiry...
          </p>
        </div>
      </div>
    </div>
  );
}

function PowerfulSearchVisual() {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Flowing wave lines */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 200 150"
        preserveAspectRatio="none"
      >
        {/* Wave line 1 */}
        <path
          d="M0 70 Q50 50, 100 70 T200 70"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
        {/* Wave line 2 */}
        <path
          d="M0 120 Q50 100, 100 120 T200 120"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
      </svg>

      {/* Glass cards with connection dots */}

      {/* Card 1 - Top left with Search icon */}
      <div className="absolute top-2 left-4">
        <div
          className="w-16 h-12 rounded-lg flex items-center justify-center"
          style={{
            background:
              "linear-gradient(145deg, rgba(60,60,60,0.5) 0%, rgba(35,35,35,0.4) 100%)",
            boxShadow:
              "inset 0 1px 1px rgba(255,255,255,0.1), 0 4px 15px rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        ></div>
        {/* Connection line down */}
        <div className="absolute left-1/2 -translate-x-1/2 top-12 w-[1px] h-6 bg-gradient-to-b from-white/20 to-transparent" />
        {/* Connection dot */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[70px] w-2.5 h-2.5 rounded-full bg-[#E8613C] shadow-[0_0_8px_rgba(232,97,60,0.8)]">
          <div className="absolute inset-0.5 rounded-full bg-[#E8613C]/60" />
        </div>
      </div>

      {/* Card 2 - Top right */}
      <div className="absolute top-8 right-6">
        <div
          className="w-14 h-10 rounded-lg"
          style={{
            background:
              "linear-gradient(145deg, rgba(55,55,55,0.5) 0%, rgba(30,30,30,0.4) 100%)",
            boxShadow:
              "inset 0 1px 1px rgba(255,255,255,0.08), 0 4px 15px rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        />
        {/* Connection line down */}
        <div className="absolute left-1/2 -translate-x-1/2 top-10 w-[1px] h-10 bg-gradient-to-b from-white/15 to-transparent" />
        {/* Connection dot */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[76px] w-2 h-2 rounded-full bg-[#E8613C]/80 shadow-[0_0_6px_rgba(232,97,60,0.6)]" />
      </div>

      {/* Card 3 - Center */}
      <div className="absolute rotate-180 top-22 left-28 -translate-x-1/2">
        <div
          className="w-20 h-14 rounded-xl"
          style={{
            background:
              "linear-gradient(145deg, rgba(65,65,65,1) 0%, rgba(40,40,40,0.7) 100%)",
            boxShadow:
              "inset 0 1px 1px rgba(255,255,255,0.1), 0 4px 15px rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Search className="w-6 h-6 absolute -top-2 -left-2 rotate-180 text-foreground" />
        </div>
        {/* Connection line up */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-4 w-[1px] h-4 bg-gradient-to-t from-white/20 to-transparent" />
        {/* Connection dot top */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-5 w-2 h-2 rounded-full bg-[#E8613C]/90 shadow-[0_0_8px_rgba(232,97,60,1)]" />
      </div>

      {/* Card 4 - Bottom right */}
      <div className="absolute rotate-180 bottom-14 right-2">
        <div
          className="w-12 h-10 rounded-lg"
          style={{
            background:
              "linear-gradient(145deg, rgba(50,50,50,0.4) 0%, rgba(28,28,28,0.3) 100%)",
            boxShadow:
              "inset 0 1px 1px rgba(255,255,255,0.06), 0 4px 15px rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        />
        {/* Connection line up */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-6 w-[1px] h-6 bg-gradient-to-t from-white/15 to-transparent" />
        {/* Connection dot */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-7 w-2 h-2 rounded-full bg-[#E8613C]/60 shadow-[0_0_5px_rgba(232,97,60,0.4)]" />
      </div>
    </div>
  );
}

function AutoUpdatesVisual() {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Left card - Settings card with skeleton, fading on left */}
      <div className="absolute scale-125 left-2 top-1/2 -translate-y-1/2">
        <div
          className="w-28 h-32 rounded-xl overflow-hidden p-2.5 relative"
          style={{
            background:
              "linear-gradient(145deg, rgba(55,55,55,0.6) 0%, rgba(35,35,35,0.5) 100%)",
            boxShadow:
              "inset 0 1px 1px rgba(255,255,255,0.1), 0 4px 15px rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.1)",
            maskImage:
              "linear-gradient(to right, transparent 0%, black 30%, black 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 30%, black 100%)",
          }}
        >
          {/* Skeleton header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded bg-white/10" />
            <div className="flex-1">
              <div className="h-1.5 w-12 bg-white/15 rounded mb-1" />
              <div className="h-1 w-8 bg-white/10 rounded" />
            </div>
          </div>

          {/* Skeleton content lines */}
          <div className="space-y-2 mb-3">
            <div className="h-1.5 w-full bg-white/10 rounded" />
            <div className="h-1.5 w-4/5 bg-white/8 rounded" />
            <div className="h-1.5 w-3/5 bg-white/6 rounded" />
          </div>

          {/* Button at bottom - Coral glowing like + button */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5">
            <div
              className="rounded-md px-2 py-1.5 text-[7px] text-white font-medium text-center"
              style={{
                background:
                  "linear-gradient(145deg, rgba(232, 97, 60, 0.9) 0%, rgba(201, 78, 46, 0.85) 50%, rgba(170, 60, 35, 0.8) 100%)",

                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              Update Preference
            </div>
          </div>
        </div>

        {/* Cursor pointer */}
        <div className="absolute bottom-0 right-0 translate-x-1 translate-y-1">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="white"
            className="drop-shadow-lg opacity-90"
          >
            <path d="M4 4l16 8-8 2-2 8z" />
          </svg>
        </div>
      </div>

      {/* Center sync icon */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 ml-4 -translate-y-1/2 z-10">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background:
              "linear-gradient(145deg, rgba(25,25,25,0.95) 0%, rgba(15,15,15,0.98) 100%)",
            boxShadow:
              "0 4px 20px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <RefreshCcw className="w-4 h-4 text-[#E8613C]" strokeWidth={2.5} />
        </div>
      </div>

      {/* Right side - Stacked memory cards */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center">
        <p className="text-[7px] text-white/40 mb-2 tracking-wide">
          Memory Updates
        </p>

        {/* Card stack container */}
        <div className="relative h-28 w-28">
          {/* Card 3 - Oldest (bottom, most faded) */}
          <div
            className="absolute top-0 right-4 w-24 rounded-lg p-2"
            style={{
              background:
                "linear-gradient(145deg, rgba(35,35,35,0.3) 0%, rgba(25,25,25,0.2) 100%)",
              border: "1px solid rgba(255,255,255,0.05)",
              opacity: 0.4,
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-3 h-3 rounded-full bg-white/10" />
              <div className="h-1 w-10 bg-white/10 rounded" />
            </div>
            <div className="text-[6px] text-white/30">v1: Tabs enabled</div>
          </div>

          {/* Card 2 - Middle */}
          <div
            className="absolute top-6 right-2 w-24 rounded-lg p-2"
            style={{
              background:
                "linear-gradient(145deg, rgba(45,45,45,0.5) 0%, rgba(30,30,30,0.4) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              opacity: 0.7,
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-3.5 h-3.5 rounded-full bg-white/15 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
              </div>
              <div className="h-1 w-12 bg-white/15 rounded" />
            </div>
            <div className="text-[6px] text-white/40">v2: Tabs → 2 spaces</div>
          </div>

          {/* Card 1 - Latest (top, most visible) */}
          <div
            className="absolute top-12 right-0 w-26 rounded-lg p-2.5"
            style={{
              background:
                "linear-gradient(145deg, rgba(55,55,55,0.7) 0%, rgba(40,40,40,1) 100%)",
              boxShadow:
                "0 4px 15px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded-full bg-[#E8613C]/20 flex items-center justify-center">
                <RefreshCcw className="w-3 h-3 text-[#E8613C]" />
              </div>
              <div>
                <p className="text-[9px] text-white/90 font-medium">Latest</p>
                <p className="text-[7px] text-white/50">Just now</p>
              </div>
            </div>
            <div className="text-[7px] text-[#E8613C]/80 font-medium">
              v3: Tabs → 4 spaces
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EncryptedPrivateVisual() {
  return (
    <div className="relative w-full h-full scale-130 flex items-center justify-center overflow-hidden">
      {/* Layered shields - outer to inner, progressively more opaque */}

      {/* Shield 5 - Outermost, most faded */}
      <IoShield className="absolute w-44 h-44 text-[#E8613C]/[0.03]" />

      {/* Shield 4 */}
      <IoShield className="absolute w-36 h-36 text-[#E8613C]/[0.06]" />

      {/* Shield 3 */}
      <IoShield className="absolute w-28 h-28 text-[#E8613C]/[0.1]" />

      {/* Shield 2 */}
      <IoShield className="absolute w-20 h-20 text-[#E8613C]/[0.18]" />

      {/* Shield 1 - Main shield, most opaque */}
      <div className="relative">
        <IoShield className="w-14 h-14 text-[#E8613C]/30" />

        {/* Lock icon in center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <IoLockClosed className="w-5 h-5 text-white/90" />
        </div>
      </div>
    </div>
  );
}

// Custom icon components for CrossToolSyncVisual
const CursorIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 466.73 532.09" fill="currentColor" className={className}>
    <path d="M457.43,125.94L244.42,2.96c-6.84-3.95-15.28-3.95-22.12,0L9.3,125.94c-5.75,3.32-9.3,9.46-9.3,16.11v247.99c0,6.65,3.55,12.79,9.3,16.11l213.01,122.98c6.84,3.95,15.28,3.95,22.12,0l213.01-122.98c5.75-3.32,9.3-9.46,9.3-16.11v-247.99c0-6.65-3.55-12.79-9.3-16.11h-.01ZM444.05,151.99l-205.63,356.16c-1.39,2.4-5.06,1.42-5.06-1.36v-233.21c0-4.66-2.49-8.97-6.53-11.31L24.87,145.67c-2.4-1.39-1.42-5.06,1.36-5.06h411.26c5.84,0,9.49,6.33,6.57,11.39h-.01Z" />
  </svg>
);

const OpenCodeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 240 300" fill="none" className={className}>
    <path d="M180 240H60V120H180V240Z" fill="#4B4646" />
    <path d="M180 60H60V240H180V60ZM240 300H0V0H240V300Z" fill="currentColor" />
  </svg>
);

const DroidIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 67 65" fill="currentColor" className={className}>
    <path d="M47.75 11.15a.867.867 0 0 1-.671-.806.84.84 0 0 1 .067-.362c1.688-4.007 2.433-7.213 1.23-8.555-3.183-3.56-15.952 3.52-20.024 5.919a.9.9 0 0 1-1.273-.41c-1.711-3.998-3.51-6.78-5.334-6.9-4.833-.323-8.73 13.49-9.87 17.992a.85.85 0 0 1-.459.563.9.9 0 0 1-.737.027c-4.109-1.647-7.398-2.373-8.773-1.2-3.651 3.104 3.609 15.557 6.068 19.528a.85.85 0 0 1-.11 1.031.9.9 0 0 1-.31.21C3.455 39.856.604 41.61.478 43.389c-.329 4.713 13.834 8.513 18.452 9.625q.186.046.337.163a.87.87 0 0 1 .332.642.84.84 0 0 1-.067.362c-1.688 4.007-2.433 7.214-1.23 8.555 3.183 3.561 15.954-3.519 20.025-5.917a.9.9 0 0 1 1.058.107.9.9 0 0 1 .215.302c1.711 3.997 3.509 6.779 5.334 6.9 4.833.322 8.73-13.49 9.868-17.993a.85.85 0 0 1 .168-.33.88.88 0 0 1 .659-.324.9.9 0 0 1 .371.066c4.109 1.647 7.397 2.372 8.773 1.2 3.651-3.105-3.61-15.559-6.07-19.53a.85.85 0 0 1 .111-1.03.9.9 0 0 1 .31-.21c4.1-1.67 6.952-3.424 7.075-5.203.331-4.713-13.833-8.513-18.45-9.623m-5.546-4.518c.93 1.624-3.858 12.446-7.42 20.015a.7.7 0 0 1-.28.303.71.71 0 0 1-.796-.059.7.7 0 0 1-.23-.341c-1.439-4.921-3.082-10.704-4.841-15.612a.84.84 0 0 1 .01-.594.87.87 0 0 1 .401-.446c4.392-2.34 11.908-5.446 13.156-3.266m-21.048 1.34c1.833.507 6.294 11.46 9.264 19.268a.67.67 0 0 1-.2.754.71.71 0 0 1-.794.08c-4.589-2.485-9.94-5.444-14.743-7.702a.87.87 0 0 1-.422-.427.84.84 0 0 1-.04-.591c1.414-4.679 4.471-12.063 6.935-11.383M7.243 23.433c1.664-.906 12.762 3.763 20.522 7.235.13.058.239.154.311.274a.67.67 0 0 1-.06.776.7.7 0 0 1-.35.225c-5.045 1.403-10.976 3.006-16.01 4.721a.9.9 0 0 1-.607-.01.88.88 0 0 1-.456-.391c-2.395-4.284-5.586-11.613-3.35-12.83M8.617 43.96c.519-1.788 11.752-6.14 19.758-9.035a.72.72 0 0 1 .773.195.67.67 0 0 1 .081.774c-2.548 4.475-5.582 9.694-7.898 14.377a.87.87 0 0 1-.437.413.9.9 0 0 1-.607.039c-4.797-1.37-12.37-4.36-11.67-6.763m15.855 13.568c-.93-1.623 3.859-12.446 7.42-20.014a.7.7 0 0 1 .28-.303.715.715 0 0 1 .796.059.7.7 0 0 1 .23.34c1.439 4.92 3.083 10.705 4.841 15.613a.84.84 0 0 1-.01.593.87.87 0 0 1-.402.445c-4.391 2.335-11.908 5.447-13.15 3.267zm21.049-1.34c-1.836-.506-6.297-11.461-9.266-19.269a.67.67 0 0 1 .2-.755.71.71 0 0 1 .795-.078c4.587 2.484 9.94 5.445 14.742 7.703.189.088.339.24.423.426a.84.84 0 0 1 .039.592c-1.413 4.686-4.47 12.063-6.933 11.381m13.912-15.462c-1.665.907-12.762-3.763-20.523-7.236a.7.7 0 0 1-.311-.273.67.67 0 0 1 .06-.777.7.7 0 0 1 .35-.225c5.046-1.402 10.975-3.005 16.009-4.72a.9.9 0 0 1 .609.01.88.88 0 0 1 .457.392c2.393 4.282 5.584 11.613 3.349 12.829M58.06 20.2c-.521 1.79-11.753 6.14-19.759 9.036a.72.72 0 0 1-.774-.195.67.67 0 0 1-.08-.776c2.547-4.474 5.581-9.694 7.897-14.377a.87.87 0 0 1 .437-.412.9.9 0 0 1 .607-.038c4.797 1.377 12.37 4.359 11.672 6.762" />
  </svg>
);

const GeminiColorIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <defs>
      <linearGradient
        gradientUnits="userSpaceOnUse"
        id="gemini-fill-0"
        x1="7"
        x2="11"
        y1="15.5"
        y2="12"
      >
        <stop stopColor="#08B962" />
        <stop offset="1" stopColor="#08B962" stopOpacity="0" />
      </linearGradient>
      <linearGradient
        gradientUnits="userSpaceOnUse"
        id="gemini-fill-1"
        x1="8"
        x2="11.5"
        y1="5.5"
        y2="11"
      >
        <stop stopColor="#F94543" />
        <stop offset="1" stopColor="#F94543" stopOpacity="0" />
      </linearGradient>
      <linearGradient
        gradientUnits="userSpaceOnUse"
        id="gemini-fill-2"
        x1="3.5"
        x2="17.5"
        y1="13.5"
        y2="12"
      >
        <stop stopColor="#FABC12" />
        <stop offset=".46" stopColor="#FABC12" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path
      d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
      fill="#3186FF"
    />
    <path
      d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
      fill="url(#gemini-fill-0)"
    />
    <path
      d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
      fill="url(#gemini-fill-1)"
    />
    <path
      d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
      fill="url(#gemini-fill-2)"
    />
  </svg>
);

function CrossToolSyncVisual() {
  // Grid configuration: 5 columns x 4 rows
  // null = empty cell, string = icon type
  type IconType =
    | "claude"
    | "openai"
    | "copilot"
    | "vscode"
    | "gemini"
    | "cursor"
    | "opencode"
    | "droid"
    | "zed";
  type CellConfig = { icon: IconType; opacity: number } | null;

  const grid: CellConfig[][] = [
    // Row 0 (top)
    [
      null,
      { icon: "copilot", opacity: 1 },
      null,
      { icon: "cursor", opacity: 1 },
      null,
    ],
    // Row 1
    [
      { icon: "gemini", opacity: 1 },
      null,
      { icon: "claude", opacity: 1 },
      null,
      { icon: "openai", opacity: 1 },
    ],
    // Row 2 - center row
    [
      null,
      { icon: "opencode", opacity: 1 },
      null,
      { icon: "droid", opacity: 1 },
      null,
    ],
    // Row 3 (bottom)
    [
      { icon: "vscode", opacity: 1 },
      null,
      { icon: "zed", opacity: 1 },
      null,
      { icon: "claude", opacity: 1 },
    ],
  ];

  const getIcon = (type: IconType) => {
    switch (type) {
      case "claude":
        return <RiClaudeLine className="w-5 h-5 text-[#D97757]" />;
      case "openai":
        return <SiOpenai className="w-5 h-5 text-[#10A37F]" />;
      case "copilot":
        return <VscCopilot className="w-5 h-5 text-white" />;
      case "vscode":
        return <VscVscode className="w-5 h-5 text-[#007ACC]" />;
      case "gemini":
        return <GeminiColorIcon className="w-5 h-5" />;
      case "cursor":
        return <CursorIcon className="w-5 h-5 text-white" />;
      case "opencode":
        return <OpenCodeIcon className="w-5 h-5 text-white" />;
      case "droid":
        return <DroidIcon className="w-5 h-5 text-[#E8613C]" />;
      case "zed":
        return (
          <Image
            src="/zed.png"
            alt="Zed"
            width={20}
            height={20}
            className="w-5 h-5"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
      {/* 5x4 Grid */}
      <div className="grid scale-125 grid-cols-5 gap-2">
        {grid.flat().map((cell, i) => (
          <div
            key={i}
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              opacity: cell ? cell.opacity : 0.9,
              background: cell
                ? "linear-gradient(145deg, rgba(50,50,55,0.9) 0%, rgba(30,30,35,0.95) 100%)"
                : "linear-gradient(145deg, rgba(35,35,40,0.4) 0%, rgba(20,20,25,0.5) 100%)",
              boxShadow: cell
                ? "0 4px 12px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1)"
                : "inset 0 1px 1px rgba(255,255,255,0.03)",
              border: cell
                ? "1px solid rgba(255,255,255,0.1)"
                : "1px solid rgba(255,255,255,0.03)",
            }}
          >
            {cell && getIcon(cell.icon)}
          </div>
        ))}
      </div>
    </div>
  );
}

const features: Feature[] = [
  {
    title: "Intelligent Memory",
    description:
      "Your AI learns as you work. Preferences and context are saved automatically. Just code naturally, MemContext remembers what matters.",
    icon: Brain,
    visual: <IntelligentMemoryVisual />,
  },
  {
    title: "Semantic Retrieval",
    description:
      'Forget exact keywords. Ask "how do I handle auth?" and find your JWT preferences. Semantic search understands intent, not just words.',
    icon: Sparkles,
    visual: <SemanticRetrievalVisual />,
  },
  {
    title: "Powerful Search",
    description:
      "Search hundreds of memories in milliseconds. Filter by project or category. Context retrieved before you finish typing.",
    icon: Search,
    visual: <PowerfulSearchVisual />,
  },
  {
    title: "Auto Updates",
    description:
      "Changed your mind about tabs vs spaces? When preferences evolve, old memories update automatically. No duplicates, always current.",
    icon: RefreshCcw,
    visual: <AutoUpdatesVisual />,
  },
  {
    title: "Encrypted & Private",
    description:
      "Your memories are yours alone. Secure API keys and strict no-training policy. Your context stays private, period.",
    icon: Shield,
    visual: <EncryptedPrivateVisual />,
  },
  {
    title: "Cross-Tool Sync",
    description:
      "Claude, Cursor, Windsurf, Cline. One memory for all. Save a preference in Claude, Cursor knows it too.",
    icon: GitBranch,
    visual: <CrossToolSyncVisual />,
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-14">
          {/* Glowing badge pill */}
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
                  How It helps
                </span>
              </div>
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4 tracking-tight leading-[1.1]">
            Everything your AI needs to remember
          </h2>
          <p className="text-base sm:text-lg text-foreground-muted max-w-2xl mx-auto">
            MemContext gives your AI tools persistent memory, so you never
            repeat yourself.
          </p>
        </div>

        {/* Bento Grid - 3:3 Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {features.map((feature) => (
            <BentoCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
            >
              {feature.visual}
            </BentoCard>
          ))}
        </div>
      </div>
    </section>
  );
}
