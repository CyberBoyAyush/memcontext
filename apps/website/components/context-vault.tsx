"use client";

import { ArrowRight } from "lucide-react";
import { createContext, useContext, useId } from "react";

// Each IsoStack instance (desktop + mobile) gets a unique prefix so its SVG
// gradient IDs never collide in the DOM. Nested helpers read it from context.
const GradientIdContext = createContext<string>("cv");
const useGradientId = (name: string) => `${useContext(GradientIdContext)}-${name}`;

interface Pillar {
  title: string;
  body: string;
  /** which side the label sits on relative to the stack */
  side: "left" | "right";
}

// Data unchanged — same five pillars, now mapped onto the exploded layer stack.
const pillars: Pillar[] = [
  {
    title: "Ingest anything",
    body: "PDFs, DOCX, images, CSV, Markdown, and live URLs. MemContext chunks every source and extracts the durable facts.",
    side: "left",
  },
  {
    title: "Cited, not hallucinated",
    body: "Every extracted fact links back to its source passage - page and chunk when available - so answers stay grounded and auditable.",
    side: "right",
  },
  {
    title: "Built for teams",
    body: "Workspaces with owner, admin, member, and viewer roles. Invite your team and share one knowledge base.",
    side: "left",
  },
  {
    title: "Hard scope isolation",
    body: "Lock knowledge into scopes like hr or engineering, group by project, and keep tenants strictly separated.",
    side: "right",
  },
  {
    title: "Learns from feedback",
    body: "Rate a fact helpful or wrong to reshape ranking. Corrections rewrite the memory and its source chunk, so retrieval keeps getting sharper.",
    side: "left",
  },
];

/* ----------------------------------------------------------------------------
   Palette — mirrors the hero memory-tower taste: warm brand ramp + multi-tone
   per-face shading (top lightest, left darkest, right mid) so slabs read with
   real 3D depth instead of flat outlines. Layers warm up toward the accent die.
---------------------------------------------------------------------------- */

const BRAND_HI = "#D96B3F";

type FaceTone = {
  top: string;
  left: string;
  right: string;
  stroke: string;
  detail: string; // colour for the micro-detailing on the top face
  sw: number;
};

// Per-layer tones, top → bottom. Cool/neutral at the extremes, warming into the
// accent compute die (layer 1). Each gives top/left/right distinct darkness.
const LAYER_TONES: FaceTone[] = [
  // 0 — lid (cool neutral, like the archive plate)
  {
    top: "#171717",
    left: "#0B0B0B",
    right: "#111111",
    stroke: "rgba(255,255,255,0.16)",
    detail: "rgba(214,217,222,0.9)",
    sw: 1.1,
  },
  // 1 — ACCENT compute die (warm brand)
  {
    top: "#3A1A11",
    left: "#1E0D08",
    right: "#2A130C",
    stroke: BRAND_HI,
    detail: BRAND_HI,
    sw: 1.3,
  },
  // 2 — routing fabric (faint warm tint)
  {
    top: "#1A1411",
    left: "#0C0908",
    right: "#13100E",
    stroke: "rgba(217,107,63,0.32)",
    detail: "rgba(190,150,135,0.85)",
    sw: 1,
  },
  // 3 — logic blocks (neutral with warm edge)
  {
    top: "#181412",
    left: "#0B0908",
    right: "#11100E",
    stroke: "rgba(217,107,63,0.26)",
    detail: "rgba(196,199,204,0.8)",
    sw: 1,
  },
  // 4 — interface base (cool neutral)
  {
    top: "#141414",
    left: "#090909",
    right: "#0E0E0E",
    stroke: "rgba(255,255,255,0.12)",
    detail: "rgba(170,173,178,0.8)",
    sw: 1,
  },
];

/* ----------------------------------------------------------------------------
   Isometric geometry helpers
   A flat slab is drawn as a 2:1 isometric diamond (top face) plus two side
   faces for thickness. Everything is computed from a single center point so
   the five layers line up perfectly when exploded along the vertical axis.
   Detailing is drawn in "iso space": a point (u, v) in 0..1 across the top
   face is mapped onto the diamond via the two edge axes.
---------------------------------------------------------------------------- */

const ISO_W = 360; // full width of a layer diamond
const ISO_H = ISO_W / 2; // 2:1 isometric ratio -> diamond height
const THICK = 18; // slab thickness (vertical extrusion)

type Pt = { x: number; y: number };

function diamond(
  cx: number,
  cy: number,
  scale = 1
): { top: Pt; right: Pt; bottom: Pt; left: Pt } {
  const hw = (ISO_W / 2) * scale;
  const hh = (ISO_H / 2) * scale;
  return {
    top: { x: cx, y: cy - hh },
    right: { x: cx + hw, y: cy },
    bottom: { x: cx, y: cy + hh },
    left: { x: cx - hw, y: cy },
  };
}

