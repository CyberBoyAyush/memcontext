"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowSquareOut,
  Brain,
  Buildings,
  CaretDown,
  CaretLeft,
  CaretRight,
  ChatCircleDots,
  Check,
  FileText,
  Gear,
  GearSix,
  Link as LinkIcon,
  MagnifyingGlass,
  Plus,
  Sparkle,
  SpinnerGap,
  Stack,
  TextAlignLeft,
  Trash,
  UploadSimple,
  Vault,
  X,
} from "@phosphor-icons/react";
import { ThemedSelect } from "@/components/ui/themed-select";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import {
  companyBrainDocumentMemoriesQueryOptions,
  companyBrainDocumentsQueryOptions,
  companyBrainHierarchyQueryOptions,
  companyBrainSearchQueryOptions,
  useCancelCompanyBrainDocument,
  useCreateCompanyBrainMemory,
  useDeleteCompanyBrainDocument,
  useIngestCompanyBrainDocument,
  useUploadCompanyBrainDocument,
  workspacesQueryOptions,
  type CompanyBrainMemory,
  type CompanyBrainDocument,
} from "@/lib/queries/company-brain";
import { VaultMemoryDetailPanel } from "@/components/vault-memory-detail-panel";
import { WorkspaceSelect } from "@/components/workspace-select";
import { WorkspacesSection } from "@/components/settings/workspaces-section";

type SearchMode = "memories" | "documents" | "hybrid";
type IngestMode = "upload" | "paste" | "url";
type AddMode = IngestMode | "fact";

interface DeleteTarget {
  id: string;
  title: string;
}

interface DocumentRef {
  id: string;
  title: string;
}

interface SubscriptionData {
  contextDocumentsCount: number;
  contextDocumentsLimit: number;
}

const addTabs: Array<{
  value: AddMode;
  label: string;
  icon: typeof UploadSimple;
  hint: string;
}> = [
  {
    value: "upload",
    label: "Upload",
    icon: UploadSimple,
    hint: "Drop in a file and we auto-detect the format.",
  },
  {
    value: "paste",
    label: "Paste",
    icon: TextAlignLeft,
    hint: "Paste raw text or Markdown to extract memories.",
  },
  {
    value: "url",
    label: "URL",
    icon: LinkIcon,
    hint: "Crawl a page or docs site and extract memories.",
  },
  {
    value: "fact",
    label: "Fact",
    icon: Brain,
    hint: "Add curated context that is not in a document yet.",
  },
];

const inputClass =
  "h-10 w-full rounded-lg border border-border bg-surface-elevated/50 px-3 text-sm transition-colors placeholder:text-foreground-subtle focus:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent/20";

const DOCS_PAGE_SIZE_OPTIONS = [10, 20, 25, 50] as const;
const DEFAULT_DOCS_PER_PAGE = 10;

const TYPE_BADGE_STYLES: Record<string, string> = {
  pdf: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  docx: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  doc: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  url: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  txt: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  text: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  md: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  markdown: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  html: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  csv: "border-teal-500/30 bg-teal-500/10 text-teal-400",
  json: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  image: "border-pink-500/30 bg-pink-500/10 text-pink-400",
  png: "border-pink-500/30 bg-pink-500/10 text-pink-400",
  jpg: "border-pink-500/30 bg-pink-500/10 text-pink-400",
  jpeg: "border-pink-500/30 bg-pink-500/10 text-pink-400",
};

function getTypeBadgeClass(sourceType: string): string {
  return (
    TYPE_BADGE_STYLES[sourceType.toLowerCase()] ??
    "border-border bg-surface text-foreground-muted"
  );
}

const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => (
    <p className="break-words text-sm leading-6 text-foreground/90 [&:not(:first-child)]:mt-2">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-accent underline-offset-2 hover:underline"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/90">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-foreground/90">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-6">{children}</li>,
  code: ({ children }) => (
    <code className="rounded bg-surface px-1 py-0.5 font-mono text-[12px] text-foreground">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-surface p-2 text-[12px] leading-5 text-foreground/90">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-2 border-l-2 border-border pl-3 italic text-foreground-muted">
      {children}
    </blockquote>
  ),
  h1: ({ children }) => (
    <h1 className="mt-3 text-sm font-semibold text-foreground first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-3 text-sm font-semibold text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-2 text-sm font-semibold text-foreground first:mt-0">
      {children}
    </h3>
  ),
  table: ({ children }) => (
    <div className="mt-2 overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-[12px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-surface-elevated">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border-b border-border px-2 py-1.5 text-left font-semibold text-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border/60 px-2 py-1.5 text-foreground/90">
      {children}
    </td>
  ),
  hr: () => <hr className="my-2 border-border" />,
};

function SearchMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={cn("markdown-body", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={MARKDOWN_COMPONENTS}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/** Renders markdown inline (no <p> wrapper) — safe for use inside truncated lines. */
const INLINE_MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => <>{children}</>,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground/90">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => (
    <code className="rounded bg-surface px-1 py-px font-mono text-[11px] text-foreground/90">
      {children}
    </code>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-accent underline-offset-2 hover:underline"
    >
      {children}
    </a>
  ),
};

function InlineMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={INLINE_MARKDOWN_COMPONENTS}
      // Restrict to inline-safe nodes — strip headings/lists/blockquotes etc.
      allowedElements={[
        "p",
        "strong",
        "em",
        "code",
        "a",
        "span",
        "del",
        "br",
      ]}
      unwrapDisallowed
    >
      {content}
    </ReactMarkdown>
  );
}

interface ScopeMultiSelectOption {
  value: string;
  label: string;
}

