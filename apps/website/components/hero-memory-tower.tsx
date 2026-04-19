"use client";

import { Claude, Cursor, Gemini, OpenAI } from "@lobehub/icons";
import { useMemo, type ReactElement } from "react";
import { motion, type Variants } from "motion/react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

// ── Palette ──────────────────────────────────────────────────────────────
const BRAND = "#A9432A";
const BRAND_HI = "#D96B3F";
const INK3 = "#1A1A1A";
const LINE2 = "#333";

// ── Projection (true 2:1 iso) ────────────────────────────────────────────
const S = 26;
const iso = (x: number, y: number, z: number, s = S) =>
  [(x - y) * s, (x + y) * 0.5 * s - z * s] as const;

// ── Cuboid renderer ──────────────────────────────────────────────────────
type Tone = {
  top: string;
  left: string;
  right: string;
  stroke: string;
  sw: number;
};
type Cuboid = {
  cx: number;
  cy: number;
  z: number;
  span: number;
  spanY?: number;
  h: number;
  tone: Tone;
  sortKey: number;
};

// ── Slab / fragment palette ──────────────────────────────────────────────
// Layered memory base: N thin slab layers stacked downward from the top plate.
// Each layer's visible side faces are rendered as a row of small brick cells
// so the base reads as a dense stack of blocks, never hollow.
const SLAB_LAYERS = 6;
const SLAB_LAYER_H = 0.46;
const SLAB_H = SLAB_LAYERS * SLAB_LAYER_H;
// two tone banks so alternating layers read differently (like bricks)
const SLAB_LEFT_A = "#0C0C0C";
const SLAB_LEFT_B = "#080808";
const SLAB_RIGHT_A = "#121212";
const SLAB_RIGHT_B = "#0E0E0E";
// recessed cell (a "missing" brick) — darker but still filled, never bg
const SLAB_LEFT_MISS = "#040404";
const SLAB_RIGHT_MISS = "#060606";
const SLAB_STROKE = "rgba(255,255,255,0.06)";
const FRAG_TONE: Tone = {
  top: "#111111",
  left: "#060606",
  right: "#0A0A0A",
  stroke: "rgba(255,255,255,0.07)",
  sw: 0.5,
};

function cuboidPolys(c: Cuboid) {
  const { cx, cy, z, span, spanY = span, h, tone } = c;
  const x0 = cx - span,
    x1 = cx + span;
  const y0 = cy - spanY,
    y1 = cy + spanY;
  const zB = z,
    zT = z + h;

  const p = (x: number, y: number, zz: number) => iso(x, y, zz);
  // bottom corners (z = zB): A back, B right, C front, D left
  // top corners    (z = zT): E back, F right, G front, H left
  const B = p(x1, y0, zB),
    C = p(x1, y1, zB),
    D = p(x0, y1, zB);
  const E = p(x0, y0, zT),
    F = p(x1, y0, zT),
    G = p(x1, y1, zT),
    H = p(x0, y1, zT);

  const poly = (pts: readonly (readonly [number, number])[]) =>
    pts.map(([x, y]) => `${x},${y}`).join(" ");

  // In standard 2:1 iso (camera looking at +x,+y,+z), the visible side faces
  // are +x (front-right) and +y (front-left). We render those two plus top.
  return {
    top: poly([E, F, G, H]),
    left: poly([D, C, G, H]), // y1 face = front-left visible face
    right: poly([B, C, G, F]), // x1 face = front-right visible face
    tone,
  };
}

function renderCuboid(c: Cuboid, key: string) {
  const { top, left, right, tone } = cuboidPolys(c);
  return (
    <g key={key} strokeLinejoin="round">
      <polygon
        points={left}
        fill={tone.left}
        stroke={tone.stroke}
        strokeWidth={tone.sw}
      />
      <polygon
        points={right}
        fill={tone.right}
        stroke={tone.stroke}
        strokeWidth={tone.sw}
      />
      <polygon
        points={top}
        fill={tone.top}
        stroke={tone.stroke}
        strokeWidth={tone.sw}
      />
    </g>
  );
}

// ── Tier config ──────────────────────────────────────────────────────────
const TIER_STROKE = { stroke: "rgba(169,67,42,0.35)", sw: 0.7 };
const TIERS: { name: string; span: number; tone: Tone }[] = [
  {
    name: "archive",
    span: 1.5,
    tone: { top: "#2A1712", left: "#140905", right: "#1E100B", ...TIER_STROKE },
  },
  {
    name: "context",
    span: 1.2,
    tone: { top: "#3B1E15", left: "#1A0D09", right: "#28140E", ...TIER_STROKE },
  },
  {
    name: "working",
    span: 0.9,
    tone: { top: "#5A2A1C", left: "#26120B", right: "#3B1D13", ...TIER_STROKE },
  },
  {
    name: "latest",
    span: 0.6,
    tone: {
      top: "#D96B3F",
      left: "#6B2A1A",
      right: "#A9432A",
      stroke: "#D96B3F",
      sw: 1.2,
    },
  },
];
const TIER_H = 0.55;

const CAP = {
  span: 0.32,
  h: 0.4,
  tone: {
    top: "#D96B3F",
    left: "#6B2A1A",
    right: "#A9432A",
    stroke: "#D96B3F",
    sw: 1.4,
  } as Tone,
};