function poly(...pts: Pt[]) {
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

/**
 * Map iso-space coordinates (u, v in 0..1) onto a layer's top face.
 * u runs along the left→top edge (top-left direction),
 * v runs along the left→bottom edge (bottom-left direction).
 * Together they parametrise the whole parallelogram/diamond.
 */
function isoXY(cx: number, cy: number, u: number, v: number, scale = 1): Pt {
  const hw = (ISO_W / 2) * scale;
  const hh = (ISO_H / 2) * scale;
  // left corner is origin
  const ox = cx - hw;
  const oy = cy;
  // axis A: left -> top  = (+hw, -hh)
  // axis B: left -> bottom = (+hw, +hh)
  return {
    x: ox + u * hw + v * hw,
    y: oy + u * -hh + v * hh,
  };
}

/* A tiny iso square (BGA ball / pad) centred at p. */
function isoDot(p: Pt, r: number, key: string | number, opacity: number) {
  return <circle key={key} cx={p.x} cy={p.y} r={r} fillOpacity={opacity} />;
}

/* --------------------------- Layer detailing ------------------------------ */

/**
 * An isometric drilled hole that reads as a real recess: a dark gradient bore,
 * a shaded cylinder wall (lit at the back rim, shadowed at the front), and a
 * rim highlight on the light-facing (upper-left) edge. Light comes top-left.
 */
function IsoHole({ p }: { p: Pt }) {
  const wallId = useGradientId("hole-wall");
  const boreId = useGradientId("hole-bore");
  const RX = 9; // outer rim iso radii (2:1 ellipse)
  const RY = 4.5;
  const DEPTH = 4; // how far the hole sinks (screen-space)
  const boreRX = RX * 0.78; // bore is slightly inset from the rim
  const boreRY = RY * 0.78;

  // bore floor centre sits lower (sunk into the surface)
  const fy = p.y + DEPTH;

  return (
    <g>
      {/* 1. Cylinder wall — the band between the top rim and the sunk bore.
            Filled dark so the inside of the hole reads solid. */}
      <path
        d={`M ${(p.x - RX).toFixed(1)} ${p.y.toFixed(1)}
            A ${RX} ${RY} 0 0 0 ${(p.x + RX).toFixed(1)} ${p.y.toFixed(1)}
            L ${(p.x + boreRX).toFixed(1)} ${fy.toFixed(1)}
            A ${boreRX} ${boreRY} 0 0 1 ${(p.x - boreRX).toFixed(1)} ${fy.toFixed(1)} Z`}
        fill={`url(#${wallId})`}
        stroke="none"
      />

      {/* 2. Bore floor — darkest, with a radial gradient for depth. */}
      <ellipse
        cx={p.x}
        cy={fy}
        rx={boreRX}
        ry={boreRY}
        fill={`url(#${boreId})`}
      />

      {/* 3. Back wall highlight — the far (upper) inner wall catches light. */}
      <path
        d={`M ${(p.x - RX + 1).toFixed(1)} ${(p.y - 0.3).toFixed(1)}
            A ${RX - 1} ${RY - 0.6} 0 0 1 ${(p.x + RX - 1).toFixed(1)} ${(p.y - 0.3).toFixed(1)}`}
        fill="none"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth={0.9}
        strokeLinecap="round"
      />

      {/* 4. Front inner shadow — the near (lower) wall is in shadow. */}
      <path
        d={`M ${(p.x - boreRX).toFixed(1)} ${fy.toFixed(1)}
            A ${boreRX} ${boreRY} 0 0 0 ${(p.x + boreRX).toFixed(1)} ${fy.toFixed(1)}`}
        fill="none"
        stroke="rgba(0,0,0,0.6)"
        strokeWidth={1}
        strokeLinecap="round"
      />

      {/* 5. Outer rim — the chamfered top edge of the hole. */}
      <ellipse
        cx={p.x}
        cy={p.y}
        rx={RX}
        ry={RY}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.55}
        strokeWidth={0.9}
      />
      {/* rim highlight on the light side (upper-left arc) */}
      <path
        d={`M ${(p.x - RX).toFixed(1)} ${p.y.toFixed(1)}
            A ${RX} ${RY} 0 0 1 ${p.x.toFixed(1)} ${(p.y - RY).toFixed(1)}`}
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={1}
        strokeLinecap="round"
      />
    </g>
  );
}

/** Layer 0 — the "lid": engraved brand, mounting holes, corner marks, channels. */
function DetailLid({ cx, cy }: { cx: number; cy: number }) {
  const inner = diamond(cx, cy, 0.9);
  const inner2 = diamond(cx, cy, 0.82);

  // Iso transform matrix for engraved text lying flat on the top face.
  // text-x → up-right (u axis), text-y → down-right (v axis): 2:1 iso units.
  const K = 0.86; // font scale on the plane
  const m = `matrix(${(0.894 * K).toFixed(3)} ${(-0.447 * K).toFixed(3)} ${(0.894 * K).toFixed(3)} ${(0.447 * K).toFixed(3)} ${cx} ${cy})`;

  // four corner mounting holes (inset from the corners)
  const holes = [
    isoXY(cx, cy, 0.16, 0.16),
    isoXY(cx, cy, 0.84, 0.16),
    isoXY(cx, cy, 0.16, 0.84),
    isoXY(cx, cy, 0.84, 0.84),
  ];

  return (
    <g stroke="currentColor" fill="none">
      {/* double engraved border channel */}
      <polygon
        points={poly(inner.top, inner.right, inner.bottom, inner.left)}
        strokeOpacity={0.4}
      />
      <polygon
        points={poly(inner2.top, inner2.right, inner2.bottom, inner2.left)}
        strokeOpacity={0.18}
      />

      {/* orientation triangle (top-left) */}
      <polygon
        points={poly(
          isoXY(cx, cy, 0.3, 0.18),
          isoXY(cx, cy, 0.42, 0.18),
          isoXY(cx, cy, 0.3, 0.3)
        )}
        strokeOpacity={0.5}
      />

      {/* cylindrical counterbored mounting holes in the corners */}
      {holes.map((h, i) => (
        <IsoHole key={i} p={h} />
      ))}

      {/* engraved MEMCONTEXT wordmark, lying on the iso top face */}
      <text
        transform={m}
        x={0}
        y={6}
        textAnchor="middle"
        fill="currentColor"
        fillOpacity={0.32}
        stroke="none"
        fontFamily="Geist Mono, ui-monospace, monospace"
        fontSize={22}
        fontWeight={700}
        letterSpacing={1.5}
      >
        MEMCONTEXT
      </text>
      {/* faint sub-line under the wordmark */}
      <text
        transform={m}
        x={0}
        y={26}
        textAnchor="middle"
        fill="currentColor"
        fillOpacity={0.18}
        stroke="none"
        fontFamily="Geist Mono, ui-monospace, monospace"
        fontSize={9}
        letterSpacing={2}
      >
        CONTEXT VAULT
      </text>
    </g>
  );
}

