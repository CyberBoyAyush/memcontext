"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Brain,
  Folders,
  MagnifyingGlass,
  Plus,
  Sparkle,
  SpinnerGap,
} from "@phosphor-icons/react";
import {
  memoryGraphQueryOptions,
  type MemoryGraphLink,
  type MemoryGraphNode,
} from "@/lib/queries/memories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";

const GraphCanvas = dynamic(() => import("./graph-canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[620px] w-full items-center justify-center rounded-xl bg-[#070a12] text-sm text-foreground-muted">
      <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
      Warming up graph canvas...
    </div>
  ),
});

// Softer, desaturated palette for a more professional feel.
const PROJECT_COLORS = [
  "#6e8ab8", // soft steel blue
  "#9b7ab0", // muted lavender
  "#7aab9b", // sage teal
  "#b58b6e", // warm taupe
  "#a87a94", // dusty rose
  "#7a96b0", // slate blue
];

const CATEGORY_COLORS: Record<string, string> = {
  preference: "#b58670", // warm taupe
  fact: "#7aa890", // sage
  decision: "#9880ad", // muted violet
  context: "#b0945c", // muted gold
};

type RelationFilter =
  | "all"
  | "similar"
  | "extends"
  | "shared-root"
  | "shared-project"
  | "shared-category";

type CanvasNode = MemoryGraphNode & {
  color: string;
  categoryColor: string;
  size: number;
};

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getProjectColor(project: string | null): string {
  if (!project) return "#94a3b8";
  return PROJECT_COLORS[hashString(project) % PROJECT_COLORS.length] ?? "#94a3b8";
}

function getCategoryColor(category: string | null): string {
  if (!category) return "#475569";
  return CATEGORY_COLORS[category] ?? "#475569";
}

