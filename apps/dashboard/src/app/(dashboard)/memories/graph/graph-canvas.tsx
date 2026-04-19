"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-2d";
import type { MemoryGraphLink, MemoryGraphNode } from "@memcontext/types";

type CanvasNode = MemoryGraphNode & {
  color: string;
  categoryColor: string;
  size: number;
};

type CanvasLink = MemoryGraphLink;

type ForceNode = NodeObject<CanvasNode>;
type ForceLink = LinkObject<CanvasNode, CanvasLink>;

type ForceFn = ((alpha: number) => void) & {
  initialize?: (nodes: ForceNode[]) => void;
};

interface GraphCanvasProps {
  nodes: CanvasNode[];
  links: CanvasLink[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onHoverNode: (id: string | null) => void;
  highlightIds: Set<string>;
  activeNodeId: string | null;
  stats: {
    totalNodes: number;
    relationLinks: number;
    derivedLinks: number;
    projectCount: number;
    categoryCount: number;
  };
}

function resolveId(
  endpoint: string | number | ForceNode | undefined,
): string {
  if (typeof endpoint === "string") return endpoint;
  if (typeof endpoint === "number") return String(endpoint);
  if (endpoint && typeof endpoint === "object" && "id" in endpoint && endpoint.id) {
    return String(endpoint.id);
  }
  return "";
}

function getLinkRGB(link: CanvasLink): string {
  switch (link.type) {
    case "extends":
      return "200, 132, 108"; // muted warm
    case "similar":
      return "155, 177, 196"; // soft slate
    case "shared-root":
      return "170, 153, 196"; // muted violet
    case "shared-project":
      return "128, 155, 196"; // soft blue
    case "shared-category":
      return "196, 169, 122"; // muted gold
    default:
      return "148, 163, 184";
  }
}

function getLinkBaseAlpha(link: CanvasLink): number {
  switch (link.type) {
    case "extends":
      return 0.9;
    case "similar":
      return 0.38;
    case "shared-root":
      return 0.34;
    case "shared-project":
      return 0.26;
    case "shared-category":
      return 0.2;
    default:
      return 0.22;
  }
}

function getLinkWidth(link: CanvasLink): number {
  if (link.type === "extends") return 1.5;
  if (link.type === "similar") return 1.1;
  return 0.8;
}

export default function GraphCanvas(props: GraphCanvasProps) {
  const {
    nodes,
    links,
    selectedNodeId,
    hoveredNodeId,
    onSelectNode,
    onHoverNode,
    highlightIds,
    activeNodeId,
    stats,
  } = props;

  const graphRef = useRef<ForceGraphMethods<CanvasNode, CanvasLink> | undefined>(
    undefined,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 960, height: 680 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [legendOpen, setLegendOpen] = useState(true);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setDimensions({
        width: Math.max(320, Math.floor(rect.width)),
        height: Math.max(420, Math.floor(rect.height || 680)),
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // IMPORTANT: react-force-graph mutates link.source/target into node refs in
  // place, which breaks any consumer that still treats them as id strings.
  // Clone each link so the library mutates copies instead of our source array.
  // We intentionally DO NOT clone nodes — the same references allow the library
  // to keep x/y positions stable across re-renders.
  const graphData = useMemo(
    () => ({
      nodes,
      links: links.map((link) => ({ ...link })),
    }),
    [links, nodes],
  );

  const fitToView = useCallback(() => {
    graphRef.current?.zoomToFit(500, 90);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(fitToView, 500);
    return () => window.clearTimeout(timer);
  }, [fitToView, nodes.length]);

  // Forces: stronger repulsion, link spacing, AND a weak centering force so
  // disconnected memories stay in-frame near the main cluster.
  useEffect(() => {
    const instance = graphRef.current;
    if (!instance) return;

    const chargeForce = instance.d3Force("charge") as unknown as
      | { strength?: (value: number) => void }
      | undefined;
    if (chargeForce?.strength) chargeForce.strength(-260);

    const linkForce = instance.d3Force("link") as unknown as
      | {
          distance?: (value: number) => void;
          strength?: (value: number) => void;
        }
      | undefined;
    if (linkForce?.distance) linkForce.distance(70);
    if (linkForce?.strength) linkForce.strength(0.4);

    // Custom gentle centering force (keeps orphan nodes in-frame).
    let forceNodes: ForceNode[] = [];
    const centerStrength = 0.055;

    const centerX: ForceFn = (alpha: number) => {
      for (const node of forceNodes) {
        if (typeof node.x === "number") {
          node.vx = (node.vx ?? 0) - node.x * centerStrength * alpha;
        }
      }
    };
    centerX.initialize = (nodeList) => {
      forceNodes = nodeList;
    };

    const centerY: ForceFn = (alpha: number) => {
      for (const node of forceNodes) {
        if (typeof node.y === "number") {
          node.vy = (node.vy ?? 0) - node.y * centerStrength * alpha;
        }
      }
    };
    centerY.initialize = (nodeList) => {
      forceNodes = nodeList;
    };

    // Typed caller without leaking `any` externally.
    const register = instance.d3Force as unknown as (
      name: string,
      fn: ForceFn | null,
    ) => void;
    register("x", centerX);
    register("y", centerY);

    instance.d3ReheatSimulation();
  }, [nodes.length]);

  const handleZoom = useCallback((delta: number) => {
    const instance = graphRef.current;
    if (!instance) return;
    const current = instance.zoom();
    instance.zoom(Math.max(0.3, Math.min(current + delta, 8)), 220);
  }, []);

  const activeNode = useMemo(() => {
    if (!activeNodeId) return null;
    return nodes.find((node) => node.id === activeNodeId) ?? null;
  }, [activeNodeId, nodes]);

  return (
    <div
      ref={containerRef}
      className="relative h-[680px] w-full overflow-hidden rounded-xl"
      style={{
        background:
          "radial-gradient(ellipse at 50% 115%, rgba(59, 73, 223, 0.28), transparent 55%), radial-gradient(ellipse at 15% 10%, rgba(168, 139, 250, 0.08), transparent 45%), linear-gradient(180deg, #0a0d1a 0%, #070915 100%)",
      }}
    >
      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <ForceGraph2D<CanvasNode, CanvasLink>
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        backgroundColor="rgba(0,0,0,0)"
        cooldownTicks={200}
        warmupTicks={80}
        d3VelocityDecay={0.28}
        d3AlphaDecay={0.02}
        minZoom={0.3}
        maxZoom={8}
        linkDirectionalArrowLength={0}
        linkCurvature={0}
        linkWidth={(link) => getLinkWidth(link as CanvasLink)}
        linkColor={(link) => {
          const linkData = link as CanvasLink;
          const rgb = getLinkRGB(linkData);
          const baseAlpha = getLinkBaseAlpha(linkData);

          if (!activeNodeId) return `rgba(${rgb}, ${baseAlpha})`;

          const sourceId = resolveId((link as ForceLink).source);
          const targetId = resolveId((link as ForceLink).target);
          const isTouching = sourceId === activeNodeId || targetId === activeNodeId;
          return `rgba(${rgb}, ${isTouching ? Math.min(1, baseAlpha + 0.35) : 0.04})`;
        }}
        onZoom={(transform) => setZoomLevel(transform.k)}
        onRenderFramePost={() => {
          // Update tooltip position every animation frame so it follows the node
          // while the simulation is running.
          const tooltip = tooltipRef.current;
          const instance = graphRef.current;
          if (!tooltip || !instance) return;

          if (!activeNode || typeof activeNode.id === "undefined") {
            if (tooltip.style.opacity !== "0") tooltip.style.opacity = "0";
            return;
          }

          // react-force-graph nodes mutate in place — find current position.
          const current = graphData.nodes.find((n) => n.id === activeNode.id);
          const forceCurrent = current as ForceNode | undefined;
          if (
            !forceCurrent ||
            typeof forceCurrent.x !== "number" ||
            typeof forceCurrent.y !== "number"
          ) {
            tooltip.style.opacity = "0";
            return;
          }

          const coords = instance.graph2ScreenCoords(
            forceCurrent.x,
            forceCurrent.y,
          );
          const size = forceCurrent.size ?? 6;
          const offsetX = size + 14;
          tooltip.style.transform = `translate(${coords.x + offsetX}px, ${coords.y - 14}px)`;
          tooltip.style.opacity = "1";
        }}
        nodeRelSize={4}
        nodeLabel={() => ""}
        nodeCanvasObjectMode={() => "replace"}
        nodeCanvasObject={(node, ctx) => {
          const casted = node as ForceNode;
          const x = casted.x ?? 0;
          const y = casted.y ?? 0;
          const baseRadius = casted.size ?? 5;

          const isSelected = casted.id === selectedNodeId;
          const isHovered = casted.id === hoveredNodeId;
          const isActive = isSelected || isHovered;
          const isDim =
            Boolean(activeNodeId) && !highlightIds.has(String(casted.id));

          ctx.save();

          // Strong glow when active
          if (isActive) {
            const glowRadius = baseRadius + 16;
            const glowGradient = ctx.createRadialGradient(
              x,
              y,
              baseRadius * 0.6,
              x,
              y,
              glowRadius,
            );
            glowGradient.addColorStop(0, `${casted.color}99`);
            glowGradient.addColorStop(0.55, `${casted.color}22`);
            glowGradient.addColorStop(1, `${casted.color}00`);
            ctx.beginPath();
            ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
            ctx.fillStyle = glowGradient;
            ctx.fill();
          }

          ctx.globalAlpha = isDim ? 0.18 : 1;

          // Soft outer halo (always on, very subtle)
          const haloGradient = ctx.createRadialGradient(
            x,
            y,
            baseRadius,
            x,
            y,
            baseRadius + 5,
          );
          haloGradient.addColorStop(0, `${casted.color}44`);
          haloGradient.addColorStop(1, `${casted.color}00`);
          ctx.beginPath();
          ctx.arc(x, y, baseRadius + 5, 0, Math.PI * 2);
          ctx.fillStyle = haloGradient;
          ctx.fill();

          // Node body
          ctx.beginPath();
          ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
          ctx.fillStyle = casted.color;
          ctx.fill();

          // Inner highlight for depth
          const innerGradient = ctx.createRadialGradient(
            x - baseRadius * 0.35,
            y - baseRadius * 0.35,
            0,
            x,
            y,
            baseRadius,
          );
          innerGradient.addColorStop(0, "rgba(255,255,255,0.55)");
          innerGradient.addColorStop(0.6, "rgba(255,255,255,0)");
          ctx.beginPath();
          ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
          ctx.fillStyle = innerGradient;
          ctx.fill();

          // Selection / hover ring — subtle tonal ring rather than hard white.
          if (isActive) {
            ctx.beginPath();
            ctx.arc(x, y, baseRadius + 2, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(226, 232, 240, 0.78)";
            ctx.lineWidth = 1.25;
            ctx.stroke();
          }

          ctx.restore();
        }}
        nodePointerAreaPaint={(node, color, ctx) => {
          const casted = node as ForceNode;
          const radius = (casted.size ?? 5) + 6;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(casted.x ?? 0, casted.y ?? 0, radius, 0, Math.PI * 2);
          ctx.fill();
        }}
        enableNodeDrag
        onNodeClick={(node) => {
          onSelectNode(String(node.id));
          const instance = graphRef.current;
          if (instance && typeof node.x === "number" && typeof node.y === "number") {
            instance.centerAt(node.x, node.y, 500);
            instance.zoom(Math.max(instance.zoom(), 1.6), 500);
          }
        }}
        onNodeHover={(node) => {
          onHoverNode(node ? String(node.id) : null);
        }}
        onBackgroundClick={() => onSelectNode(null)}
      />

      {/* Floating Supermemory-style hover/selection tooltip */}
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute left-0 top-0 z-10 w-72 origin-top-left opacity-0 transition-opacity duration-150"
      >
        {activeNode && (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[rgba(8,10,20,0.94)] shadow-[0_10px_40px_rgba(0,0,0,0.55)] backdrop-blur-md">
            <div className="flex items-start gap-3 px-4 py-3">
              <span
                className="mt-1 h-3 w-3 shrink-0 rounded-full border border-white/20"
                style={{
                  background: activeNode.color,
                  boxShadow: `0 0 10px ${activeNode.color}`,
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-snug text-slate-100">
                  {activeNode.label}
                </p>
                <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-slate-400">
                  {activeNode.content}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 border-t border-white/5 px-4 py-2 text-[10.5px]">
              {activeNode.project && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-300">
                  {activeNode.project}
                </span>
              )}
              {activeNode.category && (
                <span
                  className="rounded-full border px-2 py-0.5"
                  style={{
                    borderColor: `${activeNode.categoryColor}55`,
                    color: activeNode.categoryColor,
                    background: `${activeNode.categoryColor}14`,
                  }}
                >
                  {activeNode.category}
                </span>
              )}
              {activeNode.rootId && (
                <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-violet-300">
                  version chain
                </span>
              )}
              <span className="ml-auto text-slate-500">
                {activeNode.degree} link{activeNode.degree === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Floating stats / legend panel */}
      <div className="pointer-events-auto absolute left-4 top-4 w-60 overflow-hidden rounded-xl border border-white/10 bg-[rgba(8,10,20,0.82)] text-slate-200 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <button
          type="button"
          onClick={() => setLegendOpen((value) => !value)}
          className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-300 transition hover:bg-white/5"
        >
          <span className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="7" cy="7" r="1.8" fill="currentColor" />
            </svg>
            Graph overview
          </span>
          <span
            className={`transition-transform ${legendOpen ? "rotate-0" : "-rotate-90"}`}
          >
            ⌄
          </span>
        </button>

        {legendOpen && (
          <div className="space-y-4 border-t border-white/5 px-4 py-3">
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Statistics
              </p>
              <div className="space-y-1.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Memories</span>
                  <span className="font-mono text-slate-100">
                    {stats.totalNodes}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Real links</span>
                  <span className="font-mono text-slate-100">
                    {stats.relationLinks}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Shared links</span>
                  <span className="font-mono text-slate-100">
                    {stats.derivedLinks}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Projects</span>
                  <span className="font-mono text-slate-100">
                    {stats.projectCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Categories</span>
                  <span className="font-mono text-slate-100">
                    {stats.categoryCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Connections
              </p>
              <div className="space-y-1.5 text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="h-[2px] w-6 rounded-full bg-[#c8846c]" />
                  <span className="text-slate-300">Extends</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-[2px] w-6 rounded-full bg-[#9bb1c4]" />
                  <span className="text-slate-300">Similar</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-[2px] w-6 rounded-full"
                    style={{
                      background:
                        "repeating-linear-gradient(90deg, #aa99c4 0, #aa99c4 3px, transparent 3px, transparent 6px)",
                    }}
                  />
                  <span className="text-slate-300">Shared root</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-[2px] w-6 rounded-full"
                    style={{
                      background:
                        "repeating-linear-gradient(90deg, #809bc4 0, #809bc4 3px, transparent 3px, transparent 6px)",
                    }}
                  />
                  <span className="text-slate-300">Shared project</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-[2px] w-6 rounded-full"
                    style={{
                      background:
                        "repeating-linear-gradient(90deg, #c4a97a 0, #c4a97a 3px, transparent 3px, transparent 6px)",
                    }}
                  />
                  <span className="text-slate-300">Shared category</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="pointer-events-auto absolute right-4 top-4 flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[rgba(8,10,20,0.82)] text-slate-200 shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={() => handleZoom(0.6)}
          className="px-3 py-2 text-lg leading-none transition hover:bg-white/10"
          aria-label="Zoom in"
        >
          +
        </button>
        <div className="h-px bg-white/10" />
        <button
          type="button"
          onClick={() => handleZoom(-0.6)}
          className="px-3 py-2 text-lg leading-none transition hover:bg-white/10"
          aria-label="Zoom out"
        >
          −
        </button>
        <div className="h-px bg-white/10" />
        <button
          type="button"
          onClick={fitToView}
          className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition hover:bg-white/10"
          aria-label="Fit to view"
        >
          Fit
        </button>
      </div>

      {/* Zoom indicator */}
      <div className="pointer-events-none absolute right-4 bottom-4 rounded-md border border-white/10 bg-black/50 px-2 py-1 font-mono text-[10px] text-slate-400 backdrop-blur">
        {Math.round(zoomLevel * 100)}%
      </div>

      {/* Hint */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.25em] text-slate-500">
        scroll to zoom · drag to pan · click a node to focus
      </div>
    </div>
  );
}