/** Layer 1 — accent compute die: dense BGA ball matrix + perimeter pad ring. */
function DetailDie({ cx, cy }: { cx: number; cy: number }) {
  const balls: Pt[] = [];
  const N = 16; // dense central array
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const u = 0.32 + (i / (N - 1)) * 0.36;
      const v = 0.32 + (j / (N - 1)) * 0.36;
      balls.push(isoXY(cx, cy, u, v));
    }
  }
  // perimeter pad ring
  const ring: Pt[] = [];
  const steps = 22;
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    ring.push(isoXY(cx, cy, 0.12 + t * 0.76, 0.12)); // top edge
    ring.push(isoXY(cx, cy, 0.88, 0.12 + t * 0.76)); // right edge
    ring.push(isoXY(cx, cy, 0.12 + t * 0.76, 0.88)); // bottom edge
    ring.push(isoXY(cx, cy, 0.12, 0.12 + t * 0.76)); // left edge
  }
  const dieFrame = [
    isoXY(cx, cy, 0.28, 0.28),
    isoXY(cx, cy, 0.72, 0.28),
    isoXY(cx, cy, 0.72, 0.72),
    isoXY(cx, cy, 0.28, 0.72),
  ];
  const core = isoXY(cx, cy, 0.5, 0.5);
  return (
    <g>
      {/* inner die frame */}
      <polygon
        points={poly(dieFrame[0], dieFrame[1], dieFrame[2], dieFrame[3])}
        fill="none"
        stroke={BRAND_HI}
        strokeOpacity={0.55}
      />
      {/* central BGA balls */}
      <g fill="currentColor">
        {balls.map((p, k) => isoDot(p, 1.5, k, 0.75))}
      </g>
      {/* perimeter pads */}
      <g fill="currentColor">
        {ring.map((p, k) => isoDot(p, 1, `r${k}`, 0.45))}
      </g>
      {/* corner index pad */}
      <circle
        cx={isoXY(cx, cy, 0.78, 0.22).x}
        cy={isoXY(cx, cy, 0.78, 0.22).y}
        r={3.5}
        fill="none"
        stroke={BRAND_HI}
        strokeOpacity={0.7}
      />

      {/* ── bright accent micro-elements (hero taste) ── */}
      {/* faint pulse ring radiating from the live core */}
      <ellipse
        cx={core.x}
        cy={core.y}
        rx={26}
        ry={13}
        fill="none"
        stroke={BRAND_HI}
        strokeWidth={0.8}
        strokeDasharray="2 5"
        opacity={0.5}
      >
        <animate
          attributeName="rx"
          values="14;42"
          dur="3.2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="ry"
          values="7;21"
          dur="3.2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.55;0"
          dur="3.2s"
          repeatCount="indefinite"
        />
      </ellipse>
    </g>
  );
}

