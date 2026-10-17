"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-2d";
import { CaretDown } from "@phosphor-icons/react";
import type { MemoryGraphLink, MemoryGraphNode } from "@memcontext/types";
import { cn } from "@/lib/utils";

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
      return "232, 97, 60"; // coral (accent) — strongest, real relation
    case "similar":
      return "217, 119, 87"; // terracotta — semantic similarity
    case "shared-root":
      return "196, 144, 106"; // warm sand — version chain
    case "shared-project":
      return "163, 147, 138"; // warm grey — shared project
    case "shared-category":
      return "138, 106, 94"; // dusty mocha — shared category
    default:
      return "163, 147, 138";
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

function isDerivedLink(link: CanvasLink): boolean {
  return (
    link.type === "shared-project" ||
    link.type === "shared-category" ||
    link.type === "shared-root"
  );
}

function getLinkWidth(link: CanvasLink, zoomedOut: boolean): number {
  if (link.type === "extends") return zoomedOut ? 1.4 : 1.6;
  if (link.type === "similar") return zoomedOut ? 1 : 1.2;
  return zoomedOut ? 0.5 : 0.8;
}

// Below this zoom the graph switches to a lightweight, low-noise rendering.
const DETAIL_ZOOM = 0.8;
const HUB_SIZE = 9;

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
    instance.zoom(Math.max(0.02, Math.min(current + delta, 3)), 220);
  }, []);

  // Tooltip follows the hovered node first, falling back to the selection.
  const tooltipNodeId = hoveredNodeId ?? activeNodeId;
  const activeNode = useMemo(() => {
    if (!tooltipNodeId) return null;
    return nodes.find((node) => node.id === tooltipNodeId) ?? null;
  }, [tooltipNodeId, nodes]);

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-[420px] w-full flex-1 overflow-hidden bg-background-secondary"
    >
      {/* Subtle grid pattern — uses currentColor so it adapts */}
      <div
        className="pointer-events-none absolute inset-0 text-foreground opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
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
        minZoom={0.02}
        maxZoom={3}
        linkDirectionalArrowLength={0}
        linkCurvature={0}
        linkWidth={(link) => {
          const linkData = link as CanvasLink;
          const zoomedOut = zoomLevel < DETAIL_ZOOM;
          if (!activeNodeId) return getLinkWidth(linkData, zoomedOut);
          const sourceId = resolveId((link as ForceLink).source);
          const targetId = resolveId((link as ForceLink).target);
          const isTouching = sourceId === activeNodeId || targetId === activeNodeId;
          return isTouching
            ? getLinkWidth(linkData, false) + 0.4
            : getLinkWidth(linkData, zoomedOut);
        }}
        linkColor={(link) => {
          const linkData = link as CanvasLink;
          const rgb = getLinkRGB(linkData);
          const quiet = zoomLevel < DETAIL_ZOOM && isDerivedLink(linkData);
          const baseAlpha = getLinkBaseAlpha(linkData) * (quiet ? 0.45 : 1);

          if (!activeNodeId) return `rgba(${rgb}, ${baseAlpha})`;

          const sourceId = resolveId((link as ForceLink).source);
          const targetId = resolveId((link as ForceLink).target);
          const isTouching = sourceId === activeNodeId || targetId === activeNodeId;
          return isTouching
            ? `rgba(${rgb}, ${Math.min(1, getLinkBaseAlpha(linkData) + 0.4)})`
            : `rgba(${rgb}, ${quiet ? 0.02 : 0.04})`;
        }}
        onZoom={(transform) => {
          // Defer to next microtask so we don't update GraphCanvas state
          // while ForceGraph2D is still in its render phase (React warns
          // about cross-component setState-during-render otherwise).
          queueMicrotask(() => setZoomLevel(transform.k));
        }}
        onRenderFramePost={(_ctx, globalScale) => {
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
          // Keep the tooltip inside the canvas (flip left near the right edge).
          const offsetX = (forceCurrent.size ?? 6) * globalScale + 12;
          const margin = 8;
          let left = coords.x + offsetX;
          if (left + tooltip.offsetWidth > dimensions.width - margin) {
            left = coords.x - offsetX - tooltip.offsetWidth;
          }
          left = Math.max(margin, left);
          const top = Math.max(
            margin,
            Math.min(coords.y - 14, dimensions.height - tooltip.offsetHeight - margin),
          );
          tooltip.style.transform = `translate(${left}px, ${top}px)`;
          tooltip.style.opacity = "1";
        }}
        nodeRelSize={4}
        nodeLabel={() => ""}
        nodeCanvasObjectMode={() => "replace"}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const casted = node as ForceNode;
          const x = casted.x ?? 0;
          const y = casted.y ?? 0;
          const baseRadius = casted.size ?? 5;
          // One screen pixel in graph units.
          const px = 1 / globalScale;
          // Stays within the hit radius: max(size + 4, 7 / globalScale).
          const radius = Math.max(baseRadius, 1.6 * px);
          const detailed = globalScale > DETAIL_ZOOM;
          const isHub = baseRadius >= HUB_SIZE;

          const isSelected = casted.id === selectedNodeId;
          const isHovered = casted.id === hoveredNodeId;
          const isActive = isSelected || isHovered;
          const isDim =
            Boolean(activeNodeId) && !highlightIds.has(String(casted.id));

          ctx.save();

          if (isActive) {
            const glowRadius = radius + Math.max(16, 14 * px);
            const glowGradient = ctx.createRadialGradient(
              x,
              y,
              radius * 0.6,
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

          ctx.globalAlpha = isDim ? (detailed ? 0.18 : 0.12) : 1;

          if (detailed) {
            const haloGradient = ctx.createRadialGradient(
              x,
              y,
              radius,
              x,
              y,
              radius + 5,
            );
            haloGradient.addColorStop(0, `${casted.color}44`);
            haloGradient.addColorStop(1, `${casted.color}00`);
            ctx.beginPath();
            ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
            ctx.fillStyle = haloGradient;
            ctx.fill();
          } else if (isHub) {
            // Cheap flat halo so hubs still read as anchors when zoomed out.
            ctx.beginPath();
            ctx.arc(x, y, radius + 3 * px, 0, Math.PI * 2);
            ctx.fillStyle = `${casted.color}38`;
            ctx.fill();
          }

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = casted.color;
          ctx.fill();

          if (detailed) {
            const innerGradient = ctx.createRadialGradient(
              x - radius * 0.35,
              y - radius * 0.35,
              0,
              x,
              y,
              radius,
            );
            innerGradient.addColorStop(0, "rgba(255,255,255,0.55)");
            innerGradient.addColorStop(0.6, "rgba(255,255,255,0)");
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = innerGradient;
            ctx.fill();

            if (isHub && !isActive) {
              ctx.beginPath();
              ctx.arc(x, y, radius + 1.8, 0, Math.PI * 2);
              ctx.strokeStyle = `${casted.color}66`;
              ctx.lineWidth = 0.8;
              ctx.stroke();
            }
          } else if (isHub) {
            ctx.beginPath();
            ctx.arc(x, y, radius * 0.42, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.55)";
            ctx.fill();
          }

          // Selection / hover ring — accent-tinted so it works in both themes.
          if (isActive) {
            ctx.beginPath();
            ctx.arc(x, y, radius + Math.max(2, 2.5 * px), 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(232, 97, 60, 0.9)";
            ctx.lineWidth = Math.max(1.5, 1.5 * px);
            ctx.stroke();
          }

          ctx.restore();
        }}
        nodePointerAreaPaint={(node, color, ctx, globalScale) => {
          const casted = node as ForceNode;
          // Keep at least ~7 screen px of hit radius when zoomed out.
          const radius = Math.max((casted.size ?? 5) + 4, 7 / globalScale);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(casted.x ?? 0, casted.y ?? 0, radius, 0, Math.PI * 2);
          ctx.fill();
        }}
        // Links aren't interactive; without this their wide hit areas
        // swallow hovers meant for the (tiny) nodes they connect.
        linkPointerAreaPaint={() => undefined}
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
          <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated/95 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <div className="h-0.5 w-full" style={{ background: activeNode.color }} />
            <div className="flex items-start gap-2.5 px-3.5 pb-3 pt-2.5">
              <span
                className="mt-[3px] h-2 w-2 shrink-0 rounded-full"
                style={{
                  background: activeNode.color,
                  boxShadow: `0 0 0 3px ${activeNode.color}26`,
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[13px] font-semibold leading-snug tracking-tight text-foreground">
                  {activeNode.label}
                </p>
                <p className="mt-1.5 line-clamp-4 text-[11px] leading-relaxed text-foreground-muted">
                  {activeNode.content}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1 border-t border-border bg-surface/40 px-3.5 py-1.5 text-[10px]">
              {activeNode.project && (
                <span className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-foreground-muted">
                  {activeNode.project}
                </span>
              )}
              {activeNode.category && (
                <span
                  className="rounded-sm border px-1.5 py-0.5"
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
                <span className="rounded-sm border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-accent">
                  version chain
                </span>
              )}
              <span className="ml-auto text-foreground-subtle">
                {activeNode.degree} link{activeNode.degree === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Floating stats / legend panel */}
      <div className="pointer-events-auto absolute left-3 top-3 w-52 overflow-hidden rounded-lg border border-border bg-surface-elevated/90 text-foreground backdrop-blur-md">
        <button
          type="button"
          onClick={() => setLegendOpen((value) => !value)}
          className="flex w-full items-center justify-between px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted transition hover:bg-surface-hover"
        >
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="7" cy="7" r="1.8" fill="currentColor" />
            </svg>
            Graph overview
          </span>
          <CaretDown
            className={cn(
              "h-3 w-3 transition-transform",
              !legendOpen && "-rotate-90",
            )}
            weight="bold"
          />
        </button>

        {legendOpen && (
          <div className="space-y-3 border-t border-border px-3 py-2.5">
            <div className="space-y-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-foreground-subtle">
                Statistics
              </p>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-foreground-muted">Memories</span>
                  <span className="font-mono text-foreground">
                    {stats.totalNodes}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground-muted">Real links</span>
                  <span className="font-mono text-foreground">
                    {stats.relationLinks}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground-muted">Shared links</span>
                  <span className="font-mono text-foreground">
                    {stats.derivedLinks}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground-muted">Projects</span>
                  <span className="font-mono text-foreground">
                    {stats.projectCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground-muted">Categories</span>
                  <span className="font-mono text-foreground">
                    {stats.categoryCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-foreground-subtle">
                Connections
              </p>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="h-[2px] w-5 rounded-full bg-[#e8613c]" />
                  <span className="text-foreground-muted">Extends</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-[2px] w-5 rounded-full bg-[#d97757]" />
                  <span className="text-foreground-muted">Similar</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-[2px] w-5 rounded-full"
                    style={{
                      background:
                        "repeating-linear-gradient(90deg, #c4906a 0, #c4906a 3px, transparent 3px, transparent 6px)",
                    }}
                  />
                  <span className="text-foreground-muted">Shared root</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-[2px] w-5 rounded-full"
                    style={{
                      background:
                        "repeating-linear-gradient(90deg, #a3938a 0, #a3938a 3px, transparent 3px, transparent 6px)",
                    }}
                  />
                  <span className="text-foreground-muted">Shared project</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-[2px] w-5 rounded-full"
                    style={{
                      background:
                        "repeating-linear-gradient(90deg, #8a6a5e 0, #8a6a5e 3px, transparent 3px, transparent 6px)",
                    }}
                  />
                  <span className="text-foreground-muted">
                    Shared category
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="pointer-events-auto absolute right-3 top-3 flex flex-col overflow-hidden rounded-lg border border-border bg-surface-elevated/90 text-foreground backdrop-blur-md">
        <button
          type="button"
          onClick={() => handleZoom(0.6)}
          className="h-7 w-7 text-sm leading-none text-foreground-muted transition hover:bg-surface-hover hover:text-foreground"
          aria-label="Zoom in"
        >
          +
        </button>
        <div className="h-px bg-border" />
        <button
          type="button"
          onClick={() => handleZoom(-0.6)}
          className="h-7 w-7 text-sm leading-none text-foreground-muted transition hover:bg-surface-hover hover:text-foreground"
          aria-label="Zoom out"
        >
          −
        </button>
        <div className="h-px bg-border" />
        <button
          type="button"
          onClick={fitToView}
          className="h-7 w-7 text-[9px] font-semibold uppercase tracking-wider text-foreground-muted transition hover:bg-surface-hover hover:text-foreground"
          aria-label="Fit to view"
        >
          Fit
        </button>
      </div>

      {/* Zoom indicator */}
      <div className="pointer-events-none absolute right-3 bottom-3 rounded border border-border bg-surface-elevated/80 px-1.5 py-0.5 font-mono text-[9px] text-foreground-muted backdrop-blur">
        {Math.round(zoomLevel * 100)}%
      </div>
    </div>
  );
}
