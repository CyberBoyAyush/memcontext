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
  memoryHierarchyQueryOptions,
  type MemoryGraphLink,
  type MemoryGraphNode,
} from "@/lib/queries/memories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScopePicker } from "@/components/scope-picker";
import { ThemedSelect } from "@/components/ui/themed-select";
import { Tooltip } from "@/components/ui/tooltip";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { cn, formatDateTime } from "@/lib/utils";

const LINK_TYPE_LABELS: Record<MemoryGraphLink["type"], string> = {
  extends: "Extends",
  similar: "Similar",
  "shared-root": "Shared root",
  "shared-project": "Shared project",
  "shared-category": "Shared category",
};

const RELATION_FILTER_OPTIONS = [
  { value: "all", label: "All link types" },
  { value: "similar", label: "Similar only" },
  { value: "extends", label: "Extends only" },
  { value: "shared-root", label: "Shared root" },
  { value: "shared-project", label: "Shared project" },
  { value: "shared-category", label: "Shared category" },
];

const GraphCanvas = dynamic(() => import("./graph-canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[420px] w-full items-center justify-center rounded-xl bg-background-secondary text-sm text-foreground-muted">
      <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
      Warming up graph canvas...
    </div>
  ),
});

// Coral / warm-neutral palette derived from the app accent (#e8613c).
// Project nodes cycle through warm tones (coral, amber, taupe, rose, sand)
// to stay on-brand with the dashboard's grey + coral aesthetic.
const PROJECT_COLORS = [
  "#e8613c", // coral (accent)
  "#d97757", // soft terracotta
  "#c4906a", // warm sand
  "#b07a5e", // muted taupe
  "#8a6a5e", // dusty mocha
  "#a3938a", // warm grey
];

const CATEGORY_COLORS: Record<string, string> = {
  preference: "#e8613c", // coral
  fact: "#c4906a", // warm sand
  decision: "#a3938a", // warm grey
  context: "#d97757", // terracotta
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
  return (
    PROJECT_COLORS[hashString(project) % PROJECT_COLORS.length] ?? "#94a3b8"
  );
}

function getCategoryColor(category: string | null): string {
  if (!category) return "#475569";
  return CATEGORY_COLORS[category] ?? "#475569";
}

function sortByPriority(nodes: CanvasNode[]): CanvasNode[] {
  return [...nodes].sort((left, right) => {
    if (right.degree !== left.degree) return right.degree - left.degree;
    return (
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  });
}

type ViewMode = "full" | "focused";

const HEAVY_GRAPH_THRESHOLD = 600;

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: "full", label: "Full" },
  { id: "focused", label: "Focused" },
];

function ViewModeTabs({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (next: ViewMode) => void;
}) {
  return (
    <AnimatedTabs<ViewMode>
      ariaLabel="View mode"
      value={value}
      onChange={onChange}
      tabs={VIEW_MODES.map((mode) => ({
        value: mode.id,
        label: mode.label,
      }))}
    />
  );
}

