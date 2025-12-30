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
import { SiOpenai, SiGooglegemini } from "react-icons/si";
import { RiClaudeLine } from "react-icons/ri";
import { VscCopilot } from "react-icons/vsc";
import { GrTopCorner } from "react-icons/gr";
import { ReactNode } from "react";
import { BsFillCursorFill } from "react-icons/bs";
import { IoLockClosed, IoShield } from "react-icons/io5";

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

function CrossToolSyncVisual() {
  // Grid configuration: 5 columns x 4 rows
  // null = empty cell, string = icon type, with opacity
  type CellConfig = {
    icon: "claude" | "openai" | "copilot" | "gemini";
    opacity: number;
  } | null;

  const grid: CellConfig[][] = [
    // Row 0 (top) - mostly faded/empty
    [
      null,
      { icon: "copilot", opacity: 1 },
      null,
      { icon: "gemini", opacity: 1},
      null,
    ],
    // Row 1
    [
      { icon: "gemini", opacity: 1},
      null,
      { icon: "claude", opacity: 1},
      null,
      { icon: "openai", opacity: 1 },
    ],
    // Row 2 - center row, most prominent
    [
      null,
      { icon: "openai", opacity: 1 },
      null,
      { icon: "copilot", opacity: 1},
      null,
    ],
    // Row 3 (bottom)
    [
      { icon: "claude", opacity: 1 },
      null,
      { icon: "gemini", opacity: 1},
      null,
      { icon: "claude", opacity: 1},
    ],
  ];

  const getIcon = (type: string, opacity: number) => {
    const iconOpacity = opacity > 0.5 ? 1 : opacity + 0.3;
    switch (type) {
      case "claude":
        return (
          <RiClaudeLine
            className="w-5 h-5"
            style={{ color: `rgba(217, 119, 87, 1)` }}
          />
        );
      case "openai":
        return (
          <SiOpenai
            className="w-5 h-5"
            style={{ color: `rgba(255, 255, 255, 1)` }}
          />
        );
      case "copilot":
        return (
          <VscCopilot
            className="w-5 h-5"
            style={{ color: `rgba(255, 255, 255, 1)` }}
          />
        );
      case "gemini":
        return (
          <SiGooglegemini
            className="w-5 h-5"
            style={{ color: `rgba(96, 165, 250, 1)` }}
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
            {cell && getIcon(cell.icon, cell.opacity)}
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