function ScopeMultiSelect({
  values,
  options,
  globalLabel,
  onChange,
}: {
  values: string[];
  options: ScopeMultiSelectOption[];
  globalLabel: string;
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{
    right: number;
    width: number;
    placement: "bottom" | "top";
    top?: number;
    bottom?: number;
    maxHeight: number;
  }>({
    right: 0,
    width: 0,
    placement: "bottom",
    top: 0,
    maxHeight: 240,
  });

  const selectedLabels = options
    .filter((option) => values.includes(option.value))
    .map((option) => option.label);
  const label =
    values.length === 0
      ? globalLabel
      : values.length === 1
        ? (selectedLabels[0] ?? "1 scope")
        : `${values.length} scopes`;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const gap = 6;
    const margin = 12;
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
      const spaceAbove = rect.top - gap - margin;
      const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
      setCoords({
        right: window.innerWidth - rect.right,
        width: rect.width,
        placement: openUp ? "top" : "bottom",
        top: openUp ? undefined : rect.bottom + gap,
        bottom: openUp ? window.innerHeight - rect.top + gap : undefined,
        maxHeight: Math.min(260, openUp ? spaceAbove : spaceBelow),
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  function toggleScope(value: string) {
    if (values.includes(value)) {
      onChange(values.filter((item) => item !== value));
      return;
    }
    onChange([...values, value]);
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors hover:border-border-hover hover:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-accent/20 sm:w-36"
      >
        <span className="truncate">{label}</span>
        <CaretDown
          className={cn(
            "h-3 w-3 shrink-0 text-foreground-muted transition-transform",
            open && "rotate-180",
          )}
          weight="bold"
        />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[80]"
              onClick={() => setOpen(false)}
            />
            <div
              style={{
                ...(coords.placement === "bottom"
                  ? { top: coords.top }
                  : { bottom: coords.bottom }),
                right: coords.right,
                minWidth: coords.width,
                maxHeight: coords.maxHeight,
              }}
              className="fixed z-[81] overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-surface-elevated p-1.5 shadow-lg animate-scale-in scrollbar-hide"
            >
              <button
                type="button"
                onClick={() => onChange([])}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-xs transition-colors",
                  values.length === 0
                    ? "bg-surface text-foreground"
                    : "text-foreground-muted hover:bg-surface hover:text-foreground",
                )}
              >
                <span className="truncate">{globalLabel}</span>
                {values.length === 0 && (
                  <Check className="h-3.5 w-3.5 shrink-0" weight="bold" />
                )}
              </button>
              {options.map((option) => {
                const active = values.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleScope(option.value)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-xs transition-colors",
                      active
                        ? "bg-surface text-foreground"
                        : "text-foreground-muted hover:bg-surface hover:text-foreground",
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {active && (
                      <Check className="h-3.5 w-3.5 shrink-0" weight="bold" />
                    )}
                  </button>
                );
              })}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}

function normalizeDocumentationUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function uniqueProjects(
  projects: Array<{ name: string; value: string; count: number }>,
) {
  const map = new Map<string, { name: string; value: string; count: number }>();
  for (const project of projects) {
    const existing = map.get(project.value);
    map.set(project.value, {
      ...project,
      count: (existing?.count ?? 0) + project.count,
    });
  }
  return Array.from(map.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function getDocumentIngestErrorMessage(error: unknown) {
  const message = getErrorMessage(error, "Could not process document");
  return message.toLowerCase().includes("context vault document limit")
    ? "Context Vault document limit reached. Upgrade your plan to ingest more documents."
    : message;
}

function parseUrl(url: string | null | undefined): URL | null {
  if (!url) return null;
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/** Clean display name for a URL document (host + last path segment). */
function urlDisplayName(parsed: URL): string {
  const host = parsed.hostname.replace(/^www\./, "");
  const segment = parsed.pathname.split("/").filter(Boolean).pop();
  if (!segment) return host;
  const pretty = decodeURIComponent(segment)
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return pretty ? `${pretty} · ${host}` : host;
}

function StatusBadge({ status }: { status: string }) {
  const isDone = status === "completed" || status === "ready";
  const isStopped = status === "cancelled";
  const isError = status === "failed" || status === "error" || isStopped;
  const isActive = !isDone && !isError; // pending / processing / retrying

  const tone = isDone
    ? "bg-success/10 text-success border-success/20"
    : isError
      ? "bg-error/10 text-error border-error/20"
      : "bg-accent/10 text-accent border-accent/20";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize transition-colors",
        tone,
      )}
    >
      {isActive ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
        </span>
      ) : isDone ? (
        <Check className="h-2.5 w-2.5" weight="bold" />
      ) : (
        <X className="h-2.5 w-2.5" weight="bold" />
      )}
      {status}
    </span>
  );
}

function formatProcessingPhase(phase: string | null, status: string) {
  const labels: Record<string, string> = {
    queued: "Queued",
    resolving_source: "Reading source",
    chunking: "Chunking document",
    embedding_chunks: "Embedding chunks",
    extracting_memories: "Extracting memories",
    completed: "Completed",
  };

  return labels[phase ?? ""] ?? (status === "retrying" ? "Retrying" : status);
}

function getProcessingSummary(document: CompanyBrainDocument) {
  const total = document.totalChunks || document.chunkCount;
  const processed = Math.min(
    document.processedChunks ?? document.chunkCount,
    total,
  );
  const remaining = Math.max(total - processed, 0);
  const phase = formatProcessingPhase(
    document.processingPhase,
    document.status,
  );
  const chunkProgress =
    total > 0 ? `${processed}/${total} chunks` : "Preparing chunks";
  const remainingText = total > 0 ? ` · ${remaining} remaining` : "";

  return `${phase} · ${chunkProgress}${remainingText} · ${document.extractedCount} memories`;
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof Brain;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs text-foreground-muted">{label}</p>
        <div className="text-xl sm:text-2xl font-semibold mt-0.5">{value}</div>
      </div>
      <div className="w-10 h-10 rounded-lg bg-surface-elevated border border-border flex items-center justify-center shrink-0">
        <Icon size={20} className="text-foreground-muted" weight="duotone" />
      </div>
    </div>
  );
}