function SummaryStat({
  label,
  value,
  hint,
  compact,
}: {
  label: string;
  value: string | number;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-background-secondary px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 font-semibold text-foreground",
          compact ? "text-sm" : "text-base",
        )}
      >
        {value}
      </p>
      {hint && (
        <p className="text-[10px] text-foreground-muted">{hint}</p>
      )}
    </div>
  );
}

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
            Save a few memories and they will start connecting automatically by
            explicit relations, shared projects, version chains, and categories
            — no setup needed.
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
  const [selectedScope, setSelectedScope] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [relationFilter, setRelationFilter] = useState<RelationFilter>("all");
  const [includeDerived, setIncludeDerived] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("full");

  const { data: hierarchy, isLoading: hierarchyLoading } = useQuery(
    memoryHierarchyQueryOptions(),
  );

  const { data, isLoading, isError, error } = useQuery({
    ...memoryGraphQueryOptions(selectedScope ?? undefined),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  function handleScopeChange(next: string | null) {
    if (next === selectedScope) return;
    setSelectedScope(next);
    // Reset selection / hover so we don't keep references to nodes from a
    // different scope in the UI.
    setSelectedNodeId(null);
    setHoveredNodeId(null);
    setSearch("");
  }

  const scopeContextLabel =
    selectedScope === null
      ? "Viewing Global"
      : `Viewing scope: ${selectedScope}`;

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

  const links = useMemo<MemoryGraphLink[]>(
    () => data?.links ?? [],
    [data?.links],
  );

  const linkBreakdown = useMemo(() => {
    const counts: Record<MemoryGraphLink["type"], number> = {
      extends: 0,
      similar: 0,
      "shared-root": 0,
      "shared-project": 0,
      "shared-category": 0,
    };
    for (const link of links) counts[link.type] += 1;
    return counts;
  }, [links]);

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

  const seedNodeId = useMemo(
    () => sortByPriority(nodes)[0]?.id ?? null,
    [nodes],
  );
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
        (link) =>
          visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target),
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
      (link) =>
        link.source === selectedNode.id || link.target === selectedNode.id,
    );
  }, [filteredLinks, selectedNode]);

  const graphTime = selectedNode
    ? formatDateTime(selectedNode.createdAt)
    : null;

  const headerBlock = (
    <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Memory Graph</h1>
          <p className="text-xs font-medium uppercase tracking-wider text-foreground-subtle">
            {scopeContextLabel}
          </p>
        </div>
        <p className="mt-1 text-sm text-foreground-muted">
          Real links come from saved memory relations. Shared roots, projects,
          and categories fill in the rest.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ScopePicker
          value={selectedScope}
          onChange={handleScopeChange}
          hierarchy={hierarchy}
          isLoading={hierarchyLoading}
        />
        {data && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-foreground-muted">
            <span className="inline-flex h-10 items-center rounded-xl border border-border bg-surface px-3 font-medium">
              {data.meta.totalNodes} memories
            </span>
            <Tooltip
              content={
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                    Link breakdown
                  </p>
                  <div className="space-y-1 text-xs">
                    {(
                      Object.keys(LINK_TYPE_LABELS) as Array<
                        MemoryGraphLink["type"]
                      >
                    ).map((type) => (
                      <div
                        key={type}
                        className="flex items-center justify-between gap-4"
                      >
                        <span className="text-foreground-muted">
                          {LINK_TYPE_LABELS[type]}
                        </span>
                        <span className="font-mono text-foreground">
                          {linkBreakdown[type]}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-4 border-t border-border/60 pt-1.5 text-xs">
                    <span className="text-foreground-muted">
                      Real / Shared
                    </span>
                    <span className="font-mono text-foreground">
                      {data.meta.relationLinks} / {data.meta.derivedLinks}
                    </span>
                  </div>
                </div>
              }
            >
              <span className="inline-flex h-10 cursor-help items-center rounded-xl border border-border bg-surface px-3 font-medium">
                {links.length} links
              </span>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-4 animate-fade-in">
        {headerBlock}
        <Card className="flex-1 min-h-0 border-border/70">
          <CardContent className="flex h-full items-center justify-center pt-6">
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
      <div className="flex h-full flex-col gap-4 animate-fade-in">
        {headerBlock}
        <Card className="border-error/20 bg-error/5">
          <CardContent className="pt-6 text-sm text-foreground-muted">
            {error instanceof Error
              ? error.message
              : "Failed to load graph data."}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="flex h-full flex-col gap-4 animate-fade-in">
        {headerBlock}
        <GraphEmptyState />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 animate-fade-in">
      {headerBlock}

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="flex min-h-0 flex-col overflow-hidden border-border/70 p-0 shadow-none">
          <div className="shrink-0 border-b border-border/70 px-4 py-3">
            <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1.2fr)_180px_auto_auto]">
              <div className="space-y-2">
                <div className="relative">
                  <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search memories, projects, categories"
                    className="h-9 pl-9 text-sm"
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

              <ThemedSelect
                value={relationFilter}
                options={RELATION_FILTER_OPTIONS}
                onChange={(next) => setRelationFilter(next as RelationFilter)}
                align="left"
                buttonClassName="h-9 rounded-lg px-3 text-xs"
              />

              <Button
                type="button"
                variant={includeDerived ? "secondary" : "outline"}
                size="sm"
                onClick={() => setIncludeDerived((current) => !current)}
                className="h-9 justify-center rounded-lg"
              >
                <Sparkle weight="duotone" />
                {includeDerived ? "Including shared" : "Real only"}
              </Button>

              <ViewModeTabs value={viewMode} onChange={setViewMode} />
            </div>

            {(viewMode === "focused" ||
              (viewMode === "full" &&
                data.meta.totalNodes > HEAVY_GRAPH_THRESHOLD)) && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
                {viewMode === "focused" && focusedNodeId && (
                  <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] text-accent">
                    Focused on {graphNodes.length} of {data.meta.totalNodes}
                  </span>
                )}
                {viewMode === "full" &&
                  data.meta.totalNodes > HEAVY_GRAPH_THRESHOLD && (
                    <span className="rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">
                      Large graph · performance may drop
                    </span>
                  )}
              </div>
            )}
          </div>

          <div className="relative min-h-0 flex-1">
            <GraphCanvas
              key={JSON.stringify(["scope", selectedScope])}
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
          </div>
        </Card>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1 scrollbar-hide">
          <Card className="border-border/70 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Brain className="h-4 w-4 text-accent" weight="duotone" />
                {selectedNode ? "Selected memory" : "Graph summary"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {selectedNode ? (
                <>
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-foreground">
                      {selectedNode.label}
                    </p>
                    <p className="text-xs leading-relaxed text-foreground-muted">
                      {selectedNode.content}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.project && (
                      <span className="rounded-md border border-border bg-background-secondary px-2 py-0.5 text-[11px] text-foreground-muted">
                        {selectedNode.project}
                      </span>
                    )}
                    {selectedNode.category && (
                      <span className="rounded-md border border-border bg-background-secondary px-2 py-0.5 text-[11px] text-foreground-muted">
                        {selectedNode.category}
                      </span>
                    )}
                    {selectedNode.rootId && (
                      <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] text-accent">
                        Version chain
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <SummaryStat
                      label="Connections"
                      value={selectedNodeLinks.length}
                    />
                    <SummaryStat
                      label="Created"
                      value={graphTime?.date ?? "—"}
                      hint={graphTime?.time}
                      compact
                    />
                  </div>

                  {selectedNodeLinks.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                        Visible link types
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from(
                          new Set(selectedNodeLinks.map((link) => link.type)),
                        ).map((type) => (
                          <span
                            key={type}
                            className="rounded-md border border-border bg-background-secondary px-2 py-0.5 text-[11px] text-foreground-muted"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs leading-relaxed text-foreground-muted">
                    Click a memory node to inspect its content and the link
                    types keeping it connected.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <SummaryStat
                      label="Projects"
                      value={
                        new Set(
                          nodes.map((node) => node.project).filter(Boolean),
                        ).size
                      }
                    />
                    <SummaryStat
                      label="Categories"
                      value={
                        new Set(
                          nodes.map((node) => node.category).filter(Boolean),
                        ).size
                      }
                    />
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
                    <span className="mx-1 font-medium text-foreground">
                      Full
                    </span>
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