// brand shading helpers for incoming cubes (3 tones)
const TONES = {
  warm: {
    top: "#D96B3F",
    left: "#6B2A1A",
    right: "#A9432A",
    stroke: "#D96B3F",
    sw: 0.9,
  } as Tone,
  mid: {
    top: "#A9432A",
    left: "#3A160E",
    right: "#6B2A1A",
    stroke: "#D96B3F",
    sw: 0.9,
  } as Tone,
  deep: {
    top: "#6B2A1A",
    left: "#2A0E07",
    right: "#3A160E",
    stroke: "#D96B3F",
    sw: 0.9,
  } as Tone,
};

// ── Component ────────────────────────────────────────────────────────────
export type HeroMemoryTowerProps = {
  className?: string;
  showCards?: boolean;
  showIncoming?: boolean;
  showBottomPill?: boolean;
};

export function HeroMemoryTower({
  className,
  showCards = true,
  showIncoming = true,
  showBottomPill = true,
}: HeroMemoryTowerProps) {
  const prefersReducedMotion = useReducedMotion();

  const body = useMemo(() => {
    // ── Floor ring tiles ────────────────────────────────────────────────
    type TileItem = {
      kind: "tile";
      cx: number;
      cy: number;
      z: number;
      span: number;
      h: number;
      tone: Tone;
      sortKey: number;
    };
    const tiles: TileItem[] = [];
    const FP = 0.88;
    const ringStroke = { stroke: LINE2, sw: 0.8 };
    for (let dx = -4; dx <= 4; dx++) {
      for (let dy = -4; dy <= 4; dy++) {
        const m = Math.max(Math.abs(dx), Math.abs(dy));
        if (m < 2) continue; // skip central 3x3 (reserved for tower footprint)
        const parity = (((dx + dy) % 2) + 2) % 2;
        let h = 0,
          tone: Tone | null = null;
        if (m === 2 && parity === 0) {
          h = 0.18;
          tone = {
            top: "#1F1F1F",
            left: "#101010",
            right: "#181818",
            ...ringStroke,
          };
        } else if (m === 3 && parity === 1) {
          h = 0.1;
          tone = {
            top: "#181818",
            left: "#0D0D0D",
            right: "#131313",
            ...ringStroke,
          };
        }
        if (!tone) continue;
        tiles.push({
          kind: "tile",
          cx: dx,
          cy: dy,
          z: 0,
          span: FP / 2,
          h,
          tone,
          sortKey: dx + dy,
        });
      }
    }

    // ── Base plate (diamond grid) ───────────────────────────────────────
    // 9x9 tile grid outline as a single top face at z = -0.01
    const gridLines: ReactElement[] = [];
    const half = 4.5;
    for (let i = -4.5; i <= 4.5; i += 1) {
      const a = iso(i, -half, -0.01);
      const b = iso(i, half, -0.01);
      const c = iso(-half, i, -0.01);
      const d = iso(half, i, -0.01);
      gridLines.push(
        <line
          key={`gx${i}`}
          x1={a[0]}
          y1={a[1]}
          x2={b[0]}
          y2={b[1]}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={0.5}
        />,
        <line
          key={`gy${i}`}
          x1={c[0]}
          y1={c[1]}
          x2={d[0]}
          y2={d[1]}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={0.5}
        />,
      );
    }
    const plateCorners = [
      iso(-half, -half, -0.01),
      iso(half, -half, -0.01),
      iso(half, half, -0.01),
      iso(-half, half, -0.01),
    ];
    const platePts = plateCorners.map(([x, y]) => `${x},${y}`).join(" ");

    // ── Layered slab side faces (brick-stack reading) ───────────────────
    const toPolyStr = (pts: readonly (readonly [number, number])[]) =>
      pts.map(([px, py]) => `${px},${py}`).join(" ");

    // Back filler polygon — a solid panel behind the brick grid so that even
    // if a cell is slightly offset or stroked, we never reveal the page bg.
    const slabFillerRight = toPolyStr([
      iso(half, -half, 0),
      iso(half, half, 0),
      iso(half, half, -SLAB_H),
      iso(half, -half, -SLAB_H),
    ]);
    const slabFillerLeft = toPolyStr([
      iso(-half, half, 0),
      iso(half, half, 0),
      iso(half, half, -SLAB_H),
      iso(-half, half, -SLAB_H),
    ]);

    // Missing-cell set — a few sparse "chipped" bricks on the top-most layers.
    // Each entry is `${face}:${layerIdx}:${colIdx}` where layerIdx 0 = topmost.
    // Missing-cell set — concentrated at the top layers (the build edge),
    // with a few scattered chips deeper so it feels actively under construction.
    const missing = new Set<string>([
      // top layer chips
      "r:0:1",
      "r:0:2",
      "r:0:5",
      "r:0:7",
      "l:0:0",
      "l:0:3",
      "l:0:6",
      "l:0:8",
      // second layer chips
      "r:1:0",
      "r:1:4",
      "l:1:2",
      "l:1:7",
      // a couple deep chips
      "r:2:6",
      "l:2:4",
      "r:3:1",
    ]);

    const COLS = 9; // one cell per tile column along the plate edge
    const slabCells: ReactElement[] = [];
    for (let li = 0; li < SLAB_LAYERS; li++) {
      const zTop = -li * SLAB_LAYER_H;
      const zBot = zTop - SLAB_LAYER_H;
      const altLayer = li % 2 === 0;

      for (let ci = 0; ci < COLS; ci++) {
        const a = -half + ci; // cell start along the edge axis
        const b = a + 1;
        const altCell = (li + ci) % 2 === 0;

        // Right face (x = +half), edge runs along y
        {
          const isMiss = missing.has(`r:${li}:${ci}`);
          const fill = isMiss
            ? SLAB_RIGHT_MISS
            : altCell
              ? altLayer
                ? SLAB_RIGHT_A
                : SLAB_RIGHT_B
              : altLayer
                ? SLAB_RIGHT_B
                : SLAB_RIGHT_A;
          slabCells.push(
            <polygon
              key={`sr-${li}-${ci}`}
              points={toPolyStr([
                iso(half, a, zTop),
                iso(half, b, zTop),
                iso(half, b, zBot),
                iso(half, a, zBot),
              ])}
              fill={fill}
              stroke={SLAB_STROKE}
              strokeWidth={0.5}
              strokeLinejoin="round"
            />,
          );
        }

        // Left face (y = +half), edge runs along x
        {
          const isMiss = missing.has(`l:${li}:${ci}`);
          const fill = isMiss
            ? SLAB_LEFT_MISS
            : altCell
              ? altLayer
                ? SLAB_LEFT_A
                : SLAB_LEFT_B
              : altLayer
                ? SLAB_LEFT_B
                : SLAB_LEFT_A;
          slabCells.push(
            <polygon
              key={`sl-${li}-${ci}`}
              points={toPolyStr([
                iso(a, half, zTop),
                iso(b, half, zTop),
                iso(b, half, zBot),
                iso(a, half, zBot),
              ])}
              fill={fill}
              stroke={SLAB_STROKE}
              strokeWidth={0.5}
              strokeLinejoin="round"
            />,
          );
        }
      }
    }

    // ── Construction scatter — cubes sitting on the floor around the base.
    // The "floor" plane is z = -SLAB_H (the bottom of the layered memory base).
    // Every fragment rests on that plane (its base sits at z=GZ), so cubes read
    // as placed on the ground around the build site, never floating over the
    // top plate. Positions are kept just outside the plate footprint (|x|>4.5,
    // |y|>4.5) and within a tight radius so the scatter feels clustered.
    const GZ = -SLAB_H;
    type FragSpec = {
      cx: number;
      cy: number;
      z: number;
      span: number;
      spanY?: number;
      h: number;
      dim?: boolean; // slightly dimmer sibling on a stack
    };
    // Placement is constrained to just outside the plate footprint
    //   plate covers x ∈ [-4.5, 4.5], y ∈ [-4.5, 4.5]
    // so every fragment has max(|cx|,|cy|) >= 5.0 to ensure the cube's top
    // face never overlaps the plate's top face in screen-space.
    const R = (cx: number, cy: number, s = 0.28, sy = s, h = s, dim = false) =>
      ({ cx, cy, z: GZ, span: s, spanY: sy, h, dim }) as FragSpec;
    const STK = (
      cx: number,
      cy: number,
      zBase: number,
      s: number,
      sy = s,
      h = s,
    ) =>
      ({ cx, cy, z: GZ + zBase, span: s, spanY: sy, h, dim: true }) as FragSpec;
    const fragSpecs: FragSpec[] = [
      // RIGHT flank — hugs the +x edge of the plate
      R(5.3, -1.5, 0.32, 0.28, 0.3),
      R(5.3, 0.0, 0.34, 0.3, 0.32),
      STK(5.3, 0.0, 0.32, 0.22, 0.2, 0.2),
      R(5.3, 1.6, 0.28, 0.26, 0.26),
      R(5.3, 3.0, 0.3, 0.28, 0.28),
      STK(5.3, 3.0, 0.28, 0.2, 0.2, 0.18),
      R(5.9, -0.8, 0.24, 0.26, 0.22),
      R(5.9, 2.2, 0.22, 0.24, 0.22),
      R(6.2, 0.6, 0.26, 0.24, 0.24),
      R(5.2, -3.0, 0.28, 0.24, 0.26),
      R(5.2, 4.5, 0.26, 0.26, 0.24),

      // LEFT flank — hugs the -x edge of the plate
      R(-5.3, 1.0, 0.3, 0.28, 0.3),
      STK(-5.3, 1.0, 0.3, 0.22, 0.2, 0.2),
      R(-5.3, -0.4, 0.28, 0.26, 0.26),
      R(-5.3, 2.4, 0.26, 0.28, 0.26),
      R(-5.3, -1.9, 0.32, 0.28, 0.3),
      R(-5.9, 0.3, 0.22, 0.24, 0.22),
      R(-5.9, -1.1, 0.24, 0.22, 0.22),
      R(-5.9, 1.8, 0.22, 0.26, 0.22),
      R(-5.3, 3.8, 0.28, 0.26, 0.26),
      STK(-5.3, 3.8, 0.26, 0.2, 0.18, 0.18),
      R(-5.3, -3.4, 0.26, 0.28, 0.24),
      R(-6.2, -0.2, 0.22, 0.2, 0.22),

      // FRONT edge (+y side) — a couple for balance
      R(2.2, 5.3, 0.26, 0.28, 0.26),
      R(0.4, 5.3, 0.28, 0.26, 0.26),
      STK(0.4, 5.3, 0.26, 0.2, 0.2, 0.18),
      R(-1.4, 5.3, 0.24, 0.26, 0.22),
      R(3.6, 5.3, 0.22, 0.24, 0.22),

      // BACK edge (-y side) — sparse
      R(1.4, -5.3, 0.26, 0.26, 0.24),
      R(-0.6, -5.3, 0.22, 0.24, 0.22),
      R(-2.2, -5.3, 0.28, 0.26, 0.26),
    ];
    const FRAG_TONE_DIM: Tone = {
      top: "#0E0E0E",
      left: "#040404",
      right: "#080808",
      stroke: "rgba(255,255,255,0.06)",
      sw: 0.5,
    };
    const fragments: Cuboid[] = fragSpecs.map((f) => ({
      cx: f.cx,
      cy: f.cy,
      z: f.z,
      span: f.span,
      spanY: f.spanY,
      h: f.h,
      tone: f.dim ? FRAG_TONE_DIM : FRAG_TONE,
      sortKey: f.cx + f.cy,
    }));
    // Painter sort so stacks render back → front and bases render before tops.
    fragments.sort((a, b) => a.sortKey - b.sortKey || a.z - b.z);

    // ── Tower tiers ─────────────────────────────────────────────────────
    type TierItem = { kind: "tier"; cuboid: Cuboid; idx: number };
    const tiers: TierItem[] = [];
    let z = 0;
    TIERS.forEach((t, idx) => {
      tiers.push({
        kind: "tier",
        idx,
        cuboid: {
          cx: 0,
          cy: 0,
          z,
          span: t.span,
          h: TIER_H,
          tone: t.tone,
          sortKey: 0,
        },
      });
      z += TIER_H;
    });
    const capTopZ = z + CAP.h;
    const capCuboid: Cuboid = {
      cx: 0,
      cy: 0,
      z,
      span: CAP.span,
      h: CAP.h,
      tone: CAP.tone,
      sortKey: 0,
    };

    // tier tick lines on top faces
    const tickLines: ReactElement[] = [];
    let zAcc = 0;
    TIERS.forEach((t, ti) => {
      const topZ = zAcc + TIER_H;
      const rows = Math.max(2, Math.round(t.span * 3));
      const step = (t.span * 2) / rows;
      for (let r = 1; r < rows; r++) {
        const o = -t.span + r * step;
        const a = iso(-t.span, o, topZ);
        const b = iso(t.span, o, topZ);
        const c = iso(o, -t.span, topZ);
        const d = iso(o, t.span, topZ);
        tickLines.push(
          <line
            key={`tk-${ti}-h${r}`}
            x1={a[0]}
            y1={a[1]}
            x2={b[0]}
            y2={b[1]}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={0.7}
          />,
          <line
            key={`tk-${ti}-v${r}`}
            x1={c[0]}
            y1={c[1]}
            x2={d[0]}
            y2={d[1]}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={0.7}
          />,
        );
      }
      zAcc += TIER_H;
    });

    // ── Incoming cubes ──────────────────────────────────────────────────
    const incoming = [
      { x: -2.2, y: 0.4, zBase: capTopZ + 0.5, size: 0.38, tone: TONES.warm },
      { x: 0.3, y: -2.4, zBase: capTopZ + 0.9, size: 0.34, tone: TONES.mid },
      { x: 2.0, y: 1.6, zBase: capTopZ + 0.2, size: 0.3, tone: TONES.deep },
    ];

    const capTop = iso(0, 0, capTopZ);

    // ── Painter-sort: tiles sorted by (i+j) ascending; then tower tiers in stack order
    tiles.sort((a, b) => a.sortKey - b.sortKey);

    // ── Emit iso scene (split into named stages for staged entrance) ────
    // Each stage becomes a motion.g group in render output, animated in order:
    // ground → slab base → plate → fragments → floor ring → tower tiers →
    // capstone → incoming cubes → glow → cards.
    const isoEls: ReactElement[] = []; // legacy catchall (kept for types)
    const stageGround: ReactElement[] = [];
    const stageSlab: ReactElement[] = [];
    const stagePlate: ReactElement[] = [];
    const stageFragments: ReactElement[] = [];
    const stageTiles: ReactElement[] = [];
    const stageTiers: ReactElement[] = [];
    const stageCap: ReactElement[] = [];
    const stageIncoming: ReactElement[] = [];
    const stageGlow: ReactElement[] = [];

    // -1. Ground sheet — a 3D slab (top face + two visible side faces) that
    // everything else sits on. Smaller than before so it just frames the scene,
    // and a lighter neutral tone so it reads as "floor" rather than void.
    const groundHalf = 7.5;
    const GROUND_TOP_Z = -SLAB_H;
    const GROUND_THICK = 0.35; // slab depth for the ground sheet
    const GROUND_BOTTOM_Z = GROUND_TOP_Z - GROUND_THICK;
    const GROUND_TOP = "#131313";
    const GROUND_LEFT = "#0A0A0A";
    const GROUND_RIGHT = "#0E0E0E";
    const GROUND_STROKE = "rgba(255,255,255,0.04)";
    const groundTopCorners = [
      iso(-groundHalf, -groundHalf, GROUND_TOP_Z),
      iso(groundHalf, -groundHalf, GROUND_TOP_Z),
      iso(groundHalf, groundHalf, GROUND_TOP_Z),
      iso(-groundHalf, groundHalf, GROUND_TOP_Z),
    ];
    const groundTopPts = groundTopCorners
      .map(([x, y]) => `${x},${y}`)
      .join(" ");
    // Right face (+x) and Left face (+y) side panels
    const groundRightPts = [
      iso(groundHalf, -groundHalf, GROUND_TOP_Z),
      iso(groundHalf, groundHalf, GROUND_TOP_Z),
      iso(groundHalf, groundHalf, GROUND_BOTTOM_Z),
      iso(groundHalf, -groundHalf, GROUND_BOTTOM_Z),
    ]
      .map(([x, y]) => `${x},${y}`)
      .join(" ");
    const groundLeftPts = [
      iso(-groundHalf, groundHalf, GROUND_TOP_Z),
      iso(groundHalf, groundHalf, GROUND_TOP_Z),
      iso(groundHalf, groundHalf, GROUND_BOTTOM_Z),
      iso(-groundHalf, groundHalf, GROUND_BOTTOM_Z),
    ]
      .map(([x, y]) => `${x},${y}`)
      .join(" ");
    // Subtle grid on the top face
    const groundLines: ReactElement[] = [];
    for (let i = -groundHalf; i <= groundHalf; i += 1) {
      const a = iso(i, -groundHalf, GROUND_TOP_Z);
      const b = iso(i, groundHalf, GROUND_TOP_Z);
      const c = iso(-groundHalf, i, GROUND_TOP_Z);
      const d = iso(groundHalf, i, GROUND_TOP_Z);
      groundLines.push(
        <line
          key={`ggx${i}`}
          x1={a[0]}
          y1={a[1]}
          x2={b[0]}
          y2={b[1]}
          stroke="rgba(255,255,255,0.03)"
          strokeWidth={0.5}
        />,
        <line
          key={`ggy${i}`}
          x1={c[0]}
          y1={c[1]}
          x2={d[0]}
          y2={d[1]}
          stroke="rgba(255,255,255,0.03)"
          strokeWidth={0.5}
        />,
      );
    }
    stageGround.push(
      <g key="ground" strokeLinejoin="round">
        <polygon
          points={groundLeftPts}
          fill={GROUND_LEFT}
          stroke={GROUND_STROKE}
          strokeWidth={0.5}
        />
        <polygon
          points={groundRightPts}
          fill={GROUND_RIGHT}
          stroke={GROUND_STROKE}
          strokeWidth={0.5}
        />
        <polygon
          points={groundTopPts}
          fill={GROUND_TOP}
          stroke={GROUND_STROKE}
          strokeWidth={0.5}
        />
        {groundLines}
      </g>,
    );

    // 0. slab side faces (behind the top plate) — filler first, then bricks
    stageSlab.push(
      <g key="slab-sides" strokeLinejoin="round">
        <polygon points={slabFillerLeft} fill={SLAB_LEFT_B} />
        <polygon points={slabFillerRight} fill={SLAB_RIGHT_B} />
        {slabCells}
      </g>,
    );

    // 1. plate (top face of the slab)
    stagePlate.push(
      <g key="plate">
        <polygon points={platePts} fill="#0B0B0B" />
        {gridLines}
      </g>,
    );

    // 1.5 detached slab fragments
    fragments.forEach((f, i) => {
      stageFragments.push(renderCuboid(f, `frag-${i}`));
    });

    // 2. floor ring (back-to-front)
    tiles.forEach((t, i) => {
      stageTiles.push(
        renderCuboid(
          {
            cx: t.cx,
            cy: t.cy,
            z: t.z,
            span: t.span,
            h: t.h,
            tone: t.tone,
            sortKey: t.sortKey,
          },
          `tile-${i}`,
        ),
      );
    });

    // 3. tower (bottom → top) — each tier gets its own group so we can
    // stagger them individually as they "rise" into place.
    tiers.forEach((t) => {
      stageTiers.push(renderCuboid(t.cuboid, `tier-${t.idx}`));
    });
    stageTiers.push(<g key="ticks">{tickLines}</g>);

    // 4. capstone
    stageCap.push(renderCuboid(capCuboid, "cap"));

    // 5. incoming cubes — shadow first, then cube, then dashed trail
    if (showIncoming) {
      incoming.forEach((inc, i) => {
        // drop shadow at floor
        const [sx, sy] = iso(inc.x, inc.y, 0);
        stageIncoming.push(
          <ellipse
            key={`sh-${i}`}
            cx={sx}
            cy={sy}
            rx={inc.size * S * 1.1}
            ry={inc.size * S * 0.55}
            fill="rgba(0,0,0,0.45)"
          />,
        );
        // cube
        stageIncoming.push(
          renderCuboid(
            {
              cx: inc.x,
              cy: inc.y,
              z: inc.zBase,
              span: inc.size,
              h: inc.size,
              tone: inc.tone,
              sortKey: 0,
            },
            `inc-${i}`,
          ),
        );
        // dashed trail from cube center-top to cap top
        const [x1, y1] = iso(inc.x, inc.y, inc.zBase + inc.size);
        stageIncoming.push(
          <g key={`tr-${i}`}>
            <path
              d={`M ${x1} ${y1} L ${capTop[0]} ${capTop[1]}`}
              stroke={BRAND_HI}
              strokeWidth={1}
              strokeDasharray="2 4"
              opacity={0.55}
              fill="none"
              strokeLinecap="round"
            />
          </g>,
        );
      });
    }

    // 6. glow dot + pulse rings on capstone top
    stageGlow.push(
      <g key="glow">
        <circle
          cx={capTop[0]}
          cy={capTop[1]}
          r={38}
          fill="none"
          stroke={BRAND_HI}
          strokeWidth={0.7}
          strokeDasharray="2 5"
          opacity={0.2}
        />
        <circle
          cx={capTop[0]}
          cy={capTop[1]}
          r={24}
          fill="none"
          stroke={BRAND_HI}
          strokeWidth={0.9}
          strokeDasharray="3 4"
          opacity={0.45}
        />
        <circle
          cx={capTop[0]}
          cy={capTop[1]}
          r={13}
          fill="none"
          stroke={BRAND_HI}
          strokeWidth={1.2}
          opacity={0.8}
        />
        <circle cx={capTop[0]} cy={capTop[1]} r={7} fill="#FFFFFF" />
      </g>,
    );

    // ── Cards (screen-space) ────────────────────────────────────────────
    const cards: ReactElement[] = [];
    const stageCards: ReactElement[] = [];
    const stageConnectors: ReactElement[] = [];
    const stageDefs: ReactElement[] = [];
    if (showCards) {
      const CARD_W = 196,
        CARD_H = 52;
      const defs = (
        <defs key="defs">
          <linearGradient id="heroCardShine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
      );
      stageDefs.push(defs);

      // Each card tells a different memory interaction story — the sub-line
      // shows a recent, specific memory name + a status verb so all four read
      // as distinct activities rather than identical syncs.
      const STATUS_GREEN = "#22c55e"; // synced / recalled
      const STATUS_AMBER = "#f59e0b"; // saving / indexing
      const STATUS_BLUE = "#3b82f6"; // queried

      const cardData = [
        {
          x: -420,
          y: -170,
          label: "Claude",
          sub: "auth-flow-v2",
          status: "retrieved",
          dot: STATUS_GREEN,
          icon: (
            <g transform="translate(14 16)">
              <Claude size={20} color={BRAND_HI} />
            </g>
          ),
        },
        {
          x: 225,
          y: -170,
          label: "Cursor",
          sub: "api-schema",
          status: "saving",
          dot: STATUS_AMBER,
          icon: (
            <g transform="translate(14 16)">
              <Cursor size={20} color="#BFBAB2" />
            </g>
          ),
        },
        {
          x: 225,
          y: 90,
          label: "ChatGPT",
          sub: "user-prefs",
          status: "queried",
          dot: STATUS_BLUE,
          icon: (
            <g transform="translate(14 16)">
              <OpenAI size={20} color="#BFBAB2" />
            </g>
          ),
        },
        {
          x: -420,
          y: 90,
          label: "Gemini",
          sub: "design-tokens",
          status: "synced",
          dot: STATUS_GREEN,
          icon: (
            <g transform="translate(14 16)">
              <Gemini.Color size={20} />
            </g>
          ),
        },
      ];

      cardData.forEach((c, i) => {
        stageCards.push(
          <g key={`card-${i}`} transform={`translate(${c.x} ${c.y})`}>
            {/* Card base */}
            <rect
              width={CARD_W}
              height={CARD_H}
              rx={10}
              fill={INK3}
              stroke={LINE2}
            />
            {/* Top-to-bottom glass sheen */}
            <rect
              width={CARD_W}
              height={CARD_H}
              rx={10}
              fill="url(#heroCardShine)"
              opacity={0.6}
            />
            {/* Icon rendered directly on the card — no sub-container border */}
            {c.icon}
            {/* Brand label */}
            <text
              x={44}
              y={23}
              fill="#FFFFFF"
              fontFamily="Geist, system-ui, sans-serif"
              fontSize={13}
              fontWeight={600}
            >
              {c.label}
            </text>
            {/* Memory name · status verb */}
            <text
              x={44}
              y={39}
              fontFamily="Geist Mono, ui-monospace, monospace"
              fontSize={10}
            >
              <tspan fill="#9A9590">{c.sub}</tspan>
              <tspan fill="#5A5550"> · </tspan>
              <tspan fill="#BFBAB2">{c.status}</tspan>
            </text>
            {/* Status dot — color matches the action */}
            <circle cx={CARD_W - 14} cy={14} r={3} fill={c.dot} />
          </g>,
        );
      });

      // Connectors: each top card maps to its own incoming cube; the bottom
      // Gemini card connects directly to the capstone glow. This tells a
      // clearer story — Claude, Cursor, ChatGPT each "feed" a memory block
      // that lands on the tower, while Gemini taps into the core layer itself.
      // Card → incoming cube index (null = capstone).
      // Order matches cardData: Claude, Cursor, ChatGPT, Gemini
      //   Claude   → incoming[0] (top-left floating cube)
      //   Cursor   → incoming[1] (top-right floating cube)
      //   ChatGPT  → incoming[2] (front/bottom floating cube)
      //   Gemini   → capstone core
      const cardTargets: (number | null)[] = [0, 1, 2, null];
      // Per-card track offset so parallel connectors get their own vertical lane
      const trackOffset = [90, 90, 140, 150];

      // Landing points (screen-space) for each incoming cube — the bottom
      // center of the cube so the dashed line visually rests on it.
      const incomingLandings = incoming.map((inc) => {
        const [lx, ly] = iso(inc.x, inc.y, inc.zBase);
        return { x: lx, y: ly };
      });
      const capsuleTarget = { x: capTop[0], y: capTop[1] };

      cardData.forEach((c, i) => {
        const t =
          cardTargets[i] === null
            ? capsuleTarget
            : incomingLandings[cardTargets[i] as number];
        const dx = t.x - (c.x + CARD_W / 2);
        // exit from the card's inner edge (side nearest the target)
        const x1 = dx > 0 ? c.x + CARD_W : c.x;
        const y1 = c.y + CARD_H / 2;
        // vertical track sits `trackOffset` px past the card edge toward target
        const mx = dx > 0 ? x1 + trackOffset[i] : x1 - trackOffset[i];
        const d = `M ${x1} ${y1} L ${mx} ${y1} L ${mx} ${t.y} L ${t.x} ${t.y}`;

        // Total path length so we can animate a pulse traveling along it.
        // The path is 3 segments: horizontal, vertical, horizontal.
        const pathLen =
          Math.abs(mx - x1) + Math.abs(t.y - y1) + Math.abs(t.x - mx);

        // Pulse geometry: a short bright dash with a large gap, so only one
        // pulse is visible at a time. Travel direction is from card → target
        // via decreasing dashoffset. Stagger per card so pulses fire in a
        // gentle cascade rather than all at once. Slower duration + reduced
        // opacity gives the whole effect a calm, ambient character.
        const pulseLen = 12; // bright segment length
        const gapLen = Math.max(pathLen + pulseLen, 240); // large enough to hide repeats
        const duration = 3.8;
        const staggerDelay = i * 0.8;

        stageConnectors.push(
          <g key={`conn-${i}`}>
            {/* Static dashed guideline — the faint base line */}
            <path
              d={d}
              stroke={BRAND_HI}
              strokeWidth={1}
              opacity={0.35}
              strokeDasharray="3 4"
              fill="none"
              strokeLinecap="round"
            />
            {!prefersReducedMotion && (
              <>
                {/* Glow layer — soft, slower-moving blurred halo. Lower
                    opacity + wider blur + longer duration gives it a gentle
                    "afterglow" character rather than a second synced pulse. */}
                {/* <path
                  d={d}
                  stroke={BRAND_HI}
                  strokeWidth={4}
                  opacity={0.22}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${pulseLen * 1.4} ${gapLen}`}
                  strokeDashoffset={pulseLen * 1.4 + gapLen}
                  style={{ filter: "blur(3.5px)" }}
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from={pulseLen * 1.4 + gapLen}
                    to={-pathLen}
                    dur={`${duration * 1.7}s`}
                    begin={`${staggerDelay}s`}
                    repeatCount="indefinite"
                  />
                </path> */}
                {/* Core pulse — softer bright segment traveling along the
                    path. Slower + lower opacity so it reads as a gentle
                    flicker of data rather than a harsh strobe. */}
                <path
                  d={d}
                  stroke="#FFE4D6"
                  strokeWidth={1.4}
                  opacity={0.6}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${pulseLen} ${gapLen}`}
                  strokeDashoffset={pulseLen + gapLen}
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from={pulseLen + gapLen}
                    to={-pathLen}
                    dur={`${duration}s`}
                    begin={`${staggerDelay}s`}
                    repeatCount="indefinite"
                  />
                </path>
              </>
            )}
          </g>,
        );
      });
    }

    // ── Bottom pill ─────────────────────────────────────────────────────
    // const pill = showBottomPill ? (
    //   <g key="pill" transform="translate(-70 200)">
    //     <rect
    //       width={140}
    //       height={30}
    //       rx={15}
    //       fill="rgba(169,67,42,0.18)"
    //       stroke={BRAND}
    //       strokeWidth={1}
    //     />
    //     <circle cx={16} cy={15} r={3.5} fill={BRAND_HI} />
    //     <text
    //       x={28}
    //       y={19}
    //       fill={BRAND_HI}
    //       fontFamily="Geist Mono, ui-monospace, monospace"
    //       fontSize={11}
    //       fontWeight={500}
    //     >
    //       one memory layer
    //     </text>
    //   </g>
    // ) : null;

    return {
      stageDefs,
      stageGround,
      stageSlab,
      stagePlate,
      stageFragments,
      stageTiles,
      stageTiers,
      stageCap,
      stageIncoming,
      stageGlow,
      stageConnectors,
      stageCards,
      // suppress unused-var warnings for legacy catchalls
      _isoEls: isoEls,
      _cards: cards,
    };
  }, [showCards, showIncoming, showBottomPill, prefersReducedMotion]);

  // Entrance choreography — each stage fades + translates into place with a
  // stagger. Cubic-bezier easing feels "placed" rather than linear. Reduced
  // motion collapses everything to an instant fade so the scene still appears.
  const EASE = [0.22, 1, 0.36, 1] as const;
  const fadeUp = (delay: number, dy = 10): Variants =>
    prefersReducedMotion
      ? {
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { duration: 0.01, delay } },
        }
      : {
          hidden: { opacity: 0, y: dy },
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, delay, ease: EASE },
          },
        };

  const fadeIn = (delay: number, duration = 0.45): Variants =>
    prefersReducedMotion
      ? {
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { duration: 0.01, delay } },
        }
      : {
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { duration, delay, ease: "easeOut" },
          },
        };

  // Delays tuned so the scene reads as: ground appears → base/plate settle →
  // fragments scatter in → tower tiers rise → capstone drops → incoming cubes
  // arrive → glow pulses on → connectors draw → cards slide in.
  // Tightened total runtime (~1.4s) so the entrance feels immediate.
  const D = {
    ground: 0.0,
    slab: 0.08,
    plate: 0.2,
    fragments: 0.3,
    tiles: 0.32,
    tiers: 0.45,
    cap: 0.8,
    incoming: 0.92,
    glow: 1.05,
    connectors: 1.15,
    cards: 1.05,
  };

  return (
    <svg
      className={className}
      viewBox="-480 -260 960 560"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {body.stageDefs}

      {/* Ground — fades up gently first so the stage exists before anything
          lands on it. */}
      <motion.g
        initial="hidden"
        animate="visible"
        variants={fadeUp(D.ground, 14)}
      >
        {body.stageGround}
      </motion.g>

      {/* Slab base + top plate — the memory-layer foundation grows upward. */}
      <motion.g
        initial="hidden"
        animate="visible"
        variants={fadeUp(D.slab, 18)}
      >
        {body.stageSlab}
      </motion.g>

      <motion.g initial="hidden" animate="visible" variants={fadeIn(D.plate)}>
        {body.stagePlate}
      </motion.g>

      {/* Scattered construction fragments. */}
      <motion.g
        initial="hidden"
        animate="visible"
        variants={fadeUp(D.fragments, 6)}
      >
        {body.stageFragments}
      </motion.g>

      {/* Floor ring tiles. */}
      <motion.g initial="hidden" animate="visible" variants={fadeIn(D.tiles)}>
        {body.stageTiles}
      </motion.g>

      {/* Tower tiers — staggered so they "rise" into place bottom → top. */}
      <motion.g
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              delayChildren: D.tiers,
              staggerChildren: prefersReducedMotion ? 0 : 0.06,
            },
          },
        }}
      >
        {body.stageTiers.map((el, i) => (
          <motion.g
            key={el.key ?? `tier-${i}`}
            variants={
              prefersReducedMotion
                ? {
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: { duration: 0.01 },
                    },
                  }
                : {
                    hidden: { opacity: 0, y: 18, scale: 0.96 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: { duration: 0.4, ease: EASE },
                    },
                  }
            }
            style={{ transformOrigin: "center" }}
          >
            {el}
          </motion.g>
        ))}
      </motion.g>

      {/* Capstone — drops in from above with a slightly snappier ease. */}
      <motion.g
        initial="hidden"
        animate="visible"
        variants={
          prefersReducedMotion
            ? {
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { duration: 0.01, delay: D.cap },
                },
              }
            : {
                hidden: { opacity: 0, y: -16, scale: 0.9 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { duration: 0.4, delay: D.cap, ease: EASE },
                },
              }
        }
        style={{ transformOrigin: "center" }}
      >
        {body.stageCap}
      </motion.g>

      {/* Incoming cubes + trails. */}
      <motion.g
        initial="hidden"
        animate="visible"
        variants={fadeUp(D.incoming, -12)}
      >
        {body.stageIncoming}
      </motion.g>

      {/* Glow rings on the capstone. */}
      <motion.g
        initial="hidden"
        animate="visible"
        variants={fadeIn(D.glow, 0.8)}
      >
        {body.stageGlow}
      </motion.g>

      {/* Connector paths (dashed lines from cards to cubes/capstone). */}
      <motion.g
        initial="hidden"
        animate="visible"
        variants={fadeIn(D.connectors, 0.7)}
      >
        {body.stageConnectors}
      </motion.g>

      {/* Cards — final stage, scale+fade in from their anchor points. */}
      <motion.g
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              delayChildren: D.cards,
              staggerChildren: prefersReducedMotion ? 0 : 0.07,
            },
          },
        }}
      >
        {body.stageCards.map((el, i) => (
          <motion.g
            key={el.key ?? `card-${i}`}
            variants={
              prefersReducedMotion
                ? {
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: { duration: 0.01 },
                    },
                  }
                : {
                    hidden: { opacity: 0, scale: 0.94 },
                    visible: {
                      opacity: 1,
                      scale: 1,
                      transition: { duration: 0.4, ease: EASE },
                    },
                  }
            }
            style={{ transformOrigin: "center" }}
          >
            {el}
          </motion.g>
        ))}
      </motion.g>
    </svg>
  );
}