function sortByPriority(nodes: CanvasNode[]): CanvasNode[] {
  return [...nodes].sort((left, right) => {
    if (right.degree !== left.degree) return right.degree - left.degree;
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

type ViewMode = "full" | "focused";

const HEAVY_GRAPH_THRESHOLD = 600;

function GraphEmptyState() {
  return (
    <Card className="relative overflow-hidden border-border/70">
      <CardContent className="flex min-h-[420px] flex-col items-center justify-center gap-8 pt-10 pb-12 text-center">
        <svg
          width="240"
          height="200"
          viewBox="0 0 240 200"
          className="opacity-90"
          aria-hidden
        >
          <defs>
            <radialGradient id="empty-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(232, 97, 60, 0.28)" />
              <stop offset="100%" stopColor="rgba(232, 97, 60, 0)" />
            </radialGradient>
          </defs>
          <circle cx="120" cy="100" r="96" fill="url(#empty-glow)" />
          <g
            stroke="rgba(148, 163, 184, 0.35)"
            strokeWidth="1.2"
            strokeDasharray="4 6"
            fill="none"
          >
            <line x1="120" y1="100" x2="54" y2="48" />
            <line x1="120" y1="100" x2="188" y2="48" />
            <line x1="120" y1="100" x2="188" y2="156" />
            <line x1="120" y1="100" x2="54" y2="156" />
            <line x1="120" y1="100" x2="120" y2="18" />
            <line x1="120" y1="100" x2="120" y2="180" />
          </g>
          <circle cx="120" cy="100" r="18" fill="#e8613c" />
          <circle
            cx="120"
            cy="100"
            r="28"
            fill="none"
            stroke="rgba(232, 97, 60, 0.4)"
          />
          <g fill="#1f2937" stroke="rgba(148, 163, 184, 0.6)" strokeWidth="1.4">
            <circle cx="54" cy="48" r="9" />
            <circle cx="188" cy="48" r="9" />
            <circle cx="188" cy="156" r="9" />
            <circle cx="54" cy="156" r="9" />
            <circle cx="120" cy="18" r="7" />
            <circle cx="120" cy="180" r="7" />
          </g>
        </svg>

        <div className="max-w-md space-y-2">
          <p className="text-xl font-semibold text-foreground">
            Your memory graph is waiting for its first thought
          </p>
          <p className="text-sm text-foreground-muted">
            Save a few memories and they will start connecting automatically by explicit
            relations, shared projects, version chains, and categories — no setup needed.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="gap-2">
            <Link href="/memories">
              <Plus weight="bold" /> Save a memory
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/mcp">
              Connect MCP client <ArrowRight weight="bold" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MemoryGraphPage() {
  const [search, setSearch] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [relationFilter, setRelationFilter] = useState<RelationFilter>("all");
  const [includeDerived, setIncludeDerived] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("full");

  const { data, isLoading, isError, error } = useQuery({
    ...memoryGraphQueryOptions(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const nodes = useMemo<CanvasNode[]>(() => {
    return (
      data?.nodes.map((node: MemoryGraphNode) => ({
        ...node,
        color: getProjectColor(node.project),
        categoryColor: getCategoryColor(node.category),
        size: Math.max(5, Math.min(12, 5 + node.degree * 0.7)),
      })) ?? []
    );
  }, [data?.nodes]);

  const links = useMemo<MemoryGraphLink[]>(() => data?.links ?? [], [data?.links]);

  const searchMatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return sortByPriority(nodes)
      .filter(
        (node) =>
          node.label.toLowerCase().includes(query) ||
          node.content.toLowerCase().includes(query) ||
          node.project?.toLowerCase().includes(query) ||
          node.category?.toLowerCase().includes(query),
      )
      .slice(0, 6);
  }, [nodes, search]);

  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      if (!includeDerived && link.derived) return false;
      if (relationFilter === "all") return true;
      return link.type === relationFilter;
    });
  }, [includeDerived, links, relationFilter]);

  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const link of filteredLinks) {
      const sourceSet = map.get(link.source) ?? new Set<string>();
      sourceSet.add(link.target);
      map.set(link.source, sourceSet);
      const targetSet = map.get(link.target) ?? new Set<string>();
      targetSet.add(link.source);
      map.set(link.target, targetSet);
    }
    return map;
  }, [filteredLinks]);

  const seedNodeId = useMemo(() => sortByPriority(nodes)[0]?.id ?? null, [nodes]);
  // In Focused mode the neighborhood is centered on the user's selection, or
  // falls back to the most-connected memory as a starting point.
  const focusedNodeId = selectedNodeId ?? seedNodeId;
  const activeNodeId = selectedNodeId ?? hoveredNodeId ?? null;

  const visibleNodeIds = useMemo(() => {
    if (viewMode === "full" || !focusedNodeId) {
      return new Set(nodes.map((node) => node.id));
    }
    const ids = new Set<string>([focusedNodeId]);
    for (const related of adjacency.get(focusedNodeId) ?? []) {
      ids.add(related);
    }
    return ids;
  }, [adjacency, focusedNodeId, nodes, viewMode]);

  const graphNodes = useMemo(
    () => nodes.filter((node) => visibleNodeIds.has(node.id)),
    [nodes, visibleNodeIds],
  );

  const graphLinks = useMemo(
    () =>
      filteredLinks.filter(
        (link) => visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target),
      ),
    [filteredLinks, visibleNodeIds],
  );

  const highlightIds = useMemo(() => {
    if (!activeNodeId) return new Set<string>();
    const ids = new Set<string>([activeNodeId]);
    for (const related of adjacency.get(activeNodeId) ?? []) {
      ids.add(related);
    }
    return ids;
  }, [activeNodeId, adjacency]);

  // The sidebar detail panel must only react to explicit selection (clicks),
  // otherwise it would flash every time the user hovers a node.
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [selectedNodeId, nodes]);

  const selectedNodeLinks = useMemo(() => {
    if (!selectedNode) return [];
    return filteredLinks.filter(
      (link) => link.source === selectedNode.id || link.target === selectedNode.id,
    );
  }, [filteredLinks, selectedNode]);

  const graphTime = selectedNode ? formatDateTime(selectedNode.createdAt) : null;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Memory Graph</h1>
          <p className="mt-1 text-foreground-muted">
            Mapping your explicit links and shared memory context.
          </p>
        </div>
        <Card className="min-h-[560px] border-border/70">
          <CardContent className="flex min-h-[560px] items-center justify-center pt-6">
            <div className="flex items-center gap-3 text-foreground-muted">
              <SpinnerGap className="h-5 w-5 animate-spin" />
              Building your memory graph...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Memory Graph</h1>
          <p className="mt-1 text-foreground-muted">
            Mapping your explicit links and shared memory context.
          </p>
        </div>
        <Card className="border-error/20 bg-error/5">
          <CardContent className="pt-6 text-sm text-foreground-muted">
            {error instanceof Error ? error.message : "Failed to load graph data."}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Memory Graph</h1>
          <p className="mt-1 text-foreground-muted">
            Save memories from any source and they&apos;ll start weaving themselves
            together here.
          </p>
        </div>
        <GraphEmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Memory Graph</h1>
          <p className="mt-1 text-foreground-muted">
            Real links come from saved memory relations. Shared roots, projects, and
            categories fill in the rest when that data exists.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
          <span className="rounded-full border border-border px-3 py-1">
            {data.meta.totalNodes} memories
          </span>
          <span className="rounded-full border border-border px-3 py-1">
            {data.meta.relationLinks} real links
          </span>
          <span className="rounded-full border border-border px-3 py-1">
            {data.meta.derivedLinks} shared-context links
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card className="border-border/70">
            <CardContent className="space-y-4 pt-6">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_200px_auto_auto]">
                <div className="space-y-2">
                  <div className="relative">
                    <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search memories, projects, or categories"
                      className="pl-10"
                    />
                  </div>
                  {searchMatches.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {searchMatches.map((match) => (
                        <Button
                          key={match.id}
                          type="button"
                          variant={
                            selectedNodeId === match.id ? "secondary" : "outline"
                          }
                          size="sm"
                          onClick={() => setSelectedNodeId(match.id)}
                          className="max-w-full"
                        >
                          <span className="truncate">{match.label}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                <select
                  value={relationFilter}
                  onChange={(event) =>
                    setRelationFilter(event.target.value as RelationFilter)
                  }
                  className="flex h-10 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground transition-all duration-200 hover:border-border-hover focus:border-foreground-subtle focus:outline-none"
                >
                  <option value="all">All link types</option>
                  <option value="similar">Similar only</option>
                  <option value="extends">Extends only</option>
                  <option value="shared-root">Shared root</option>
                  <option value="shared-project">Shared project</option>
                  <option value="shared-category">Shared category</option>
                </select>

                <Button
                  type="button"
                  variant={includeDerived ? "secondary" : "outline"}
                  onClick={() => setIncludeDerived((current) => !current)}
                  className="justify-center"
                >
                  <Sparkle weight="duotone" />
                  {includeDerived ? "Including shared" : "Real only"}
                </Button>

                <div
                  role="group"
                  aria-label="View mode"
                  className="flex h-10 items-center overflow-hidden rounded-xl border border-border bg-surface text-sm"
                >
                  <button
                    type="button"
                    onClick={() => setViewMode("full")}
                    className={cn(
                      "h-full px-3 font-medium transition-colors",
                      viewMode === "full"
                        ? "bg-surface-elevated text-foreground"
                        : "text-foreground-muted hover:text-foreground",
                    )}
                  >
                    Full
                  </button>
                  <div className="h-5 w-px bg-border" />
                  <button
                    type="button"
                    onClick={() => setViewMode("focused")}
                    className={cn(
                      "h-full px-3 font-medium transition-colors",
                      viewMode === "focused"
                        ? "bg-surface-elevated text-foreground"
                        : "text-foreground-muted hover:text-foreground",
                    )}
                  >
                    Focused
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
                <span className="rounded-full bg-surface-elevated px-3 py-1">
                  {viewMode === "full"
                    ? `Showing all ${data.meta.totalNodes} memories`
                    : `Showing ${graphNodes.length} of ${data.meta.totalNodes} memories`}
                </span>
                <span className="rounded-full bg-surface-elevated px-3 py-1">
                  {graphLinks.length} visible links
                </span>
                {viewMode === "focused" && focusedNodeId && (
                  <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent">
                    Focused neighborhood
                  </span>
                )}
                {viewMode === "full" &&
                  data.meta.totalNodes > HEAVY_GRAPH_THRESHOLD && (
                    <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-amber-300">
                      Large graph · performance may drop
                    </span>
                  )}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/70 p-0">
            <GraphCanvas
              nodes={graphNodes}
              links={graphLinks}
              selectedNodeId={selectedNodeId}
              hoveredNodeId={hoveredNodeId}
              onSelectNode={setSelectedNodeId}
              onHoverNode={setHoveredNodeId}
              highlightIds={highlightIds}
              activeNodeId={activeNodeId}
              stats={{
                totalNodes: data.meta.totalNodes,
                relationLinks: data.meta.relationLinks,
                derivedLinks: data.meta.derivedLinks,
                projectCount: new Set(
                  nodes.map((node) => node.project).filter(Boolean),
                ).size,
                categoryCount: new Set(
                  nodes.map((node) => node.category).filter(Boolean),
                ).size,
              }}
            />
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border/70">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="h-4 w-4 text-accent" weight="duotone" />
                {selectedNode ? "Selected Memory" : "Graph Summary"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {selectedNode ? (
                <>
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-foreground">
                      {selectedNode.label}
                    </p>
                    <p className="leading-6 text-foreground-muted">
                      {selectedNode.content}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedNode.project && (
                      <span className="rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-foreground-muted">
                        Project: {selectedNode.project}
                      </span>
                    )}
                    {selectedNode.category && (
                      <span className="rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-foreground-muted">
                        Category: {selectedNode.category}
                      </span>
                    )}
                    {selectedNode.rootId && (
                      <span className="rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-foreground-muted">
                        Version chain
                      </span>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-surface-elevated p-3">
                      <p className="text-xs uppercase tracking-wide text-foreground-subtle">
                        Connections
                      </p>
                      <p className="mt-2 text-lg font-semibold text-foreground">
                        {selectedNodeLinks.length}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-surface-elevated p-3">
                      <p className="text-xs uppercase tracking-wide text-foreground-subtle">
                        Created
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {graphTime?.date}
                      </p>
                      <p className="text-xs text-foreground-muted">{graphTime?.time}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-foreground-subtle">
                      Visible link types
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(
                        new Set(selectedNodeLinks.map((link) => link.type)),
                      ).map((type) => (
                        <span
                          key={type}
                          className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground-muted"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4 text-foreground-muted">
                  <p>
                    Click a memory node to inspect the raw memory content and the link
                    types currently keeping it connected.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-surface-elevated p-3">
                      <p className="text-xs uppercase tracking-wide text-foreground-subtle">
                        Projects represented
                      </p>
                      <p className="mt-2 text-lg font-semibold text-foreground">
                        {new Set(nodes.map((node) => node.project).filter(Boolean)).size}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-surface-elevated p-3">
                      <p className="text-xs uppercase tracking-wide text-foreground-subtle">
                        Categories represented
                      </p>
                      <p className="mt-2 text-lg font-semibold text-foreground">
                        {new Set(nodes.map((node) => node.category).filter(Boolean)).size}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {viewMode === "focused" && focusedNodeId && (
            <Card className="border-border/70">
              <CardContent className="space-y-3 pt-6 text-sm text-foreground-muted">
                <div className="flex items-start gap-3">
                  <Folders
                    className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                    weight="duotone"
                  />
                  <p>
                    You&apos;re looking at a focused neighborhood. Switch to
                    <span className="mx-1 font-medium text-foreground">Full</span>
                    to explore every memory and discover cross-project links.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => setViewMode("full")}
                >
                  Switch to Full view
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