/* ----------------------------------------------------------------------------
   QFP chip — a complex isometric quad-flat-package sitting on the routing
   fabric: extruded body, recessed die cavity with bond wires, gull-wing leads
   on all four edges fanning out to landing pads, pin-1 marker + engraving.
---------------------------------------------------------------------------- */
function QfpChip({ cx, cy }: { cx: number; cy: number }) {
  const lerp = (a: Pt, b: Pt, t: number): Pt => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  });
  // shorthand: a point on this layer's top face at iso-coords (u,v)
  const P = (u: number, v: number): Pt => isoXY(cx, cy, u, v);

  // Body footprint in iso (u,v) space (a centred square)
  const BU0 = 0.37,
    BU1 = 0.63,
    BV0 = 0.37,
    BV1 = 0.63;
  const LIFT = 0; // flat plate — body sits directly on the routing surface
  const up = (p: Pt): Pt => ({ x: p.x, y: p.y - LIFT });

  // footprint corners (on surface): back(u0,v0) right(u1,v0) front(u1,v1) left(u0,v1)
  const fBack = P(BU0, BV0);
  const fRight = P(BU1, BV0);
  const fFront = P(BU1, BV1);
  const fLeft = P(BU0, BV1);
  // body top-face corners (lifted)
  const tBack = up(fBack);
  const tRight = up(fRight);
  const tFront = up(fFront);
  const tLeft = up(fLeft);

  // ── Leads. Build per-edge in iso (u,v) space so they stay axis-aligned.
  // For an edge we step a parameter s along it and reach outward by `LR` in the
  // perpendicular iso axis. Each lead is a thin bar with a small width `LW`.
  const LEADS = 8;
  const LR = 0.16; // outward reach in iso units
  const LW = 0.012; // half-width of a lead in iso units
  const PINT = 3; // screen-space pin thickness (vertical extrusion)

  type Lead = { top: Pt[]; foot: Pt };
  const buildEdge = (
    fixed: number,
    fixedAxis: "u" | "v",
    dir: 1 | -1
  ): Lead[] => {
    const out: Lead[] = [];
    for (let k = 0; k < LEADS; k++) {
      const s = 0.08 + (k / (LEADS - 1)) * 0.84; // 0..1 across the edge span
      const along = BV0 + s * (BV1 - BV0);
      // root + foot in iso coords
      let rootU: number, rootV: number, footU: number, footV: number;
      if (fixedAxis === "v") {
        // edge runs along u at v=fixed; outward is along v by dir
        rootU = along;
        rootV = fixed;
        footU = along;
        footV = fixed + dir * LR;
      } else {
        // edge runs along v at u=fixed; outward is along u by dir
        rootU = fixed;
        rootV = along;
        footU = fixed + dir * LR;
        footV = along;
      }
      // widen across the edge direction
      const wU = fixedAxis === "v" ? LW : 0;
      const wV = fixedAxis === "v" ? 0 : LW;
      const r0 = P(rootU - wU, rootV - wV);
      const r1 = P(rootU + wU, rootV + wV);
      const f0 = P(footU - wU, footV - wV);
      const f1 = P(footU + wU, footV + wV);
      out.push({ top: [r0, f0, f1, r1], foot: P(footU, footV) });
    }
    return out;
  };

  // visible (front) edges: v=BV1 (front-left face) and u=BU1 (front-right face)
  const leadsFrontLeft = buildEdge(BV1, "v", 1); // outward +v (down-left)
  const leadsFrontRight = buildEdge(BU1, "u", 1); // outward +u (down-right)
  // back edges: v=BV0 and u=BU0 (render behind the body)
  const leadsBackRight = buildEdge(BV0, "v", -1); // outward -v (up-right)
  const leadsBackLeft = buildEdge(BU0, "u", -1); // outward -u (up-left)

  const frontLeads = [...leadsFrontLeft, ...leadsFrontRight];
  const backLeads = [...leadsBackLeft, ...leadsBackRight];

  // ── flat engraved die marking on the body top (no extrusion) ──
  // outer engraved ring
  const DU0 = 0.435,
    DU1 = 0.565,
    DV0 = 0.435,
    DV1 = 0.565;
  // die corners, flat on the body top face
  const dBack = up(P(DU0, DV0));
  const dRight = up(P(DU1, DV0));
  const dFront = up(P(DU1, DV1));
  const dLeft = up(P(DU0, DV1));
  // inner engraved square (the die itself)
  const iU0 = 0.47,
    iU1 = 0.53,
    iV0 = 0.47,
    iV1 = 0.53;
  const iBack = up(P(iU0, iV0));
  const iRight = up(P(iU1, iV0));
  const iFront = up(P(iU1, iV1));
  const iLeft = up(P(iU0, iV1));

  // bond wires: engraved die rim → body top edge midpoints (a few)
  const bondWires: [Pt, Pt][] = [];
  for (let k = 1; k < 5; k++) {
    const t = k / 5;
    bondWires.push([lerp(dLeft, dFront, t), lerp(tLeft, tFront, t)]);
    bondWires.push([lerp(dFront, dRight, t), lerp(tFront, tRight, t)]);
  }

  const pin1 = up(P(BU0 + 0.05, BV0 + 0.05));

  const renderLeadBar = (l: Lead, key: string) => (
    <g key={key}>
      {/* pin thickness (side) */}
      <polygon
        points={poly(
          l.top[1],
          l.top[2],
          { x: l.top[2].x, y: l.top[2].y + PINT },
          { x: l.top[1].x, y: l.top[1].y + PINT }
        )}
        fill="#0c0a09"
        stroke="currentColor"
        strokeOpacity={0.35}
        strokeWidth={0.4}
      />
      {/* pin top */}
      <polygon
        points={poly(l.top[0], l.top[1], l.top[2], l.top[3])}
        fill="#2a2420"
        stroke="currentColor"
        strokeOpacity={0.55}
        strokeWidth={0.5}
      />
    </g>
  );

  return (
    <g strokeLinejoin="round">
      {/* landing pads under every lead foot */}
      <g fill="currentColor">
        {[...frontLeads, ...backLeads].map((l, k) => (
          <circle key={`pad-${k}`} cx={l.foot.x} cy={l.foot.y} r={1.3} fillOpacity={0.4} />
        ))}
      </g>

      {/* back leads first (sit behind the body) */}
      <g>{backLeads.map((l, k) => renderLeadBar(l, `bl-${k}`))}</g>

      {/* ── chip plate — a flat package lying on the routing surface ── */}
      <polygon
        points={poly(tBack, tRight, tFront, tLeft)}
        fill="#2a231e"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth={0.9}
      />
      {/* inner border channel for a moulded-package look */}
      <polygon
        points={poly(
          lerp(tBack, tFront, 0.08),
          lerp(tRight, tLeft, 0.08),
          lerp(tFront, tBack, 0.08),
          lerp(tLeft, tRight, 0.08)
        )}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={0.6}
      />

      {/* bond wires (drawn flat on the body top, under the engraved die) */}
      <g stroke={BRAND_HI} strokeOpacity={0.22} strokeWidth={0.4} fill="none">
        {bondWires.map(([a, b], k) => (
          <line key={`bw-${k}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        ))}
      </g>

      {/* ── flat engraved die window on the body top (no height) ── */}
      {/* outer engraved channel — sits just darker than the plate, not black */}
      <polygon
        points={poly(dBack, dRight, dFront, dLeft)}
        fill="#221b16"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth={0.6}
      />
      {/* inner engraved die square */}
      <polygon
        points={poly(iBack, iRight, iFront, iLeft)}
        fill="#1a1410"
        stroke={BRAND_HI}
        strokeOpacity={0.45}
        strokeWidth={0.6}
      />
      {/* die surface grid (flat) */}
      <g stroke={BRAND_HI} strokeOpacity={0.4} strokeWidth={0.4}>
        {[0.33, 0.66].map((t, k) => (
          <line
            key={`dgx-${k}`}
            x1={lerp(iBack, iLeft, t).x}
            y1={lerp(iBack, iLeft, t).y}
            x2={lerp(iRight, iFront, t).x}
            y2={lerp(iRight, iFront, t).y}
          />
        ))}
        {[0.33, 0.66].map((t, k) => (
          <line
            key={`dgy-${k}`}
            x1={lerp(iBack, iRight, t).x}
            y1={lerp(iBack, iRight, t).y}
            x2={lerp(iLeft, iFront, t).x}
            y2={lerp(iLeft, iFront, t).y}
          />
        ))}
      </g>

      {/* front leads last (in front of the body) */}
      <g>{frontLeads.map((l, k) => renderLeadBar(l, `fl-${k}`))}</g>

      {/* pin-1 marker */}
      <circle cx={pin1.x} cy={pin1.y} r={1.6} fill={BRAND_HI} />
    </g>
  );
}

/** Layer 2 — routing fabric: fine circuit traces + vias + a central QFP chip. */
function DetailRouting({ cx, cy }: { cx: number; cy: number }) {
  const lines: { a: Pt; b: Pt; o: number }[] = [];
  // horizontal-ish traces along u with little jogs
  for (let n = 0; n < 11; n++) {
    const v = 0.16 + (n / 10) * 0.68;
    const a = isoXY(cx, cy, 0.14, v);
    const mid = isoXY(cx, cy, 0.5, v + (n % 2 === 0 ? 0.03 : -0.03));
    const b = isoXY(cx, cy, 0.86, v);
    lines.push({ a, b: mid, o: 0.22 });
    lines.push({ a: mid, b, o: 0.22 });
  }
  // vertical-ish traces along v
  for (let n = 0; n < 11; n++) {
    const u = 0.16 + (n / 10) * 0.68;
    const a = isoXY(cx, cy, u, 0.14);
    const b = isoXY(cx, cy, u, 0.86);
    lines.push({ a, b, o: 0.13 });
  }
  // vias (small rings) only in the outer band — the centre is occupied by the chip
  const vias: Pt[] = [];
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const u = 0.2 + (i / 5) * 0.6;
      const v = 0.2 + (j / 5) * 0.6;
      const inChip = u > 0.28 && u < 0.72 && v > 0.28 && v < 0.72;
      if ((i + j) % 2 === 0 && !inChip) vias.push(isoXY(cx, cy, u, v));
    }
  }
  // corner pad squares
  const corners = [
    isoXY(cx, cy, 0.14, 0.14),
    isoXY(cx, cy, 0.86, 0.14),
    isoXY(cx, cy, 0.86, 0.86),
    isoXY(cx, cy, 0.14, 0.86),
  ];
  return (
    <g>
      {/* PCB traces — dimmer toward the centre so the chip reads as the focus */}
      <g stroke="currentColor" fill="none">
        {lines.map((l, k) => (
          <line
            key={k}
            x1={l.a.x}
            y1={l.a.y}
            x2={l.b.x}
            y2={l.b.y}
            strokeOpacity={l.o * 0.8}
          />
        ))}
      </g>
      <g fill="currentColor">
        {vias.map((p, k) => (
          <circle key={k} cx={p.x} cy={p.y} r={2} fillOpacity={0.35} />
        ))}
      </g>
      <g fill="currentColor">
        {corners.map((p, k) => (
          <rect
            key={k}
            x={p.x - 3}
            y={p.y - 1.5}
            width={6}
            height={3}
            fillOpacity={0.4}
          />
        ))}
      </g>

      {/* central QFP chip — the focal element of this layer */}
      <QfpChip cx={cx} cy={cy} />
    </g>
  );
}

/** Layer 3 — logic blocks: solid 3D SMD chips in a lattice over engraved silk. */
function DetailBlocks({ cx, cy }: { cx: number; cy: number }) {
  const lerp = (a: Pt, b: Pt, t: number): Pt => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  });

  const M = 6; // grid of chips
  type Block = { p: Pt; u: number; v: number };
  const blocks: Block[] = [];
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < M; j++) {
      const u = 0.24 + (i / (M - 1)) * 0.52;
      const v = 0.24 + (j / (M - 1)) * 0.52;
      blocks.push({ p: isoXY(cx, cy, u, v), u, v });
    }
  }
  const bw = 9; // iso half-width
  const bh = bw / 2;
  const lift = 7; // chip height

  // ── engraved silkscreen detailing on the surface (drawn first, under chips) ──
  // recessed border channel
  const ch1 = diamond(cx, cy, 0.86);
  const ch2 = diamond(cx, cy, 0.8);
  // engraved lattice grid lines between the chips
  const gridLines: { a: Pt; b: Pt }[] = [];
  for (let n = 1; n < M; n++) {
    const t = n / M;
    const u = 0.2 + t * 0.6;
    const v = 0.2 + t * 0.6;
    gridLines.push({
      a: isoXY(cx, cy, u, 0.2),
      b: isoXY(cx, cy, u, 0.8),
    });
    gridLines.push({
      a: isoXY(cx, cy, 0.2, v),
      b: isoXY(cx, cy, 0.8, v),
    });
  }
  // corner registration marks (L-shaped engraving)
  const regMark = (u: number, v: number, du: number, dv: number) => {
    const c = isoXY(cx, cy, u, v);
    const a = isoXY(cx, cy, u + du, v);
    const b = isoXY(cx, cy, u, v + dv);
    return poly(a, c, b);
  };

  return (
    <g>
      {/* engraved border channel */}
      <g stroke="currentColor" fill="none">
        <polygon
          points={poly(ch1.top, ch1.right, ch1.bottom, ch1.left)}
          strokeOpacity={0.3}
        />
        <polygon
          points={poly(ch2.top, ch2.right, ch2.bottom, ch2.left)}
          strokeOpacity={0.14}
        />
      </g>

      {/* engraved lattice grid (silkscreen) */}
      <g stroke="currentColor" strokeOpacity={0.12} strokeWidth={0.6} fill="none">
        {gridLines.map((l, k) => (
          <line key={`g-${k}`} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y} />
        ))}
      </g>

      {/* corner registration marks */}
      <g stroke="currentColor" strokeOpacity={0.4} strokeWidth={0.9} fill="none">
        <polyline points={regMark(0.16, 0.16, 0.06, 0.06)} />
        <polyline points={regMark(0.84, 0.16, -0.06, 0.06)} />
        <polyline points={regMark(0.84, 0.84, -0.06, -0.06)} />
        <polyline points={regMark(0.16, 0.84, 0.06, -0.06)} />
      </g>

      {/* ── solid 3D SMD chips (multi-tone faces: top lightest / left darkest /
          right mid), painter-sorted back→front so they occlude correctly ── */}
      {[...blocks]
        .sort((a, b) => a.u + a.v - (b.u + b.v))
        .map((blk, k) => {
          const { p } = blk;
          const top = [
            { x: p.x, y: p.y - bh - lift },
            { x: p.x + bw, y: p.y - lift },
            { x: p.x, y: p.y + bh - lift },
            { x: p.x - bw, y: p.y - lift },
          ];
          return (
            <g key={k} strokeLinejoin="round">
              {/* left side (darkest) */}
              <polygon
                points={poly(
                  { x: p.x - bw, y: p.y - lift },
                  { x: p.x, y: p.y + bh - lift },
                  { x: p.x, y: p.y + bh },
                  { x: p.x - bw, y: p.y }
                )}
                fill="#18120f"
                stroke="rgba(255,255,255,0.16)"
                strokeWidth={0.6}
              />
              {/* right side (mid) */}
              <polygon
                points={poly(
                  { x: p.x, y: p.y + bh - lift },
                  { x: p.x + bw, y: p.y - lift },
                  { x: p.x + bw, y: p.y },
                  { x: p.x, y: p.y + bh }
                )}
                fill="#231b16"
                stroke="rgba(255,255,255,0.16)"
                strokeWidth={0.6}
              />
              {/* top (lightest) with a pin-1 dot */}
              <polygon
                points={poly(top[0], top[1], top[2], top[3])}
                fill="#322a23"
                stroke="rgba(255,255,255,0.26)"
                strokeWidth={0.7}
              />
              {/* tiny engraved notch on the top face */}
              <line
                x1={lerp(top[3], top[0], 0.5).x}
                y1={lerp(top[3], top[0], 0.5).y}
                x2={lerp(top[3], top[2], 0.5).x}
                y2={lerp(top[3], top[2], 0.5).y}
                stroke="rgba(255,255,255,0.14)"
                strokeWidth={0.5}
              />
            </g>
          );
        })}
    </g>
  );
}

/** Layer 4 — interface base: perimeter leads + engraved via-holes + a detailed
    central contact pad. */
function DetailBase({ cx, cy }: { cx: number; cy: number }) {
  // perimeter leads dropping from each edge
  const leads: { p: Pt; len: number }[] = [];
  const per = 26;
  for (let k = 0; k < per; k++) {
    const t = 0.08 + (k / (per - 1)) * 0.84;
    leads.push({ p: isoXY(cx, cy, t, 0.06), len: 7 });
    leads.push({ p: isoXY(cx, cy, 0.94, t), len: 7 });
    leads.push({ p: isoXY(cx, cy, t, 0.94), len: 7 });
    leads.push({ p: isoXY(cx, cy, 0.06, t), len: 7 });
  }
  // via-hole grid filling the field (skip the central pad area)
  const vias: Pt[] = [];
  const G = 12;
  for (let i = 0; i < G; i++) {
    for (let j = 0; j < G; j++) {
      const u = 0.16 + (i / (G - 1)) * 0.68;
      const v = 0.16 + (j / (G - 1)) * 0.68;
      const inHole = u > 0.36 && u < 0.64 && v > 0.36 && v < 0.64;
      if (!inHole) vias.push(isoXY(cx, cy, u, v));
    }
  }

  // central contact pad geometry
  const pad = diamond(cx, cy, 0.26);
  const padIn = diamond(cx, cy, 0.2);
  // a small contact-ball array inside the pad
  const contacts: Pt[] = [];
  const C = 5;
  for (let i = 0; i < C; i++) {
    for (let j = 0; j < C; j++) {
      const u = 0.42 + (i / (C - 1)) * 0.16;
      const v = 0.42 + (j / (C - 1)) * 0.16;
      contacts.push(isoXY(cx, cy, u, v));
    }
  }
  // pad corner notches
  const padCorners = [
    isoXY(cx, cy, 0.41, 0.41),
    isoXY(cx, cy, 0.59, 0.41),
    isoXY(cx, cy, 0.59, 0.59),
    isoXY(cx, cy, 0.41, 0.59),
  ];

  return (
    <g>
      {/* leads */}
      <g stroke="currentColor" strokeWidth={1.3}>
        {leads.map((l, k) => (
          <line
            key={k}
            x1={l.p.x}
            y1={l.p.y}
            x2={l.p.x}
            y2={l.p.y + l.len}
            strokeOpacity={0.3}
          />
        ))}
      </g>

      {/* engraved via-holes — small iso recesses with depth shading */}
      <g>
        {vias.map((p, k) => (
          <g key={`via-${k}`}>
            {/* dark bore */}
            <ellipse cx={p.x} cy={p.y + 1} rx={2.2} ry={1.1} fill="#000000" fillOpacity={0.55} />
            {/* rim */}
            <ellipse
              cx={p.x}
              cy={p.y}
              rx={2.4}
              ry={1.2}
              fill="#000000"
              fillOpacity={0.35}
              stroke="currentColor"
              strokeOpacity={0.4}
              strokeWidth={0.5}
            />
            {/* top-left highlight catch */}
            <path
              d={`M ${(p.x - 2.4).toFixed(1)} ${p.y.toFixed(1)} A 2.4 1.2 0 0 1 ${p.x.toFixed(1)} ${(p.y - 1.2).toFixed(1)}`}
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={0.6}
            />
          </g>
        ))}
      </g>

      {/* ── detailed central contact pad ── */}
      {/* outer pad plate */}
      <polygon
        points={poly(pad.top, pad.right, pad.bottom, pad.left)}
        fill="#231b16"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth={0.8}
      />
      {/* recessed inner frame */}
      <polygon
        points={poly(padIn.top, padIn.right, padIn.bottom, padIn.left)}
        fill="#1a1410"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth={0.6}
      />
      {/* contact-ball array inside the pad */}
      <g fill="currentColor">
        {contacts.map((p, k) => (
          <circle key={`ct-${k}`} cx={p.x} cy={p.y} r={1.2} fillOpacity={0.4} />
        ))}
      </g>
      {/* pad corner registration squares */}
      <g fill="currentColor">
        {padCorners.map((p, k) => (
          <rect key={`pc-${k}`} x={p.x - 1.5} y={p.y - 0.8} width={3} height={1.6} fillOpacity={0.5} />
        ))}
      </g>
    </g>
  );
}

/**
 * Gull-wing leads protruding from the two visible bottom edges of a slab
 * (QFP-style), like the reference chip. Each lead is drawn as a solid 3D bar
 * (top face + side face) so it has real width and thickness, not a thin line.
 * Rendered at the IsoLayer level so pins hang in front of the side faces.
 */
function BasePins({
  cx,
  cy,
  topFill,
  sideFill,
  stroke,
}: {
  cx: number;
  cy: number;
  topFill: string;
  sideFill: string;
  stroke: string;
}) {
  const d = diamond(cx, cy);
  const lerp = (a: Pt, b: Pt, t: number): Pt => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  });

  const COUNT = 22;
  const SHOULDER = THICK; // drop down the side face
  const FOOT = 13; // outward foot length
  const TIP = 7; // vertical tip drop
  const PIN_T = 4; // pin thickness (vertical extrusion of each bar)

  type PinFaces = { top: string; side: string };
  const pins: PinFaces[] = [];

  // Build one lead along an edge. `tan` = unit tangent along the edge (gives the
  // pin its WIDTH); `n` = outward iso normal (direction the foot reaches out).
  const buildEdge = (a: Pt, b: Pt, n: Pt, tan: Pt) => {
    const hw = 3.1; // half-width of each lead
    for (let k = 0; k < COUNT; k++) {
      const t = 0.07 + (k / (COUNT - 1)) * 0.86;
      const center = lerp(a, b, t);

      // centreline of the L-shaped lead (top edge of the bar)
      const p0 = center; // at the slab top edge
      const p1 = { x: p0.x, y: p0.y + SHOULDER }; // shoulder: down the side face
      const p2 = { x: p1.x + n.x * FOOT, y: p1.y + n.y * FOOT }; // foot outward
      const p3 = { x: p2.x, y: p2.y + TIP }; // vertical tip

      // width offsets along the tangent
      const wx = tan.x * hw;
      const wy = tan.y * hw;

      const L = [
        { x: p0.x - wx, y: p0.y - wy },
        { x: p1.x - wx, y: p1.y - wy },
        { x: p2.x - wx, y: p2.y - wy },
        { x: p3.x - wx, y: p3.y - wy },
      ];
      const R = [
        { x: p0.x + wx, y: p0.y + wy },
        { x: p1.x + wx, y: p1.y + wy },
        { x: p2.x + wx, y: p2.y + wy },
        { x: p3.x + wx, y: p3.y + wy },
      ];

      // TOP face of the bar = ribbon between L and R
      const topPts = `${L[0].x.toFixed(1)},${L[0].y.toFixed(1)} ${L[1].x.toFixed(1)},${L[1].y.toFixed(1)} ${L[2].x.toFixed(1)},${L[2].y.toFixed(1)} ${L[3].x.toFixed(1)},${L[3].y.toFixed(1)} ${R[3].x.toFixed(1)},${R[3].y.toFixed(1)} ${R[2].x.toFixed(1)},${R[2].y.toFixed(1)} ${R[1].x.toFixed(1)},${R[1].y.toFixed(1)} ${R[0].x.toFixed(1)},${R[0].y.toFixed(1)}`;

      // SIDE face = the lower (R) edge extruded down by PIN_T (the visible thickness)
      const sidePts = `${R[1].x.toFixed(1)},${R[1].y.toFixed(1)} ${R[2].x.toFixed(1)},${R[2].y.toFixed(1)} ${R[3].x.toFixed(1)},${R[3].y.toFixed(1)} ${(R[3].x).toFixed(1)},${(R[3].y + PIN_T).toFixed(1)} ${(R[2].x).toFixed(1)},${(R[2].y + PIN_T).toFixed(1)} ${(R[1].x).toFixed(1)},${(R[1].y + PIN_T).toFixed(1)}`;

      pins.push({ top: topPts, side: sidePts });
    }
  };

  // tangents run along each edge; normals point outward (lower-left / lower-right)
  buildEdge(d.bottom, d.right, { x: 0.5, y: 0.26 }, { x: 0.5, y: -0.25 }); // right
  buildEdge(d.left, d.bottom, { x: -0.5, y: 0.26 }, { x: 0.5, y: 0.25 }); // left

  return (
    <g strokeLinejoin="round">
      {pins.map((p, k) => (
        <g key={k}>
          {/* side (thickness) first, then top so the bar reads solid */}
          <polygon
            points={p.side}
            fill={sideFill}
            stroke={stroke}
            strokeOpacity={0.5}
            strokeWidth={0.5}
          />
          <polygon
            points={p.top}
            fill={topFill}
            stroke={stroke}
            strokeOpacity={0.7}
            strokeWidth={0.6}
          />
        </g>
      ))}
    </g>
  );
}

function LayerDetail({
  cx,
  cy,
  variant,
}: {
  cx: number;
  cy: number;
  variant: number;
  accent?: boolean;
}) {
  if (variant === 0) return <DetailLid cx={cx} cy={cy} />;
  if (variant === 1) return <DetailDie cx={cx} cy={cy} />;
  if (variant === 2) return <DetailRouting cx={cx} cy={cy} />;
  if (variant === 3) return <DetailBlocks cx={cx} cy={cy} />;
  return <DetailBase cx={cx} cy={cy} />;
}

/** A single extruded isometric slab with hero-style multi-tone face shading. */
function IsoLayer({
  cx,
  cy,
  variant,
  accent,
}: {
  cx: number;
  cy: number;
  variant: number;
  accent?: boolean;
}) {
  const tone = LAYER_TONES[variant];
  const top = diamond(cx, cy);
  const botRight = { x: top.right.x, y: top.right.y + THICK };
  const botBottom = { x: top.bottom.x, y: top.bottom.y + THICK };
  const botLeft = { x: top.left.x, y: top.left.y + THICK };

  const leftPts = poly(top.left, top.bottom, botBottom, botLeft);
  const rightPts = poly(top.bottom, top.right, botRight, botBottom);
  const topPts = poly(top.top, top.right, top.bottom, top.left);

  return (
    <g strokeLinejoin="round">
      {/* Solid, opaque multi-tone faces — occludes layers behind + reads as
          real material (top lightest, left darkest, right mid). */}
      <polygon
        points={leftPts}
        fill={tone.left}
        stroke={tone.stroke}
        strokeWidth={tone.sw}
      />
      <polygon
        points={rightPts}
        fill={tone.right}
        stroke={tone.stroke}
        strokeWidth={tone.sw}
      />
      <polygon
        points={topPts}
        fill={tone.top}
        stroke={tone.stroke}
        strokeWidth={tone.sw}
      />

      {/* subtle inner top-edge highlight for a beveled-material feel */}
      <polyline
        points={poly(top.left, top.top, top.right)}
        fill="none"
        stroke={accent ? BRAND_HI : "rgba(255,255,255,0.14)"}
        strokeOpacity={accent ? 0.5 : 1}
        strokeWidth={0.75}
      />

      {/* detailing on the top face */}
      <g style={{ color: tone.detail }}>
        <LayerDetail cx={cx} cy={cy} variant={variant} accent={accent} />
      </g>

      {/* gull-wing leads on the bottom slab's outer edges (QFP look) */}
      {variant === 4 && (
        <BasePins
          cx={cx}
          cy={cy}
          topFill="#23211F"
          sideFill="#121110"
          stroke="rgba(255,255,255,0.22)"
        />
      )}
    </g>
  );
}

/** The full exploded stack rendered as one SVG. */
function IsoStack() {
  // Unique, DOM-safe prefix per instance so duplicate mounts (desktop + mobile)
  // never share gradient IDs. useId() returns a value with colons, which are
  // invalid in url(#...) refs, so strip them.
  const rawId = useId();
  const idPrefix = `cv${rawId.replace(/:/g, "")}`;
  const threadId = `${idPrefix}-thread`;
  const boreId = `${idPrefix}-hole-bore`;
  const wallId = `${idPrefix}-hole-wall`;

  const cx = 290;
  const startY = 120;
  const gap = 112; // exploded spacing between layers
  const layers = [0, 1, 2, 3, 4].map((i) => ({
    variant: i,
    cy: startY + i * gap,
    accent: i === 1, // highlight the "Cited" layer as the accent plate
  }));

  return (
    <GradientIdContext.Provider value={idPrefix}>
      <svg
        viewBox="0 0 580 720"
        className="w-full h-auto"
        role="img"
        aria-label="Exploded isometric view of the Context Vault knowledge stack"
      >
        <defs>
          <linearGradient id={threadId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
          {/* Bore shading: deepest/darkest near front-bottom, lifts toward the
              back-top rim where light from the upper-left grazes the wall. */}
          <radialGradient id={boreId} cx="0.5" cy="0.32" r="0.75">
            <stop offset="0%" stopColor="#000000" />
            <stop offset="55%" stopColor="#040404" />
            <stop offset="100%" stopColor="#1c1c1c" />
          </radialGradient>
          {/* Counterbore floor — a touch lighter than the bore so the step reads */}
          <linearGradient id={wallId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a2a2a" />
            <stop offset="100%" stopColor="#050505" />
          </linearGradient>
        </defs>

        {/* connecting thread running through every layer centre */}
        <line
          x1={cx}
          y1={startY - 40}
          x2={cx}
          y2={startY + 4 * gap + 56}
          stroke={`url(#${threadId})`}
          strokeWidth={1.5}
          strokeDasharray="2 6"
        />

        {/* render bottom-to-top so upper layers overlap lower ones */}
        {[...layers].reverse().map((l) => (
          <IsoLayer
            key={l.variant}
            cx={cx}
            cy={l.cy}
            variant={l.variant}
            accent={l.accent}
          />
        ))}
      </svg>
    </GradientIdContext.Provider>
  );
}

// Layer centre as a percentage of the 720-unit SVG viewBox height.
// cy = 120 + i*112 -> [120, 232, 344, 456, 568] / 720
const LAYER_TOP_PCT = [16.7, 32.2, 47.8, 63.3, 78.9];

function PillarLabel({ pillar, topPct }: { pillar: Pillar; topPct: number }) {
  const isRight = pillar.side === "right";
  return (
    <div
      className="absolute w-[20rem] -translate-y-1/2"
      style={{
        top: `${topPct}%`,
        ...(isRight
          ? { left: "calc(100% + 3rem)" }
          : { right: "calc(100% + 3rem)" }),
      }}
    >

      <div className={isRight ? "text-left" : "text-right"}>
        <h3 className="text-lg font-semibold text-foreground leading-tight mb-2">
          {pillar.title}
        </h3>
        <p className="text-sm text-foreground-muted leading-relaxed">
          {pillar.body}
        </p>
      </div>
    </div>
  );
}

export function ContextVault() {
  return (
    <section
      id="context-vault"
      className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Centered header */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="flex justify-center mb-6">
            <div className="group relative">
              <div
                aria-hidden
                className="absolute -top-px -left-px w-16 h-9 rounded-full blur-[1px]"
                style={{
                  background:
                    "radial-gradient(ellipse at top left, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 70%)",
                }}
              />
              <div
                aria-hidden
                className="absolute -bottom-px -right-px w-16 h-9 rounded-full blur-[1px]"
                style={{
                  background:
                    "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 30%, transparent 70%)",
                }}
              />
              <div className="absolute -inset-0.5 rounded-full border border-white/10" />
              <div className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/95 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="relative z-10 text-xs sm:text-sm text-foreground font-medium">
                  New · Context Vault
                </span>
              </div>
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4 tracking-tight leading-[1.1]">
            A shared brain for your whole team
          </h2>
          <p className="text-base sm:text-lg text-foreground-muted max-w-2xl mx-auto">
            Drop in your docs. MemContext extracts the facts, cites the source,
            and learns from every correction - so your knowledge base gets
            sharper the more your team uses it.
          </p>
        </div>

        {/* ---- Desktop: exploded diagram with labels anchored to each layer ---- */}
        <div className="hidden lg:block relative">
         

          {/* The stack defines the height; labels are absolutely anchored to it */}
          <div className="relative mx-auto max-w-[460px]">
            <IsoStack />

            {pillars.map((p, i) => (
              <PillarLabel key={p.title} pillar={p} topPct={LAYER_TOP_PCT[i]} />
            ))}
          </div>

          {/* CTA centered below */}
          <div className="flex justify-center mt-10">
            <CtaButton />
          </div>
        </div>

        {/* ---- Mobile / tablet fallback: stack on top, labels in a grid ---- */}
        <div className="lg:hidden">
          <div className="relative mx-auto max-w-sm mb-10">
            <div
              aria-hidden
              className="absolute inset-0 blur-3xl opacity-40 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 35%, rgba(232,97,60,0.18) 0%, transparent 60%)",
              }}
            />
            <div className="relative">
              <IsoStack />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-8">
            {pillars.map((p) => (
              <div key={p.title} className="flex flex-col">
                <h3 className="text-base font-semibold text-foreground mb-1.5">
                  {p.title}
                </h3>
                <p className="text-sm text-foreground-muted leading-relaxed">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-10">
            <CtaButton />
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaButton() {
  return (
    <a
      href="https://docs.memcontext.in/context-vault/overview"
      target="_blank"
      rel="noopener noreferrer"
      className="group relative inline-block"
    >
      <div className="absolute -inset-0.5 rounded-xl border border-white/8" />
      <div className="relative flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-surface/60 backdrop-blur-sm border border-white/[0.08] transition-all group-hover:border-white/15 group-hover:bg-surface/80">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.04] via-transparent to-transparent" />
        <span className="text-sm sm:text-base text-foreground font-display font-semibold relative z-10">
          Explore Context Vault
        </span>
        <ArrowRight className="w-4 h-4 text-foreground relative z-10 transition-transform group-hover:translate-x-1" />
      </div>
    </a>
  );
}