export default function CompanyBrainPage() {
  const toast = useToast();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uri, setUri] = useState("");
  const [crawlSubpages, setCrawlSubpages] = useState(true);
  const [priorityPageLimit, setPriorityPageLimit] = useState(15);
  const [subpageTarget, setSubpageTarget] = useState("docs, api, guides");
  const [addMode, setAddMode] = useState<AddMode>("upload");
  const ingestMode: IngestMode = addMode === "fact" ? "upload" : addMode;
  const [scope, setScope] = useState("");
  const [project, setProject] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [companyFact, setCompanyFact] = useState("");
  const [companyFactScope, setCompanyFactScope] = useState("");
  const [companyFactProject, setCompanyFactProject] = useState("");
  const [query, setQuery] = useState("");
  const [searchScopes, setSearchScopes] = useState<string[]>([]);
  const [searchProject, setSearchProject] = useState("");
  const [mode, setMode] = useState<SearchMode>("hybrid");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [memoriesDocument, setMemoriesDocument] = useState<DocumentRef | null>(
    null,
  );
  const [manageOpen, setManageOpen] = useState<
    null | "team" | "workspaces"
  >(null);
  const [addOpen, setAddOpen] = useState(false);
  const [docPage, setDocPage] = useState(1);
  const [docsPerPage, setDocsPerPage] = useState<number>(DEFAULT_DOCS_PER_PAGE);

  const { data: workspaceData } = useQuery(workspacesQueryOptions());
  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.get<SubscriptionData>("/api/user/subscription"),
  });
  const ingestDocument = useIngestCompanyBrainDocument();
  const uploadDocument = useUploadCompanyBrainDocument();
  const createCompanyMemory = useCreateCompanyBrainMemory();
  const cancelDocument = useCancelCompanyBrainDocument();
  const deleteDocument = useDeleteCompanyBrainDocument();

  const workspaces = useMemo(
    () => workspaceData?.workspaces ?? [],
    [workspaceData],
  );
  const activeWorkspaceId = selectedWorkspaceId || workspaces[0]?.id || "";
  const hasWorkspace = !!activeWorkspaceId;

  const { data: documentsData } = useQuery(
    companyBrainDocumentsQueryOptions(activeWorkspaceId),
  );
  const { data: hierarchyData } = useQuery(
    companyBrainHierarchyQueryOptions(activeWorkspaceId),
  );

  const { data: searchData, isFetching: searchLoading } = useQuery(
    companyBrainSearchQueryOptions({
      workspaceId: activeWorkspaceId,
      query,
      mode,
      scopes: searchScopes.length > 0 ? searchScopes : undefined,
      project: searchProject || undefined,
    }),
  );

  const documents = documentsData?.documents ?? [];
  const docPageCount = Math.max(1, Math.ceil(documents.length / docsPerPage));
  // Clamp during render so deletes/workspace switches never strand an empty page.
  const currentDocPage = Math.min(Math.max(1, docPage), docPageCount);
  const pagedDocuments = documents.slice(
    (currentDocPage - 1) * docsPerPage,
    currentDocPage * docsPerPage,
  );
  const showingFrom =
    documents.length === 0 ? 0 : (currentDocPage - 1) * docsPerPage + 1;
  const showingTo = Math.min(
    currentDocPage * docsPerPage,
    documents.length,
  );

  function handleDocsPerPageChange(value: string) {
    const next = Number(value);
    if (
      !DOCS_PAGE_SIZE_OPTIONS.includes(
        next as (typeof DOCS_PAGE_SIZE_OPTIONS)[number],
      )
    ) {
      return;
    }
    setDocsPerPage(next);
    setDocPage(1);
  }
  const availableScopes = hierarchyData?.scopes ?? [];
  const selectedScopeProjects =
    searchScopes.length === 0
      ? (hierarchyData?.global.projects ?? [])
      : availableScopes
          .filter((item) => searchScopes.includes(item.name))
          .flatMap((item) => item.projects);
  const availableSearchProjects = uniqueProjects(selectedScopeProjects);
  const totalChunks = documents.reduce(
    (sum, d) => sum + (d.chunkCount ?? 0),
    0,
  );
  const totalMemories = documents.reduce(
    (sum, d) => sum + (d.extractedCount ?? 0),
    0,
  );
  const hasSearched = query.trim().length > 0;
  const resultCount =
    (searchData?.chunks.length ?? 0) + (searchData?.memories.length ?? 0);
  const documentLimitReached =
    !!subscription &&
    subscription.contextDocumentsLimit > 0 &&
    subscription.contextDocumentsCount >= subscription.contextDocumentsLimit;

  function resetIngestForm() {
    setTitle("");
    setContent("");
    setUri("");
    setFile(null);
    setPriorityPageLimit(15);
  }

  async function handleIngestDocument() {
    if (!canSubmitIngest) return;
    if (documentLimitReached) {
      toast.error(
        "Context Vault document limit reached. Upgrade your plan to ingest more documents.",
      );
      return;
    }
    if (scope.includes(",")) {
      toast.error("Use one scope when ingesting a document");
      return;
    }

    try {
      if (ingestMode === "upload" && file) {
        await uploadDocument.mutateAsync({
          workspaceId: activeWorkspaceId,
          title: title.trim() || file.name,
          file,
          scope: scope || undefined,
          project: project || undefined,
        });
        resetIngestForm();
        setAddOpen(false);
        toast.success("Document uploaded for processing");
        return;
      }

      if (ingestMode === "paste") {
        await ingestDocument.mutateAsync({
          workspaceId: activeWorkspaceId,
          title: title.trim(),
          content: content.trim(),
          scope: scope || undefined,
          project: project || undefined,
        });
        resetIngestForm();
        setAddOpen(false);
        toast.success("Document queued for processing");
        return;
      }

      if (ingestMode === "url") {
        const normalizedUri = normalizeDocumentationUrl(uri);
        await ingestDocument.mutateAsync({
          workspaceId: activeWorkspaceId,
          title: title.trim(),
          uri: normalizedUri,
          crawlSubpages,
          priorityPageLimit: crawlSubpages ? priorityPageLimit : undefined,
          subpageTarget:
            crawlSubpages && subpageTarget.trim()
              ? subpageTarget
                  .split(",")
                  .map((target) => target.trim())
                  .filter(Boolean)
              : undefined,
          scope: scope || undefined,
          project: project || undefined,
        });
        resetIngestForm();
        setAddOpen(false);
        toast.success("Document queued for processing");
        return;
      }
    } catch (error) {
      toast.error(getDocumentIngestErrorMessage(error));
    }
  }

  async function handleCreateCompanyFact() {
    if (!activeWorkspaceId || !companyFact.trim()) return;
    if (companyFactScope.includes(",")) {
      toast.error("Use one scope when adding a company fact");
      return;
    }

    try {
      await createCompanyMemory.mutateAsync({
        workspaceId: activeWorkspaceId,
        content: companyFact.trim(),
        category: "fact",
        scope: companyFactScope || undefined,
        project: companyFactProject || undefined,
      });
      setCompanyFact("");
      setAddOpen(false);
      toast.success("Company fact added");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not add company fact"));
    }
  }

  async function confirmDeleteDocument() {
    if (!deleteTarget) return;
    try {
      await handleDeleteDocument(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // handleDeleteDocument already surfaces a toast
    }
  }

  async function handleCancelDocument(documentId: string) {
    if (!activeWorkspaceId) return;
    try {
      const result = await cancelDocument.mutateAsync({
        workspaceId: activeWorkspaceId,
        documentId,
      });
      if (result.cancelled) {
        toast.success("Document processing stopped");
      } else {
        toast.info("Document is no longer processing");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not stop processing"));
    }
  }

  async function handleDeleteDocument(documentId: string) {
    if (!activeWorkspaceId) return;
    try {
      await deleteDocument.mutateAsync({
        workspaceId: activeWorkspaceId,
        documentId,
      });
      toast.success("Document removed");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not remove document"));
      throw error;
    }
  }

  const isProcessing = ingestDocument.isPending || uploadDocument.isPending;
  const canCreateCompanyFact =
    !!activeWorkspaceId &&
    companyFact.trim().length > 0 &&
    !createCompanyMemory.isPending;
  const canSubmitIngest =
    !isProcessing &&
    !documentLimitReached &&
    !!activeWorkspaceId &&
    (ingestMode === "upload"
      ? !!file
      : ingestMode === "paste"
        ? title.trim().length > 0 && content.trim().length > 0
        : title.trim().length > 0 && uri.trim().length > 0);

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">
            Workspace knowledge
          </h1>
          <p className="mt-0.5 text-xs text-foreground-muted">
            Upload, paste, crawl, or curate — then search with citations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:justify-end">
          <WorkspaceSelect
            workspaces={workspaces}
            value={activeWorkspaceId}
            onChange={(id) => {
              setSelectedWorkspaceId(id);
              setDocPage(1);
            }}
            onAdd={() => setManageOpen("workspaces")}
            onManage={() => setManageOpen("workspaces")}
            onManageTeam={() => setManageOpen("team")}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setManageOpen("workspaces")}
            className="shrink-0"
          >
            <GearSix className="h-4 w-4" weight="duotone" />
            Manage
          </Button>
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            disabled={!hasWorkspace}
            className="shrink-0 hover:translate-y-0 hover:shadow-sm"
          >
            <Plus className="h-4 w-4" weight="bold" />
            Add knowledge
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-3 shrink-0">
        <StatCard label="Documents" value={documents.length} icon={FileText} />
        <StatCard label="Chunks" value={totalChunks} icon={Stack} />
        <StatCard label="Memories" value={totalMemories} icon={Brain} />
      </div>

      {/* Search + Documents (page fills remaining height; internals scroll) */}
      <section className="relative min-h-0 flex-1">
        {!hasWorkspace && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl border border-dashed border-border bg-background/60 backdrop-blur-sm">
            <div className="px-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated border border-border">
                <Buildings
                  size={22}
                  className="text-foreground-muted"
                  weight="duotone"
                />
              </div>
              <p className="text-sm font-medium">No workspace yet</p>
              <p className="mt-1 text-xs text-foreground-muted">
                Ingesting and searching knowledge needs an active workspace.
              </p>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => setManageOpen("workspaces")}
              >
                <Gear className="h-4 w-4" weight="duotone" />
                Create a workspace
              </Button>
            </div>
          </div>
        )}

        <div
          aria-hidden={!hasWorkspace}
          className={cn(
            "grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]",
            !hasWorkspace && "pointer-events-none select-none opacity-40",
          )}
        >
          {/* Search knowledge (LEFT) */}
          <div className="flex min-h-0 flex-col rounded-2xl border border-border bg-surface p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between shrink-0">
                <h2 className="text-base font-semibold tracking-tight">
                  Search knowledge
                </h2>
                <div className="flex rounded-lg border border-border bg-surface-elevated/50 p-1">
                  {(["hybrid", "documents", "memories"] as SearchMode[]).map(
                    (item) => (
                      <button
                        key={item}
                        onClick={() => setMode(item)}
                        className={cn(
                          "h-8 rounded-md px-3 text-xs font-medium capitalize transition-all",
                          mode === item
                            ? "bg-accent text-white shadow-sm"
                            : "text-foreground-muted hover:text-foreground",
                        )}
                      >
                        {item}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 shrink-0 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <MagnifyingGlass
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted"
                    weight="bold"
                  />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="What does the company handbook say about leave policy?"
                    className="h-10 w-full rounded-lg border border-border bg-surface-elevated/50 pl-9 pr-3 text-sm transition-colors placeholder:text-foreground-subtle focus:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
                <ScopeMultiSelect
                  values={searchScopes}
                  onChange={(values) => {
                    setSearchScopes(values);
                    setSearchProject("");
                  }}
                  globalLabel={`Global${
                    hierarchyData?.global.count
                      ? ` (${hierarchyData.global.count})`
                      : ""
                  }`}
                  options={availableScopes.map((item) => ({
                    value: item.name,
                    label: `${item.name} (${item.count})`,
                  }))}
                />
                <ThemedSelect
                  value={searchProject}
                  onChange={(value) => setSearchProject(value)}
                  align="right"
                  buttonClassName="h-10 w-full sm:w-36"
                  options={[
                    { value: "", label: "All projects" },
                    ...availableSearchProjects.map((item) => ({
                      value: item.value,
                      label: `${item.name} (${item.count})`,
                    })),
                  ]}
                />
              </div>

              {hasSearched && !searchLoading && (
                <p className="mt-3 text-xs text-foreground-muted shrink-0">
                  {resultCount} result{resultCount === 1 ? "" : "s"} for{" "}
                  <span className="text-foreground">&ldquo;{query}&rdquo;</span>
                </p>
              )}

              <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-1">
                {searchLoading ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-20 animate-pulse rounded-lg border border-border bg-surface-elevated/40"
                      />
                    ))}
                  </div>
                ) : resultCount > 0 ? (
                  <div className="space-y-3">
                    {searchData?.chunks.map((chunk) => (
                      <div
                        key={chunk.id}
                        className="group rounded-lg border border-border bg-surface-elevated/40 p-3.5 transition-colors hover:border-border-hover"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium">
                            <FileText
                              className="h-3.5 w-3.5 shrink-0 text-foreground-muted"
                              weight="duotone"
                            />
                            <span className="truncate">
                              {chunk.title ?? "Untitled document"}
                            </span>
                          </span>
                          <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[10px] text-foreground-muted">
                            {chunk.sourceType}
                          </span>
                        </div>
                        <div className="mt-2 max-h-48 overflow-hidden">
                          <SearchMarkdown content={chunk.content} />
                        </div>
                        <div className="mt-2 truncate text-xs text-foreground-subtle">
                          {chunk.scope ?? "Global"}
                          {chunk.project ? ` · ${chunk.project}` : ""} ·{" "}
                          <InlineMarkdown
                            content={chunk.sectionPath ?? "Document"}
                          />{" "}
                          · chunk {chunk.chunkIndex}
                        </div>
                      </div>
                    ))}

                    {searchData?.memories.map((memory) => (
                      <div
                        key={memory.id}
                        className="group rounded-lg border border-accent/20 bg-accent/[0.04] p-3.5 transition-colors hover:border-accent/40"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-medium text-accent">
                          <Brain
                            className="h-3.5 w-3.5 shrink-0"
                            weight="duotone"
                          />
                          {memory.memoryType === "company"
                            ? "Curated company fact"
                            : "Extracted memory"}
                        </div>
                        <div className="mt-2 max-h-48 overflow-hidden">
                          <SearchMarkdown content={memory.content} />
                        </div>
                        <p className="mt-2 truncate text-xs text-foreground-subtle">
                          {memory.scope ?? "Global"}
                          {memory.project ? ` · ${memory.project}` : ""}
                        </p>
                        {memory.evidence[0] ? (
                          <div className="mt-2 truncate text-xs text-foreground-subtle">
                            {memory.evidence[0].title ?? "Source"} ·{" "}
                            <InlineMarkdown
                              content={
                                memory.evidence[0].sectionPath ?? "Document"
                              }
                            />{" "}
                            · chunk {memory.evidence[0].chunkIndex}
                          </div>
                        ) : memory.memoryType === "company" ? (
                          <p className="mt-2 truncate text-xs text-foreground-subtle">
                            Curated workspace knowledge
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated border border-border">
                      {hasSearched ? (
                        <MagnifyingGlass
                          size={22}
                          className="text-foreground-muted"
                          weight="duotone"
                        />
                      ) : (
                        <ChatCircleDots
                          size={22}
                          className="text-foreground-muted"
                          weight="duotone"
                        />
                      )}
                    </div>
                    <p className="text-sm text-foreground-muted">
                      {hasSearched
                        ? "No matches found. Try a different query or mode."
                        : "Ask anything about your workspace knowledge."}
                    </p>
                  </div>
                )}
              </div>
            </div>

          {/* Documents (RIGHT) */}
          <div className="flex min-h-0 flex-col rounded-2xl border border-border bg-surface p-5 w-full lg:max-w-[560px]">
              <div className="flex items-baseline justify-between shrink-0">
                <h2 className="text-base font-semibold tracking-tight">
                  Documents
                </h2>
                <span className="text-xs text-foreground-muted">
                  {documents.length} total
                </span>
              </div>

              <div className="mt-4 flex-1 min-h-0 overflow-auto rounded-xl border border-border">
                {documents.length > 0 ? (
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead className="sticky top-0 z-[1] border-b border-border bg-surface-elevated">
                      <tr className="h-10 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                        <th className="w-12 border-r border-border px-3 text-center">
                          #
                        </th>
                        <th className="border-r border-border px-3">
                          Document
                        </th>
                        <th className="w-16 border-r border-border px-3 text-center">
                          Type
                        </th>
                        <th className="w-20 border-r border-border px-3 text-right">
                          Chunks
                        </th>
                        <th className="w-24 border-r border-border px-3 text-right">
                          Memories
                        </th>
                        <th className="w-28 border-r border-border px-3">
                          Status
                        </th>
                        <th className="w-24 px-3 text-center">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedDocuments.map((document, index) => {
                        const isProcessing = [
                          "pending",
                          "processing",
                          "retrying",
                        ].includes(document.status);
                        const parsed =
                          document.sourceType === "url"
                            ? parseUrl(document.publicUrl)
                            : null;
                        const displayTitle =
                          document.title ??
                          (parsed ? urlDisplayName(parsed) : "Untitled document");
                        const serialNumber =
                          (currentDocPage - 1) * docsPerPage + index + 1;
                        return (
                          <tr
                            key={document.id}
                            style={{
                              animationDelay: `${Math.min(index, 8) * 40}ms`,
                              animationFillMode: "backwards",
                            }}
                            className={cn(
                              "border-b border-border transition-colors animate-fade-in-up hover:bg-surface-elevated/40 last:border-b-0",
                              isProcessing && "bg-accent/[0.03]",
                            )}
                          >
                            <td className="w-12 border-r border-border px-3 py-2.5 text-center align-middle text-xs font-medium tabular-nums text-foreground-muted">
                              {serialNumber}
                            </td>
                            <td className="border-r border-border px-3 py-2.5 align-middle">
                              <div className="min-w-0">
                                <p
                                  className="truncate text-sm font-medium"
                                  title={displayTitle}
                                >
                                  {displayTitle}
                                </p>
                                {isProcessing && (
                                  <p className="mt-0.5 line-clamp-1 text-[11px] text-foreground-subtle">
                                    {getProcessingSummary(document)}
                                  </p>
                                )}
                                {document.error && (
                                  <p className="mt-0.5 line-clamp-1 text-[11px] text-error">
                                    {document.error}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="w-16 border-r border-border px-3 py-2.5 text-center align-middle">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                  getTypeBadgeClass(document.sourceType),
                                )}
                              >
                                {document.sourceType}
                              </span>
                            </td>
                            <td className="border-r border-border px-3 py-2.5 text-right align-middle text-sm tabular-nums text-foreground-muted">
                              {document.chunkCount}
                            </td>
                            <td className="border-r border-border px-3 py-2.5 text-right align-middle text-sm tabular-nums">
                              {document.extractedCount > 0 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMemoriesDocument({
                                      id: document.id,
                                      title:
                                        document.title ?? "Untitled document",
                                    })
                                  }
                                  className="font-medium text-accent underline-offset-2 hover:underline"
                                >
                                  {document.extractedCount}
                                </button>
                              ) : (
                                <span className="text-foreground-muted">
                                  {document.extractedCount}
                                </span>
                              )}
                            </td>
                            <td className="border-r border-border px-3 py-2.5 align-middle">
                              <StatusBadge status={document.status} />
                            </td>
                            <td className="px-3 py-2.5 align-middle">
                              <div className="flex items-center justify-center gap-1">
                                {document.publicUrl && (
                                  <a
                                    href={document.publicUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Open original"
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-accent/10 hover:text-accent"
                                  >
                                    <ArrowSquareOut
                                      className="h-4 w-4"
                                      weight="duotone"
                                    />
                                  </a>
                                )}
                                {isProcessing && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCancelDocument(document.id)
                                    }
                                    disabled={cancelDocument.isPending}
                                    title="Stop processing"
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-error/10 hover:text-error disabled:opacity-50"
                                  >
                                    <X className="h-4 w-4" weight="bold" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteTarget({
                                      id: document.id,
                                      title:
                                        document.title ?? "Untitled document",
                                    })
                                  }
                                  disabled={deleteDocument.isPending}
                                  title="Delete document"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-error/10 hover:text-error disabled:opacity-50"
                                >
                                  <Trash
                                    className="h-4 w-4"
                                    weight="duotone"
                                  />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated border border-border">
                      <FileText
                        size={22}
                        className="text-foreground-muted"
                        weight="duotone"
                      />
                    </div>
                    <p className="text-sm text-foreground-muted">
                      No documents in this workspace yet.
                    </p>
                    <p className="mt-1 text-xs text-foreground-subtle">
                      Ingest your first document to build the brain.
                    </p>
                  </div>
                )}
              </div>

              {documents.length > 0 && (
                <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row shrink-0">
                  <div className="flex items-center gap-3 order-2 sm:order-1">
                    <p className="text-xs text-foreground-muted">
                      Showing{" "}
                      <span className="font-medium text-foreground">
                        {showingFrom}
                      </span>
                      {" to "}
                      <span className="font-medium text-foreground">
                        {showingTo}
                      </span>
                      {" of "}
                      <span className="font-medium text-foreground">
                        {documents.length}
                      </span>
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-foreground-subtle">
                        Rows
                      </span>
                      <ThemedSelect
                        value={String(docsPerPage)}
                        options={DOCS_PAGE_SIZE_OPTIONS.map((value) => ({
                          value: String(value),
                          label: String(value),
                        }))}
                        onChange={handleDocsPerPageChange}
                        align="left"
                        className="w-20"
                        buttonClassName="h-8"
                      />
                    </div>
                  </div>

                  {docPageCount > 1 && (
                    <div className="flex items-center gap-1.5 order-1 sm:order-2">
                      <button
                        type="button"
                        onClick={() =>
                          setDocPage(Math.max(1, currentDocPage - 1))
                        }
                        disabled={currentDocPage === 1}
                        className={cn(
                          "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                          "bg-surface-elevated border border-border",
                          currentDocPage === 1
                            ? "opacity-50 !cursor-not-allowed"
                            : "hover:bg-surface-hover hover:border-border-hover",
                        )}
                      >
                        <CaretLeft className="h-4 w-4" weight="bold" />
                        <span className="hidden sm:inline">Previous</span>
                      </button>

                      <div className="flex items-center gap-1 bg-surface-elevated border border-border rounded-lg p-1">
                        {Array.from(
                          { length: Math.min(docPageCount, 5) },
                          (_, i) => {
                            let pageNum: number;
                            if (docPageCount <= 5) {
                              pageNum = i + 1;
                            } else if (currentDocPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentDocPage >= docPageCount - 2) {
                              pageNum = docPageCount - 4 + i;
                            } else {
                              pageNum = currentDocPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                type="button"
                                onClick={() => setDocPage(pageNum)}
                                className={cn(
                                  "w-8 h-8 rounded-md text-sm font-medium transition-colors cursor-pointer",
                                  currentDocPage === pageNum
                                    ? "bg-accent text-white"
                                    : "text-foreground-muted hover:text-foreground hover:bg-surface",
                                )}
                              >
                                {pageNum}
                              </button>
                            );
                          },
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setDocPage(Math.min(docPageCount, currentDocPage + 1))
                        }
                        disabled={currentDocPage === docPageCount}
                        className={cn(
                          "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                          "bg-surface-elevated border border-border",
                          currentDocPage === docPageCount
                            ? "opacity-50 !cursor-not-allowed"
                            : "hover:bg-surface-hover hover:border-border-hover",
                        )}
                      >
                        <span className="hidden sm:inline">Next</span>
                        <CaretRight className="h-4 w-4" weight="bold" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
      </section>

      {deleteTarget && (
        <DeleteDocumentDialog
          title={deleteTarget.title}
          isDeleting={deleteDocument.isPending}
          onClose={() => {
            if (!deleteDocument.isPending) setDeleteTarget(null);
          }}
          onConfirm={confirmDeleteDocument}
        />
      )}

      {memoriesDocument && (
        <DocumentMemoriesDialog
          workspaceId={activeWorkspaceId}
          document={memoriesDocument}
          onClose={() => setMemoriesDocument(null)}
        />
      )}

      {manageOpen && (
        <ManageWorkspacesDialog
          initialTab={manageOpen}
          onClose={() => setManageOpen(null)}
        />
      )}

      {addOpen && (
        <AddKnowledgeDialogShell
          onClose={() => setAddOpen(false)}
          hint={addTabs.find((tab) => tab.value === addMode)?.hint ?? ""}
        >
          {/* Source dropdown */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground-muted">
              Source
            </label>
            <ThemedSelect
              value={addMode}
              options={addTabs.map((tab) => ({
                value: tab.value,
                label: tab.label,
              }))}
              onChange={(value) => setAddMode(value as AddMode)}
              align="left"
            />
          </div>

          {/* Fact mode: curated company fact */}
          {addMode === "fact" ? (
            <div className="space-y-3">
              <textarea
                value={companyFact}
                onChange={(event) => setCompanyFact(event.target.value)}
                maxLength={800}
                placeholder="We do not offer discounts after the trial period ends."
                className="min-h-40 w-full resize-y rounded-lg border border-border bg-surface-elevated/50 p-3 text-sm transition-colors placeholder:text-foreground-subtle focus:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={companyFactScope}
                  onChange={(event) => setCompanyFactScope(event.target.value)}
                  placeholder="scope"
                  className="h-9 rounded-lg border border-border bg-surface px-3 text-sm transition-colors placeholder:text-foreground-subtle focus:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <input
                  value={companyFactProject}
                  onChange={(event) =>
                    setCompanyFactProject(event.target.value)
                  }
                  placeholder="project"
                  className="h-9 rounded-lg border border-border bg-surface px-3 text-sm transition-colors placeholder:text-foreground-subtle focus:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <Button
                onClick={handleCreateCompanyFact}
                disabled={!canCreateCompanyFact}
                className="w-full"
              >
                {createCompanyMemory.isPending ? (
                  <>
                    <SpinnerGap
                      className="h-4 w-4 animate-spin"
                      weight="bold"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkle className="h-4 w-4" weight="fill" />
                    Save company fact
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Mode-specific input */}
              {ingestMode === "upload" && (
                <label
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors",
                    documentLimitReached
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer",
                    file
                      ? "border-accent/40 bg-accent/[0.04]"
                      : "border-border bg-surface-elevated/30 hover:border-border-hover",
                  )}
                >
                  <input
                    type="file"
                    accept=".md,.txt,.html,.htm,.csv,.pdf,.docx,.png,.jpg,.jpeg,.webp,.tif,.tiff,text/*,text/markdown,text/html,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                    onChange={(event) =>
                      setFile(event.target.files?.[0] ?? null)
                    }
                    disabled={documentLimitReached}
                    className="hidden"
                  />
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-elevated border border-border">
                    <UploadSimple
                      className={cn(
                        "h-5 w-5",
                        file ? "text-accent" : "text-foreground-muted",
                      )}
                      weight="duotone"
                    />
                  </div>
                  {file ? (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {file.name}
                      </p>
                      <p className="text-xs text-foreground-subtle">
                        {(file.size / 1024).toFixed(0)} KB · click to replace
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium">Choose a file</p>
                      <p className="text-xs text-foreground-subtle">
                        PDF, DOCX, images, Markdown, CSV — up to 20MB
                      </p>
                    </div>
                  )}
                </label>
              )}

              {ingestMode === "paste" && (
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Paste document text or Markdown here..."
                  disabled={documentLimitReached}
                  className="min-h-48 w-full resize-y rounded-lg border border-border bg-surface-elevated/50 p-3 text-sm transition-colors placeholder:text-foreground-subtle focus:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              )}

              {ingestMode === "url" && (
                <div className="space-y-3">
                  <div className="relative">
                    <LinkIcon
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted"
                      weight="bold"
                    />
                    <input
                      value={uri}
                      onChange={(event) => setUri(event.target.value)}
                      placeholder="https://docs.example.com or a file URL"
                      disabled={documentLimitReached}
                      className="h-10 w-full rounded-lg border border-border bg-surface-elevated/50 pl-9 pr-3 text-sm transition-colors placeholder:text-foreground-subtle focus:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface-elevated/30 px-3 py-2.5 text-sm text-foreground-muted">
                    <input
                      type="checkbox"
                      checked={crawlSubpages}
                      onChange={(event) =>
                        setCrawlSubpages(event.target.checked)
                      }
                      disabled={documentLimitReached}
                      className="h-4 w-4 accent-accent"
                    />
                    Crawl linked sub-pages
                  </label>
                  {crawlSubpages && (
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]">
                      <input
                        value={subpageTarget}
                        onChange={(event) =>
                          setSubpageTarget(event.target.value)
                        }
                        placeholder="Path hints: docs, api, guides"
                        disabled={documentLimitReached}
                        className={inputClass}
                      />
                      <input
                        type="number"
                        min={1}
                        max={25}
                        value={priorityPageLimit}
                        onChange={(event) =>
                          setPriorityPageLimit(
                            Math.min(
                              25,
                              Math.max(1, Number(event.target.value) || 15),
                            ),
                          )
                        }
                        aria-label="Priority page limit"
                        disabled={documentLimitReached}
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground-muted">
                  Title {ingestMode === "upload" && "(optional)"}
                </label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={
                    ingestMode === "upload"
                      ? "Defaults to the file name"
                      : "Employee Handbook"
                  }
                  disabled={documentLimitReached}
                  className={inputClass}
                />
              </div>

              {/* Advanced: scope + project */}
              <div className="rounded-lg border border-border bg-surface-elevated/30">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-medium text-foreground-muted transition-colors hover:text-foreground"
                >
                  Advanced
                  <CaretDown
                    className={cn(
                      "h-3 w-3 transition-transform",
                      showAdvanced && "rotate-180",
                    )}
                    weight="bold"
                  />
                </button>
                {showAdvanced && (
                  <div className="grid grid-cols-2 gap-2 border-t border-border p-3">
                    <input
                      value={scope}
                      onChange={(event) => setScope(event.target.value)}
                      placeholder="scope"
                      disabled={documentLimitReached}
                      className="h-9 rounded-lg border border-border bg-surface px-3 text-sm transition-colors placeholder:text-foreground-subtle focus:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                    <input
                      value={project}
                      onChange={(event) => setProject(event.target.value)}
                      placeholder="project"
                      disabled={documentLimitReached}
                      className="h-9 rounded-lg border border-border bg-surface px-3 text-sm transition-colors placeholder:text-foreground-subtle focus:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  </div>
                )}
              </div>

              {documentLimitReached && (
                <div className="rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-xs text-accent">
                  Your plan includes {subscription.contextDocumentsLimit}{" "}
                  Context Vault document
                  {subscription.contextDocumentsLimit === 1 ? "" : "s"}.{" "}
                  <Link
                    href="/subscription"
                    className="font-semibold underline"
                  >
                    Upgrade your plan
                  </Link>{" "}
                  to ingest more.
                </div>
              )}

              <Button
                onClick={handleIngestDocument}
                disabled={!canSubmitIngest}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <SpinnerGap
                      className="h-4 w-4 animate-spin"
                      weight="bold"
                    />
                    Queuing...
                  </>
                ) : (
                  <>
                    <Sparkle className="h-4 w-4" weight="fill" />
                    Process document
                  </>
                )}
              </Button>
            </div>
          )}
        </AddKnowledgeDialogShell>
      )}
    </div>
  );
}

function AddKnowledgeDialogShell({
  onClose,
  hint,
  children,
}: {
  onClose: () => void;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl animate-scale-in">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10">
              <Vault className="h-4 w-4 text-accent" weight="duotone" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Add knowledge</h3>
              <p className="text-xs text-foreground-muted">{hint}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function ManageWorkspacesDialog({
  onClose,
  initialTab = "workspaces",
}: {
  onClose: () => void;
  initialTab?: "team" | "workspaces";
}) {
  const isTeam = initialTab === "team";
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between gap-4 border-b border-border p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10">
              <Buildings className="h-4 w-4 text-accent" weight="duotone" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {isTeam ? "Manage team" : "Manage workspaces"}
              </h3>
              <p className="text-xs text-foreground-muted">
                {isTeam
                  ? "Invite teammates and manage roles"
                  : "Create workspaces and invite members"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <WorkspacesSection embedded initialTab={initialTab} />
        </div>
      </div>
    </div>
  );
}

function DocumentMemoriesDialog({
  workspaceId,
  document,
  onClose,
}: {
  workspaceId: string;
  document: DocumentRef;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery(
    companyBrainDocumentMemoriesQueryOptions({
      workspaceId,
      documentId: document.id,
    }),
  );
  const memories = data?.memories ?? [];
  const [detailMemory, setDetailMemory] = useState<CompanyBrainMemory | null>(
    null,
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex h-[85vh] max-h-[760px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl animate-scale-in">
        <div className="flex items-start justify-between gap-4 border-b border-border p-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
              <Brain className="h-5 w-5 text-accent" weight="duotone" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold">
                Extracted memories
              </h3>
              <p className="flex items-center gap-1.5 truncate text-xs text-foreground-muted">
                <FileText className="h-3 w-3 shrink-0" weight="duotone" />
                {document.title} · {data?.total ?? memories.length} memories
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-xl border border-border bg-surface-elevated/40"
                />
              ))}
            </div>
          )}

          {!isLoading && memories.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {memories.map((memory) => (
                <button
                  key={memory.id}
                  type="button"
                  onClick={() => setDetailMemory(memory)}
                  className="flex flex-col rounded-xl border border-border bg-surface-elevated/40 p-4 text-left transition-colors hover:border-accent/40 hover:bg-surface-elevated/70"
                >
                  <p className="line-clamp-4 break-words text-sm leading-6 text-foreground/90">
                    {memory.content}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2.5">
                    {memory.category && (
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium capitalize text-accent">
                        {memory.category}
                      </span>
                    )}
                    {memory.scope && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[10px] text-foreground-muted">
                        <Stack className="h-2.5 w-2.5" weight="duotone" />
                        {memory.scope}
                      </span>
                    )}
                    {memory.project && (
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-foreground-muted">
                        {memory.project}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!isLoading && memories.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated border border-border">
                <Brain
                  size={22}
                  className="text-foreground-muted"
                  weight="duotone"
                />
              </div>
              <p className="text-sm text-foreground-muted">
                No memories were extracted from this document.
              </p>
            </div>
          )}
        </div>
      </div>

      {detailMemory && (
        <VaultMemoryDetailPanel
          key={`${detailMemory.id}:${detailMemory.content}`}
          memory={detailMemory}
          workspaceId={workspaceId}
          onClose={() => setDetailMemory(null)}
        />
      )}
    </div>
  );
}

function DeleteDocumentDialog({
  title,
  isDeleting,
  onClose,
  onConfirm,
}: {
  title: string;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isDeleting ? undefined : onClose}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-background shadow-2xl animate-scale-in">
        <div className="flex items-start justify-between gap-4 p-5 pb-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-error/10">
              <Trash className="h-4 w-4 text-error" weight="duotone" />
            </div>
            <h3 className="text-lg font-semibold">Delete document</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-md p-1 text-foreground-muted transition-colors hover:bg-surface hover:text-foreground disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm text-foreground-muted">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">
              &ldquo;{title}&rdquo;
            </span>
            ? It will automatically remove all the chunks and the memory from
            the system.
          </p>

          <label className="flex cursor-pointer items-center gap-3">
            <div className="relative">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="peer sr-only"
              />
              <div className="flex h-5 w-5 items-center justify-center rounded-sm border-2 border-foreground-muted transition-colors peer-checked:border-error peer-checked:bg-error">
                {confirmed && (
                  <Check className="h-3.5 w-3.5 text-white" weight="bold" />
                )}
              </div>
            </div>
            <span className="text-sm text-foreground-muted">
              I understand this cannot be undone
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 pt-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="hover:translate-y-0 hover:shadow-none"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting || !confirmed}
            className="hover:translate-y-0 hover:shadow-none"
          >
            {isDeleting ? (
              <>
                <SpinnerGap className="h-4 w-4 animate-spin" weight="bold" />
                Deleting...
              </>
            ) : (
              "Delete document"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
