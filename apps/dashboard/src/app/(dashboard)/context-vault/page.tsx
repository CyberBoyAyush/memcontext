"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Brain,
  Buildings,
  CaretDown,
  Check,
  FileText,
  Gear,
  Link as LinkIcon,
  MagnifyingGlass,
  Sparkle,
  SpinnerGap,
  Stack,
  TextAlignLeft,
  Trash,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import {
  companyBrainDocumentMemoriesQueryOptions,
  companyBrainDocumentsQueryOptions,
  companyBrainSearchQueryOptions,
  useCancelCompanyBrainDocument,
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

interface DeleteTarget {
  id: string;
  title: string;
}

interface DocumentRef {
  id: string;
  title: string;
}

const ingestTabs: Array<{
  value: IngestMode;
  label: string;
  icon: typeof UploadSimple;
}> = [
  { value: "upload", label: "Upload", icon: UploadSimple },
  { value: "paste", label: "Paste", icon: TextAlignLeft },
  { value: "url", label: "URL", icon: LinkIcon },
];

const inputClass =
  "h-10 w-full rounded-lg border border-border bg-surface-elevated/50 px-3 text-sm transition-colors placeholder:text-foreground-subtle focus:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent/20";

function normalizeDocumentationUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function parseScopeSearch(value: string) {
  const scopes = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return scopes.length > 1
    ? { scopes, scope: undefined }
    : { scopes: undefined, scope: scopes[0] };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function parseUrl(url: string | null | undefined): URL | null {
  if (!url) return null;
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/**
 * Favicon for a URL via DuckDuckGo's icon service. Unlike Google's service
 * (which returns a generic globe on miss), this returns a 404 so the image
 * `onError` fallback to the document icon actually fires.
 */
function faviconUrl(parsed: URL): string {
  const host = parsed.hostname.replace(/^www\./, "");
  return `https://icons.duckduckgo.com/ip3/${host}.ico`;
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

/** Document avatar: site favicon for URL sources, file icon otherwise. */
function DocumentIcon({
  sourceType,
  publicUrl,
  processing = false,
}: {
  sourceType: string;
  publicUrl: string | null;
  processing?: boolean;
}) {
  const parsed = sourceType === "url" ? parseUrl(publicUrl) : null;
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={cn(
        "relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-surface-elevated transition-colors",
        processing ? "border-accent/30" : "border-border",
      )}
    >
      {parsed && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={faviconUrl(parsed)}
          alt=""
          width={18}
          height={18}
          className={cn(
            "h-[18px] w-[18px] rounded-sm transition-opacity",
            processing && "opacity-40",
          )}
          onError={() => setFailed(true)}
        />
      ) : (
        <FileText
          className={cn(
            "h-4 w-4 text-foreground-muted transition-opacity",
            processing && "opacity-40",
          )}
          weight="duotone"
        />
      )}
      {/* Smooth circular spinner overlay while processing */}
      {processing && (
        <SpinnerGap
          className="absolute h-5 w-5 animate-spin text-accent"
          weight="bold"
        />
      )}
    </div>
  );
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
    <div className="rounded-xl sm:rounded-2xl border border-border bg-surface p-3 sm:p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-foreground-muted">{label}</p>
        <div className="text-xl sm:text-3xl font-semibold mt-0.5 sm:mt-1">
          {value}
        </div>
      </div>
      <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-surface-elevated border border-border flex items-center justify-center shrink-0">
        <Icon size={24} className="text-foreground-muted" weight="duotone" />
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
  const [subpageTarget, setSubpageTarget] = useState("docs, api, guides");
  const [ingestMode, setIngestMode] = useState<IngestMode>("upload");
  const [scope, setScope] = useState("");
  const [project, setProject] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("hybrid");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [memoriesDocument, setMemoriesDocument] = useState<DocumentRef | null>(
    null,
  );
  const [manageOpen, setManageOpen] = useState(false);

  const { data: workspaceData } = useQuery(workspacesQueryOptions());
  const ingestDocument = useIngestCompanyBrainDocument();
  const uploadDocument = useUploadCompanyBrainDocument();
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
  const searchScope = parseScopeSearch(scope);

  const { data: searchData, isFetching: searchLoading } = useQuery(
    companyBrainSearchQueryOptions({
      workspaceId: activeWorkspaceId,
      query,
      mode,
      scope: searchScope.scope,
      scopes: searchScope.scopes,
      project: project || undefined,
    }),
  );

  const documents = documentsData?.documents ?? [];
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

  function resetIngestForm() {
    setTitle("");
    setContent("");
    setUri("");
    setFile(null);
  }

  async function handleIngestDocument() {
    if (!canSubmitIngest) return;
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
        toast.success("Document queued for processing");
        return;
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not process document"));
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
  const canSubmitIngest =
    !isProcessing &&
    !!activeWorkspaceId &&
    (ingestMode === "upload"
      ? !!file
      : ingestMode === "paste"
        ? title.trim().length > 0 && content.trim().length > 0
        : title.trim().length > 0 && uri.trim().length > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-2.5 py-1 text-xs font-medium text-accent">
            <Buildings className="h-3.5 w-3.5" weight="fill" />
            Context Vault
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Workspace knowledge
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-foreground-muted">
            Upload documents, extract durable company memories, and search the
            original chunks with citations.
          </p>
        </div>

        <WorkspaceSelect
          workspaces={workspaces}
          value={activeWorkspaceId}
          onChange={setSelectedWorkspaceId}
          onAdd={() => setManageOpen(true)}
          onManage={() => setManageOpen(true)}
        />
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-3">
        <StatCard label="Documents" value={documents.length} icon={FileText} />
        <StatCard label="Chunks" value={totalChunks} icon={Stack} />
        <StatCard label="Memories" value={totalMemories} icon={Brain} />
      </div>

      {/* Ingest + Search */}
      <section className="relative">
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
              <Button asChild variant="secondary" className="mt-4">
                <Link href="/settings">
                  <Gear className="h-4 w-4" weight="duotone" />
                  Create one in Settings
                </Link>
              </Button>
            </div>
          </div>
        )}

        <div
          aria-hidden={!hasWorkspace}
          className={cn(
            "grid gap-6 xl:grid-cols-[420px_1fr]",
            !hasWorkspace && "pointer-events-none select-none opacity-40",
          )}
        >
          {/* Ingest */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <UploadSimple className="h-4 w-4 text-accent" weight="bold" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Ingest document</h2>
                <p className="text-xs text-foreground-muted">
                  We auto-detect the format and extract memories.
                </p>
              </div>
            </div>

            {/* Source tabs */}
            <div className="mt-4 grid grid-cols-3 gap-1 rounded-lg border border-border bg-surface-elevated/50 p-1">
              {ingestTabs.map((tab) => {
                const active = ingestMode === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setIngestMode(tab.value)}
                    className={cn(
                      "flex h-9 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-all",
                      active
                        ? "bg-accent text-white shadow-sm"
                        : "text-foreground-muted hover:text-foreground",
                    )}
                  >
                    <tab.icon className="h-3.5 w-3.5" weight="bold" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-3">
              {/* Mode-specific input */}
              {ingestMode === "upload" && (
                <label
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors",
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
                      className="h-4 w-4 accent-accent"
                    />
                    Crawl linked sub-pages
                  </label>
                  {crawlSubpages && (
                    <input
                      value={subpageTarget}
                      onChange={(event) => setSubpageTarget(event.target.value)}
                      placeholder="Path hints: docs, api, guides"
                      className={inputClass}
                    />
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
                      placeholder="scope or scope-a, scope-b for search"
                      className="h-9 rounded-lg border border-border bg-surface px-3 text-sm transition-colors placeholder:text-foreground-subtle focus:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                    <input
                      value={project}
                      onChange={(event) => setProject(event.target.value)}
                      placeholder="project"
                      className="h-9 rounded-lg border border-border bg-surface px-3 text-sm transition-colors placeholder:text-foreground-subtle focus:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  </div>
                )}
              </div>

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
          </div>

          {/* Search + Documents */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                    <MagnifyingGlass
                      className="h-4 w-4 text-accent"
                      weight="bold"
                    />
                  </div>
                  <h2 className="text-sm font-semibold">Search knowledge</h2>
                </div>
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

              <div className="relative mt-4">
                <MagnifyingGlass
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted"
                  weight="bold"
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="What does the company handbook say about leave policy?"
                  className="h-11 w-full rounded-lg border border-border bg-surface-elevated/50 pl-9 pr-3 text-sm transition-colors placeholder:text-foreground-subtle focus:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              {hasSearched && !searchLoading && (
                <p className="mt-3 text-xs text-foreground-muted">
                  {resultCount} result{resultCount === 1 ? "" : "s"} for{" "}
                  <span className="text-foreground">&ldquo;{query}&rdquo;</span>
                </p>
              )}

              <div className="mt-4 max-h-[30rem] space-y-3 overflow-y-auto pr-1">
                {searchLoading && (
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-20 animate-pulse rounded-lg border border-border bg-surface-elevated/40"
                      />
                    ))}
                  </div>
                )}

                {!searchLoading &&
                  searchData?.chunks.map((chunk) => (
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
                      <p className="mt-2 line-clamp-6 break-words text-sm leading-6 text-foreground/90">
                        {chunk.content}
                      </p>
                      <p className="mt-2 truncate text-xs text-foreground-subtle">
                        {chunk.sectionPath ?? "Document"} · chunk{" "}
                        {chunk.chunkIndex}
                      </p>
                    </div>
                  ))}

                {!searchLoading &&
                  searchData?.memories.map((memory) => (
                    <div
                      key={memory.id}
                      className="group rounded-lg border border-accent/20 bg-accent/[0.04] p-3.5 transition-colors hover:border-accent/40"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-medium text-accent">
                        <Brain
                          className="h-3.5 w-3.5 shrink-0"
                          weight="duotone"
                        />
                        Extracted memory
                      </div>
                      <p className="mt-2 line-clamp-6 break-words text-sm leading-6 text-foreground/90">
                        {memory.content}
                      </p>
                      {memory.evidence[0] && (
                        <p className="mt-2 truncate text-xs text-foreground-subtle">
                          {memory.evidence[0].title ?? "Source"} ·{" "}
                          {memory.evidence[0].sectionPath ?? "Document"} · chunk{" "}
                          {memory.evidence[0].chunkIndex}
                        </p>
                      )}
                    </div>
                  ))}

                {hasSearched && !searchLoading && resultCount === 0 && (
                  <div className="py-10 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated border border-border">
                      <MagnifyingGlass
                        size={22}
                        className="text-foreground-muted"
                        weight="duotone"
                      />
                    </div>
                    <p className="text-sm text-foreground-muted">
                      No matches found. Try a different query or mode.
                    </p>
                  </div>
                )}

                {!hasSearched && !searchLoading && (
                  <div className="py-10 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated border border-border">
                      <Sparkle
                        size={22}
                        className="text-foreground-muted"
                        weight="duotone"
                      />
                    </div>
                    <p className="text-sm text-foreground-muted">
                      Ask anything about your workspace knowledge.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                    <FileText className="h-4 w-4 text-accent" weight="bold" />
                  </div>
                  <h2 className="text-sm font-semibold">Documents</h2>
                </div>
                <span className="text-xs text-foreground-muted">
                  {documents.length} total
                </span>
              </div>

              <div className="mt-4 space-y-1">
                {documents.map((document, index) => {
                  const isProcessing = [
                    "pending",
                    "processing",
                    "retrying",
                  ].includes(document.status);
                  return (
                    <div
                      key={document.id}
                      style={{
                        animationDelay: `${Math.min(index, 8) * 50}ms`,
                        animationFillMode: "backwards",
                      }}
                      className={cn(
                        "group relative flex items-center justify-between gap-4 rounded-xl border border-transparent px-3 py-3 transition-all duration-200 animate-fade-in-up",
                        "hover:border-border hover:bg-surface-elevated/40",
                        isProcessing && "border-accent/15 bg-accent/[0.03]",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <DocumentIcon
                          sourceType={document.sourceType}
                          publicUrl={document.publicUrl}
                          processing={isProcessing}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {(() => {
                              const parsed =
                                document.sourceType === "url"
                                  ? parseUrl(document.publicUrl)
                                  : null;
                              return (
                                document.title ??
                                (parsed
                                  ? urlDisplayName(parsed)
                                  : "Untitled document")
                              );
                            })()}
                          </p>
                          <p className="text-xs text-foreground-muted">
                            {document.chunkCount} chunks ·{" "}
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
                                {document.extractedCount} memories
                              </button>
                            ) : (
                              `${document.extractedCount} memories`
                            )}
                          </p>
                          {isProcessing && (
                            <p className="mt-0.5 text-xs text-foreground-subtle">
                              {getProcessingSummary(document)}
                            </p>
                          )}
                          {document.publicUrl && (
                            <a
                              href={document.publicUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-0.5 inline-block text-xs text-accent hover:underline"
                            >
                              Open original
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <StatusBadge status={document.status} />
                        <span className="text-[10px] text-foreground-subtle">
                          {document.sourceType}
                        </span>
                        {["pending", "processing", "retrying"].includes(
                          document.status,
                        ) && (
                          <button
                            type="button"
                            onClick={() => handleCancelDocument(document.id)}
                            disabled={cancelDocument.isPending}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-[11px] text-foreground-muted transition-all duration-150 hover:-translate-y-px hover:border-error/40 hover:text-error active:translate-y-0 disabled:opacity-50"
                          >
                            <X className="h-3 w-3" weight="bold" />
                            Stop
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              id: document.id,
                              title: document.title ?? "Untitled document",
                            })
                          }
                          disabled={deleteDocument.isPending}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-[11px] text-foreground-muted transition-all duration-150 hover:-translate-y-px hover:border-error/40 hover:text-error active:translate-y-0 disabled:opacity-50"
                        >
                          <Trash className="h-3 w-3" weight="bold" />
                          Delete
                        </button>
                        {document.error && (
                          <span className="max-w-40 truncate text-right text-[10px] text-error">
                            {document.error}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {documents.length === 0 && (
                  <div className="py-10 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated border border-border">
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
            </div>
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
        <ManageWorkspacesDialog onClose={() => setManageOpen(false)} />
      )}
    </div>
  );
}

function ManageWorkspacesDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between gap-4 border-b border-border p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10">
              <Buildings className="h-4 w-4 text-accent" weight="duotone" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Manage workspaces</h3>
              <p className="text-xs text-foreground-muted">
                Create workspaces and invite members
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

        <div className="flex-1 overflow-y-auto p-5">
          <WorkspacesSection embedded />
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
          key={detailMemory.id}
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
