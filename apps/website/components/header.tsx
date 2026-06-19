"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Vault,
  GitBranch,
  BookOpen,
  HelpCircle,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { BsGithub } from "react-icons/bs";

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

/* ----------------------------- Isometric art ----------------------------- */
// Two distinct iso illustrations for the dropdowns:
//   • IsoMemoryTower  — true 2:1 isometric domed cube grid (Product / Features)
//   • IsoKnowledgeStack — stacked layered document slabs (Resources / Docs)
// Both rendered in dark-only palette since the site is permanently dark.

/* -------------------------- DomedGrid (iso art) -------------------------- */

type DomedGridProps = {
  className?: string;
  gridSize?: number;
  unit?: number;
  maxHeight?: number;
  falloff?: number;
  brandRadius?: number;
};

// 2:1 isometric projection
const iso = (x: number, y: number, z: number, s: number): [number, number] => [
  (x - y) * s,
  (x + y) * 0.5 * s - z * s,
];

type Cube = { i: number; j: number; h: number; brand: boolean; order: number };

function DomedGrid({
  className,
  gridSize = 7,
  unit = 18,
  maxHeight = 1.5,
  falloff = 0.42,
  brandRadius = 1.4,
}: DomedGridProps) {
  const N = gridSize;
  const s = unit;
  const center = (N - 1) / 2;

  const cubes = useMemo<Cube[]>(() => {
    const out: Cube[] = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const dx = i - center;
        const dy = j - center;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const h = Math.max(0, maxHeight - dist * falloff);
        if (h < 0.1) continue;
        const brand =
          Math.abs(dx) < brandRadius &&
          Math.abs(dy) < brandRadius &&
          (i + j) % 2 === 0;
        out.push({ i, j, h, brand, order: i + j });
      }
    }
    return out.sort((a, b) => a.order - b.order);
  }, [N, maxHeight, falloff, brandRadius, center]);

  const origin = -N / 2;

  const plate = useMemo(() => {
    const [ax, ay] = iso(origin, origin, 0, s);
    const [bx, by] = iso(origin + N, origin, 0, s);
    const [cx, cy] = iso(origin + N, origin + N, 0, s);
    const [dx, dy] = iso(origin, origin + N, 0, s);
    return `M${ax},${ay} L${bx},${by} L${cx},${cy} L${dx},${dy} Z`;
  }, [N, s, origin]);

  const plateLines = useMemo(() => {
    const out: [number, number, number, number][] = [];
    for (let i = 0; i <= N; i++) {
      const [x1, y1] = iso(origin + i, origin, 0, s);
      const [x2, y2] = iso(origin + i, origin + N, 0, s);
      out.push([x1, y1, x2, y2]);
      const [x3, y3] = iso(origin, origin + i, 0, s);
      const [x4, y4] = iso(origin + N, origin + i, 0, s);
      out.push([x3, y3, x4, y4]);
    }
    return out;
  }, [N, s, origin]);

  // Dark palette baked in (website is always dark)
  const PLATE = "#0D0D0D";
  const PLATE_EDGE = "#262626";
  const PLATE_LINE = "rgba(255,255,255,0.04)";
  const STROKE = "#333";
  const TOP = "#1C1C1C";
  const LEFT = "#0D0D0D";
  const RIGHT = "#151515";

  // The cubes are drawn centered around (0,0) in user space. We use a tight
  // viewBox sized to the dome and rely on the consumer to position the SVG
  // (typically bottom-right of a card with overflow-hidden).
  // Approx dome footprint in user units: x ∈ [-N*s, N*s], y ∈ [-N*s*0.5, N*s*0.5 + maxHeight*s]
  const halfW = N * s;
  const topY = -(N * s * 0.5 + maxHeight * s + 4);
  const botY = N * s * 0.5 + 4;
  const vbW = halfW * 2 + 8;
  const vbH = botY - topY;

  return (
    <svg
      viewBox={`${-halfW - 4} ${topY} ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      className={className}
    >
      {/* base plate */}
      <path
        d={plate}
        fill={PLATE}
        stroke={PLATE_EDGE}
        strokeWidth={0.2}
      />
      {plateLines.map((l, k) => (
        <line
          key={k}
          x1={l[0]}
          y1={l[1]}
          x2={l[2]}
          y2={l[3]}
          stroke={PLATE_LINE}
          strokeWidth={0.5}
        />
      ))}

      {/* cubes — painter's algorithm (back-to-front) */}
      <g strokeLinejoin="round">
        {cubes.map(({ i, j, h, brand }) => {
          const w = 0.9;
          const d = 0.9;
          const X = origin + i;
          const Y = origin + j;
          const [lbx, lby] = iso(X, Y + d, 0, s);
          const [rbx, rby] = iso(X + w, Y + d, 0, s);
          const [fbx, fby] = iso(X + w, Y, 0, s);
          const [ltx, lty] = iso(X, Y + d, h, s);
          const [rtx, rty] = iso(X + w, Y + d, h, s);
          const [ftx, fty] = iso(X + w, Y, h, s);
          const [btx, bty] = iso(X, Y, h, s);
          const topFill = brand ? "#D96B3F" : TOP;
          const leftFill = brand ? "#6B2A1A" : LEFT;
          const rightFill = brand ? "#A9432A" : RIGHT;
          const stroke = brand ? "#D96B3F" : STROKE;
          const sw = brand ? 0.9 : 0.6;
          const op = brand ? 0.95 : 0.8;
          return (
            <g key={`${i}-${j}`} opacity={op}>
              <polygon
                points={`${lbx},${lby} ${rbx},${rby} ${rtx},${rty} ${ltx},${lty}`}
                fill={leftFill}
                stroke={stroke}
                strokeWidth={sw}
              />
              <polygon
                points={`${rbx},${rby} ${fbx},${fby} ${ftx},${fty} ${rtx},${rty}`}
                fill={rightFill}
                stroke={stroke}
                strokeWidth={sw}
              />
              <polygon
                points={`${ltx},${lty} ${rtx},${rty} ${ftx},${fty} ${btx},${bty}`}
                fill={topFill}
                stroke={stroke}
                strokeWidth={sw}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

// Product / Features — domed isometric cube grid
const IsoMemoryTower = ({ className }: { className?: string }) => (
  <DomedGrid
    className={className}
    gridSize={7}
    unit={18}
    maxHeight={1.6}
    falloff={0.42}
    brandRadius={1.4}
  />
);

// Resources / Docs — clean stacked isometric slabs with real 3D thickness.
const IsoKnowledgeStack = ({ className }: { className?: string }) => {
  const cx = 175;
  const baseY = 150;
  const halfW = 58; // half-width of the diamond top
  const halfH = 29; // half-height of the diamond top
  const thickness = 8; // side depth of each slab
  const gap = 16; // vertical distance between slab tops (tight stack)

  // Top face (rhombus) path for a slab whose top-center is at (cx, topCy)
  const topFace = (topCy: number) =>
    `M${cx} ${topCy} L${cx + halfW} ${topCy - halfH} L${cx} ${topCy - 2 * halfH} L${cx - halfW} ${topCy - halfH} Z`;
  // Left side face
  const leftFace = (topCy: number) =>
    `M${cx - halfW} ${topCy - halfH} L${cx} ${topCy} L${cx} ${topCy + thickness} L${cx - halfW} ${topCy - halfH + thickness} Z`;
  // Right side face
  const rightFace = (topCy: number) =>
    `M${cx} ${topCy} L${cx + halfW} ${topCy - halfH} L${cx + halfW} ${topCy - halfH + thickness} L${cx} ${topCy + thickness} Z`;

  // "Text" rows lying flat on a slab's top face, drawn in isometric space.
  // We parametrise the face with two axes from the LEFT corner:
  //   u-axis (toward TOP corner):    (+halfW, -halfH)
  //   v-axis (toward BOTTOM corner): (+halfW, +halfH)
  // A point on the face = left + u*(uVec) + v*(vVec), with u,v in [0,1].
  // Each text row is a segment at a fixed v, spanning a range of u — this
  // runs parallel to the top edge, so it reads like a line of text.
  const renderTextRows = (topCy: number, color: string) => {
    const leftX = cx - halfW;
    const leftY = topCy - halfH;
    const uX = halfW;
    const uY = -halfH;
    const vX = halfW;
    const vY = halfH;
    const point = (u: number, v: number): [number, number] => [
      leftX + uX * u + vX * v,
      leftY + uY * u + vY * v,
    ];
    // rows at increasing v (front-to-back), each with a u-range (line length)
    const rows = [
      { v: 0.3, u0: 0.18, u1: 0.82 },
      { v: 0.5, u0: 0.18, u1: 0.64 },
      { v: 0.7, u0: 0.18, u1: 0.78 },
    ];
    return rows.map((row, k) => {
      const [x1, y1] = point(row.u0, row.v);
      const [x2, y2] = point(row.u1, row.v);
      return (
        <line
          key={k}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      );
    });
  };

  // ViewBox tuned to a landscape aspect (~1.5:1) like the DomedGrid so both
  // arts render at a comparable apparent size. Content is bottom-anchored.
  const contentTop = baseY - 2 * gap - 2 * halfH;
  const contentBottom = baseY + thickness;
  const contentH = contentBottom - contentTop;
  const vbW = halfW * 2 + 30;
  const vbH = vbW / 1.3; // mild landscape ratio; keeps full stack visible
  const vbX = cx - vbW / 2;
  // bottom-anchor the content within the (taller-than-content) viewBox
  const vbY = contentBottom - vbH + (vbH - contentH) * 0.5;

  return (
    <svg
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMax meet"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Three slabs, bottom (muted) -> top (accent). Painter order: back first. */}
      {[0, 1, 2].map((i) => {
        const topCy = baseY - i * gap;
        const isTop = i === 2;
        const opacity = 0.5 + i * 0.25;

        const palette = isTop
          ? {
              top: "rgba(232,97,60,0.22)",
              left: "rgba(232,97,60,0.10)",
              right: "rgba(232,97,60,0.16)",
              stroke: "rgba(232,97,60,0.7)",
              text: "rgba(232,97,60,0.85)",
            }
          : {
              top: "rgba(255,255,255,0.05)",
              left: "rgba(0,0,0,0.45)",
              right: "rgba(0,0,0,0.30)",
              stroke: "rgba(255,255,255,0.18)",
              text: "rgba(255,255,255,0.28)",
            };

        return (
          <g key={i} opacity={opacity} strokeLinejoin="round">
            {/* sides give 3D thickness */}
            <path d={leftFace(topCy)} fill={palette.left} stroke={palette.stroke} strokeWidth={1} />
            <path d={rightFace(topCy)} fill={palette.right} stroke={palette.stroke} strokeWidth={1} />
            {/* top face */}
            <path d={topFace(topCy)} fill={palette.top} stroke={palette.stroke} strokeWidth={isTop ? 1.4 : 1} />
            {/* text rows on the page */}
            {renderTextRows(topCy, palette.text)}
          </g>
        );
      })}
    </svg>
  );
};

/* ------------------------------ Data shape ------------------------------ */

type NavItem = {
  name: string;
  href: string;
  description: string;
  icon: LucideIcon;
  external?: boolean;
};

type FeaturedItem = {
  name: string;
  href: string;
  description: string;
  external?: boolean;
};

type NavMenu = {
  label: string;
  featured: FeaturedItem & {
    illustration: (props: { className?: string }) => React.JSX.Element;
    // Per-art placement so each illustration sits correctly in the corner
    artClassName: string;
  };
  items: NavItem[];
};

const productMenu: NavMenu = {
  label: "Product",
  featured: {
    name: "Features",
    description: "Built for memory at scale",
    href: "/#features",
    illustration: IsoMemoryTower,
    // Domed grid is wide/landscape — sit it snug in the bottom-right corner
    artClassName: "-right-12 -bottom-6 w-[210px] h-[155px]",
  },
  items: [
    {
      name: "Context Vault",
      href: "/#context-vault",
      description: "Team knowledge, one source",
      icon: Vault,
    },
    {
      name: "How it Works",
      href: "/#how-it-works",
      description: "From save to recall, end to end",
      icon: GitBranch,
    },
  ],
};

const resourcesMenu: NavMenu = {
  label: "Resources",
  featured: {
    name: "Docs",
    description: "Guides, API & integrations",
    href: "https://docs.memcontext.in",
    external: true,
    illustration: IsoKnowledgeStack,
    // Slabs are taller/centered — push further into the bottom-right corner
    artClassName: "-right-10 -bottom-12 w-[185px] h-[150px]",
  },
  items: [
    {
      name: "FAQ",
      href: "/#faq",
      description: "Answers to common questions",
      icon: HelpCircle,
    },
    {
      name: "Changelog",
      href: "https://github.com/cyberboyAyush/memcontext/releases",
      description: "Recent releases & updates",
      icon: Sparkles,
      external: true,
    },
  ],
};

/* ------------------------------ Mega panel ------------------------------ */

type NavDropdownProps = {
  menu: NavMenu;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  align?: "left" | "center" | "right";
};

function NavDropdown({
  menu,
  isOpen,
  onToggle,
  onClose,
  align = "center",
}: NavDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const Featured = menu.featured.illustration;

  const FeaturedTag = menu.featured.external ? "a" : Link;
  const featuredProps = menu.featured.external
    ? {
        href: menu.featured.href,
        target: "_blank",
        rel: "noopener noreferrer",
      }
    : { href: menu.featured.href };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={onToggle}
        className={`flex items-center gap-1 text-sm lg:text-base transition-colors ${
          isOpen
            ? "text-foreground"
            : "text-foreground-muted hover:text-foreground"
        }`}
      >
        <span>{menu.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {/* Mega Panel */}
      <div
        className={`absolute top-full mt-3 w-[560px] transition-all duration-200 ${
          align === "center"
            ? "left-1/2 -translate-x-1/2 origin-top"
            : align === "right"
              ? "right-0 origin-top-right"
              : "left-0 origin-top-left"
        } ${
          isOpen
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        }`}
      >
        <div className="relative rounded-2xl bg-surface-elevated/95 backdrop-blur-xl border border-border shadow-2xl shadow-black/60 overflow-hidden">
          {/* Top edge highlight */}
          <div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 35%, rgba(255,255,255,0.1) 65%, transparent 100%)",
            }}
          />
          {/* Top-left accent glow */}
          <div
            className="absolute -top-px -left-px w-48 h-48 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at top left, rgba(232,97,60,0.16) 0%, rgba(232,97,60,0.04) 40%, transparent 70%)",
            }}
          />

          {/* Body — flex so left card height = right column's natural height */}
          <div className="relative p-1.5 flex gap-1.5 items-stretch">
            {/* Featured (left) — fixed width, height matches right column.
                overflow-hidden clips iso art to the card's rounded bounds. */}
            <FeaturedTag
              {...featuredProps}
              onClick={onClose}
              className="group/featured relative w-[240px] shrink-0 flex flex-col justify-between rounded-xl border border-border bg-surface p-4 overflow-hidden"
            >
              {/* Iso art — absolutely positioned bottom-right, overflowing card
                  edges for a smoother feel. Placement is per-illustration since
                  each art has a different shape/size. Clipped by overflow-hidden. */}
              <Featured
                className={`pointer-events-none absolute opacity-90 ${menu.featured.artClassName}`}
              />

              <div className="relative z-10">
                <div className="text-base font-semibold text-foreground">
                  {menu.featured.name}
                </div>
                <div className="text-xs text-foreground-muted mt-1 max-w-[160px] leading-relaxed">
                  {menu.featured.description}
                </div>
              </div>
              <div className="relative z-10 flex items-center gap-1 text-xs font-medium text-foreground-muted group-hover/featured:text-accent transition-colors">
                <span>Explore</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover/featured:translate-x-0.5 group-hover/featured:-translate-y-0.5 transition-transform" />
              </div>
            </FeaturedTag>

            {/* Right column — smaller cards stacked, sized to content.
                Only text color changes on hover, no bg/border animation. */}
            <div className="flex-1 flex flex-col gap-1.5">
              {menu.items.map((item) => {
                const Tag = item.external ? "a" : Link;
                const tagProps = item.external
                  ? {
                      href: item.href,
                      target: "_blank" as const,
                      rel: "noopener noreferrer",
                    }
                  : { href: item.href };
                return (
                  <Tag
                    key={item.name}
                    {...tagProps}
                    onClick={onClose}
                    className="group/item relative flex flex-col gap-1 rounded-xl border border-border bg-surface px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-foreground group-hover/item:text-accent transition-colors">
                      {item.name}
                    </span>
                    <span className="text-xs text-foreground-muted leading-relaxed">
                      {item.description}
                    </span>
                  </Tag>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Header -------------------------------- */

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleDropdown = (name: string) => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  };
  const closeDropdown = () => setOpenDropdown(null);

  return (
    <header
      className={`fixed top-0 mx-2 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "py-3 sm:py-4" : "py-2 sm:py-3"
      }`}
    >
      <nav
        className={`mx-auto max-w-5xl px-4 sm:px-6 transition-all duration-500 border rounded-xl ${
          scrolled
            ? "bg-surface/90 backdrop-blur-md border-border shadow-lg mx-4 sm:mx-6 lg:mx-auto"
            : "border-transparent bg-transparent"
        }`}
      >
        <div
          className={`relative flex items-center justify-between transition-all duration-500 ${
            scrolled ? "h-12 sm:h-14 px-2 sm:px-4" : "h-14 sm:h-16"
          }`}
        >
          {/* LEFT ZONE: Logo */}
          <div className="flex items-center">
            {/* Glass logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative">
                <div
                  className="absolute -top-[0.5px] -left-[0.5px] w-6 h-6 rounded-lg blur-[0.5px]"
                  style={{
                    background:
                      "radial-gradient(ellipse at top left, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.4) 30%, transparent 60%)",
                  }}
                />
                <div className="relative w-8 h-8 sm:w-8 sm:h-8 rounded-lg bg-surface/80 backdrop-blur-sm border border-white/10 flex items-center justify-center overflow-hidden group-hover:opacity-80 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
                  <Image
                    src="/sign.png"
                    alt="MemContext Logo"
                    width={20}
                    height={20}
                    className="w-5 h-5 sm:w-5 sm:h-5 relative z-10"
                  />
                </div>
              </div>
              <span className="font-semibold text-lg group-hover:opacity-80 transition-opacity">
                MemContext
              </span>
            </Link>
          </div>

          {/* CENTER ZONE: Grouped Navigation (absolutely centered) */}
          <div className="hidden md:flex items-center gap-5 lg:gap-7 absolute left-1/2 -translate-x-1/2">
            <NavDropdown
              menu={productMenu}
              isOpen={openDropdown === "Product"}
              onToggle={() => toggleDropdown("Product")}
              onClose={closeDropdown}
            />
            <Link
              href="/pricing"
              className="text-sm lg:text-base text-foreground-muted hover:text-foreground transition-colors link-underline"
            >
              Pricing
            </Link>
            <NavDropdown
              menu={resourcesMenu}
              isOpen={openDropdown === "Resources"}
              onToggle={() => toggleDropdown("Resources")}
              onClose={closeDropdown}
            />
          </div>

          {/* RIGHT ZONE: Social + Sign Up */}
          <div className="hidden md:flex items-center gap-4 lg:gap-5">
            <a
              href="https://aysh.me/X"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground-muted hover:text-foreground transition-colors hover:scale-110 duration-200"
            >
              <XIcon className="w-5 h-5 lg:w-[22px] lg:h-[22px]" />
            </a>
            <a
              href="https://github.com/cyberboyAyush/memcontext"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground-muted hover:text-foreground transition-colors hover:scale-110 duration-200"
            >
              <BsGithub className="w-5 h-5 lg:w-[22px] lg:h-[22px]" />
            </a>
            <a
              href="https://app.memcontext.in/login"
              className="relative group inline-block"
            >
              <div
                className="absolute -top-px -left-px w-10 h-5 rounded-lg blur-[0.5px] opacity-80 group-hover:opacity-100 transition-opacity"
                style={{
                  background:
                    "radial-gradient(ellipse at top left, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.25) 40%, transparent 70%)",
                }}
              />
              <div
                className="relative px-4 lg:px-5 py-1.5 lg:py-2 rounded-lg flex items-center justify-center gap-1.5 overflow-hidden transition-all group-hover:scale-[1.02] whitespace-nowrap"
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
                <span className="font-display font-semibold text-sm lg:text-base text-white relative z-10">
                  Sign Up
                </span>
              </div>
            </a>
          </div>

          {/* Mobile trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-foreground-muted hover:text-foreground transition-colors"
            aria-label="Toggle menu"
          >
            <div className="relative w-6 h-6">
              <Menu
                className={`w-6 h-6 absolute transition-all duration-200 ${
                  isMobileMenuOpen
                    ? "opacity-0 rotate-90"
                    : "opacity-100 rotate-0"
                }`}
              />
              <X
                className={`w-6 h-6 absolute transition-all duration-200 ${
                  isMobileMenuOpen
                    ? "opacity-100 rotate-0"
                    : "opacity-0 -rotate-90"
                }`}
              />
            </div>
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMobileMenuOpen
              ? "max-h-[800px] opacity-100"
              : "max-h-0 opacity-0"
          }`}
        >
          <div className="py-4 mt-2 rounded-xl bg-surface/95 backdrop-blur-md border border-border/50 px-2">
            {/* Product group */}
            <div className="px-3 pt-2 pb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground-muted/70">
                {productMenu.label}
              </span>
            </div>
            <Link
              href={productMenu.featured.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-surface-elevated transition-all"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface border border-border/60">
                <Sparkles className="w-4 h-4 text-foreground-muted" />
              </div>
              <span className="text-base text-foreground">
                {productMenu.featured.name}
              </span>
            </Link>
            {productMenu.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-surface-elevated transition-all"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface border border-border/60">
                    <Icon className="w-4 h-4 text-foreground-muted" />
                  </div>
                  <span className="text-base text-foreground">
                    {item.name}
                  </span>
                </Link>
              );
            })}

            {/* Pricing */}
            <div className="my-2 border-t border-border/40" />
            <Link
              href="/pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-3 text-base text-foreground hover:bg-surface-elevated rounded-lg px-3 transition-all font-medium"
            >
              Pricing
            </Link>

            {/* Resources group */}
            <div className="my-2 border-t border-border/40" />
            <div className="px-3 pt-1 pb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground-muted/70">
                {resourcesMenu.label}
              </span>
            </div>
            <a
              href={resourcesMenu.featured.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-surface-elevated transition-all"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface border border-border/60">
                <BookOpen className="w-4 h-4 text-foreground-muted" />
              </div>
              <span className="text-base text-foreground">
                {resourcesMenu.featured.name}
              </span>
            </a>
            {resourcesMenu.items.map((item) => {
              const Icon = item.icon;
              if (item.external) {
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-surface-elevated transition-all"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface border border-border/60">
                      <Icon className="w-4 h-4 text-foreground-muted" />
                    </div>
                    <span className="text-base text-foreground">
                      {item.name}
                    </span>
                  </a>
                );
              }
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-surface-elevated transition-all"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface border border-border/60">
                    <Icon className="w-4 h-4 text-foreground-muted" />
                  </div>
                  <span className="text-base text-foreground">
                    {item.name}
                  </span>
                </Link>
              );
            })}

            <div className="my-2 border-t border-border/40" />

            {/* GitHub */}
            <a
              href="https://github.com/cyberboyAyush/memcontext"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-surface-elevated transition-all"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface border border-border/60">
                <BsGithub className="w-4 h-4 text-foreground-muted" />
              </div>
              <span className="text-base text-foreground">GitHub</span>
            </a>

            {/* Sign Up CTA */}
            <a
              href="https://app.memcontext.in/login"
              className="relative group block mt-3"
            >
              <div
                className="relative w-full px-5 py-3 rounded-xl flex items-center justify-center gap-2 overflow-hidden"
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
                <span className="font-display font-semibold text-base text-white relative z-10">
                  Sign Up
                </span>
              </div>
            </a>
          </div>
        </div>
      </nav>
    </header>
  );
}
