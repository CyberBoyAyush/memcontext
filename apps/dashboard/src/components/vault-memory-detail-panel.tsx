"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowSquareOut,
  Brain,
  CaretRight,
  Calendar,
  Check,
  FileText,
  FolderOpen,
  Globe,
  Stack,
  Tag,
  X,
} from "@phosphor-icons/react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import {
  companyBrainMemoryEvidenceQueryOptions,
  useCorrectVaultMemory,
  useSubmitVaultMemoryFeedback,
  type CompanyBrainMemory,
  type VaultFeedbackType,
} from "@/lib/queries/company-brain";

/**
 * Some chunked markdown tables arrive without a GFM separator row (e.g. `| --- |`)
 * or with rows collapsed onto a single line (e.g. `... | col | | next row ...`).
 * Normalize both shapes so remark-gfm can render them as real tables.
 */
function normalizeChunkMarkdown(input: string): string {
  if (!input) return input;

  // Step 1: split runs of inline rows like "| a | b | | c | d |" into separate lines.
  // We look for "| |" (end of one row, start of next on the same physical line).
  let normalized = input.replace(/\|\s*\|/g, (match, offset, str) => {
    // If this is genuinely an empty cell ("|  |") inside a row, the surrounding
    // context will still have non-pipe content between row breaks. To avoid
    // mangling empty cells, only split when the next "|" begins what looks like
    // a new header/data row (i.e., text follows before another newline).
    const before = str.slice(0, offset);
    const after = str.slice(offset + match.length);
    // Heuristic: only split if both sides contain at least one more pipe on the
    // same line (so we are actually flattening a multi-row table).
    const beforeLineStart = before.lastIndexOf("\n") + 1;
    const afterLineEnd = after.indexOf("\n");
    const beforeLine = before.slice(beforeLineStart);
    const afterLine = afterLineEnd === -1 ? after : after.slice(0, afterLineEnd);
    if (beforeLine.includes("|") && afterLine.includes("|")) {
      return "|\n|";
    }
    return match;
  });

  // Step 2: inject a separator row after a header row if missing.
  // Only inject once per contiguous block of table rows (after the first row).
  const lines = normalized.split("\n");
  const isTableRow = (s: string) =>
    s.startsWith("|") && s.endsWith("|") && s.includes("|", 1);
  const isSeparator = (s: string) =>
    /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(s);
  const out: string[] = [];
  let inTable = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (isTableRow(trimmed)) {
      out.push(line);
      const next = (lines[i + 1] ?? "").trim();
      if (!inTable) {
        // This is the header row of a new table.
        if (!isSeparator(next)) {
          const cellCount = trimmed
            .split("|")
            .filter((c) => c.length > 0).length;
          if (cellCount >= 2 && isTableRow(next)) {
            out.push("|" + " --- |".repeat(cellCount));
          }
        }
        inTable = true;
      }
    } else {
      out.push(line);
      if (trimmed === "" || !isSeparator(trimmed)) {
        // Blank line or non-table content ends the current table block.
        if (trimmed === "") inTable = false;
      }
    }
  }
  normalized = out.join("\n");

  return normalized;
}

const CHUNK_MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => (
    <p className="break-words text-xs leading-6 text-foreground/85 [&:not(:first-child)]:mt-2">
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
    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-foreground/85">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-foreground/85">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-6">{children}</li>,
  code: ({ children }) => (
    <code className="rounded bg-surface px-1 py-0.5 font-mono text-[11px] text-foreground">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-surface p-2 text-[11px] leading-5 text-foreground/90">
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
    <h3 className="mt-2 text-[13px] font-semibold text-foreground first:mt-0">
      {children}
    </h3>
  ),
  table: ({ children }) => (
    <div className="mt-2 overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-[11px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-surface-elevated">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border-b border-r border-border px-2 py-1.5 text-left font-semibold text-foreground last:border-r-0">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-r border-border/60 px-2 py-1.5 align-top text-foreground/85 last:border-r-0">
      {children}
    </td>
  ),
  hr: () => <hr className="my-2 border-border" />,
};

/** Inline markdown for tight contexts like section paths — no block wrappers. */
const INLINE_CHUNK_MARKDOWN_COMPONENTS: Components = {
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
};

const categoryTone: Record<string, string> = {
  preference: "bg-accent/10 text-accent",
  fact: "bg-emerald-500/10 text-emerald-400",
  decision: "bg-blue-500/10 text-blue-400",
  context: "bg-purple-500/10 text-purple-400",
};

const feedbackOptions: Array<{ type: VaultFeedbackType; label: string }> = [
  { type: "helpful", label: "Helpful" },
  { type: "not_helpful", label: "Not helpful" },
  { type: "outdated", label: "Outdated" },
  { type: "wrong", label: "Wrong" },
];

function formatDate(value: string) {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    time: date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

interface VaultMemoryDetailPanelProps {
  memory: CompanyBrainMemory;
  workspaceId: string;
  onClose: () => void;
}

/**
 * Read-only detail sidebar for a workspace (Context Vault) memory. Shows
 * content, metadata, source document, and lets a member leave feedback.
 */
export function VaultMemoryDetailPanel({
  memory,
  workspaceId,
  onClose,
}: VaultMemoryDetailPanelProps) {
  const toast = useToast();
  const feedbackMutation = useSubmitVaultMemoryFeedback();
  const correctionMutation = useCorrectVaultMemory();
  const [feedbackSent, setFeedbackSent] = useState<VaultFeedbackType | null>(
    null,
  );
  const [isClosing, setIsClosing] = useState(false);
  const [expandedChunk, setExpandedChunk] = useState<string | null>(null);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionType, setCorrectionType] = useState<
    "wrong" | "outdated" | "incomplete"
  >("wrong");
  const [displayContent, setDisplayContent] = useState(memory.content);
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctedContent, setCorrectedContent] = useState(memory.content);
  const [correctedChunkContent, setCorrectedChunkContent] = useState("");
  const [evidenceChunkId, setEvidenceChunkId] = useState("");
  const created = formatDate(memory.createdAt);

  const { data: evidenceData, isLoading: evidenceLoading } = useQuery(
    companyBrainMemoryEvidenceQueryOptions({
      workspaceId,
      memoryId: memory.id,
    }),
  );
  const evidence = evidenceData?.evidence ?? [];

  function handleClose() {
    setIsClosing(true);
    setTimeout(onClose, 260);
  }

  async function handleFeedback(type: VaultFeedbackType) {
    try {
      await feedbackMutation.mutateAsync({
        workspaceId,
        memoryId: memory.id,
        type,
      });
      setFeedbackSent(type);
      toast.success(`Marked as ${type.replace("_", " ")}`);
    } catch {
      toast.error("Failed to submit feedback");
    }
  }

  async function handleCorrection() {
    if (!correctedContent.trim()) {
      toast.error("Corrected memory is required");
      return;
    }

    try {
      const result = await correctionMutation.mutateAsync({
        workspaceId,
        memoryId: memory.id,
        type: correctionType,
        correctedContent: correctedContent.trim(),
        reason: correctionReason.trim() || undefined,
        correctedChunkContent: correctedChunkContent.trim() || undefined,
        evidenceChunkId: evidenceChunkId || undefined,
      });
      setDisplayContent(result.memory.content);
      setCorrectedContent(result.memory.content);
      setFeedbackSent(correctionType === "outdated" ? "outdated" : "wrong");
      setCorrectionOpen(false);
      toast.success(
        result.updatedChunkCount > 0
          ? "Memory and source chunk corrected"
          : "Memory corrected",
      );
    } catch {
      toast.error("Failed to correct memory");
    }
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[70] bg-black/10 backdrop-blur-[2px]",
          isClosing ? "animate-backdrop-fade-out" : "animate-backdrop-fade-in",
        )}
        onClick={handleClose}
      />

      <div
        className={cn(
          "fixed right-0 top-0 z-[71] flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl",
          isClosing ? "animate-panel-slide-out" : "animate-panel-slide-in",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <Brain className="h-4 w-4 text-accent" weight="duotone" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Memory details</h2>
              <p className="text-[11px] text-foreground-subtle">
                Workspace memory · read-only
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-md p-1.5 text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-4 scrollbar-hide">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-foreground-muted">
              <FileText className="h-3.5 w-3.5" />
              Content
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {displayContent}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-foreground-muted">
                <Tag className="h-3.5 w-3.5" />
                Category
              </div>
              {memory.category ? (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                    categoryTone[memory.category] ??
                      "bg-surface-elevated text-foreground-muted",
                  )}
                >
                  {memory.category}
                </span>
              ) : (
                <span className="text-sm text-foreground-subtle">
                  No category
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-foreground-muted">
                <FolderOpen className="h-3.5 w-3.5" />
                Project
              </div>
              {memory.project ? (
                <span className="text-sm">{memory.project}</span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm text-foreground-subtle">
                  <Globe className="h-3.5 w-3.5" />
                  Global
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-foreground-muted">
                <Calendar className="h-3.5 w-3.5" />
                Created
              </div>
              <div className="text-sm">
                <div>{created.date}</div>
                <div className="text-foreground-muted">{created.time}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-foreground-muted">
                <FileText className="h-3.5 w-3.5" />
                Source
              </div>
              {memory.sourceTitle ? (
                memory.sourceUrl ? (
                  <a
                    href={memory.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-1.5 text-sm text-accent transition-colors hover:underline"
                  >
                    <FileText
                      className="h-3.5 w-3.5 shrink-0"
                      weight="duotone"
                    />
                    <span className="truncate">{memory.sourceTitle}</span>
                    <ArrowSquareOut className="h-3 w-3 shrink-0 opacity-70" />
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm">
                    <FileText
                      className="h-3.5 w-3.5 shrink-0 text-foreground-muted"
                      weight="duotone"
                    />
                    <span className="truncate">{memory.sourceTitle}</span>
                  </span>
                )
              ) : memory.memoryType === "company" ? (
                <span className="flex items-center gap-1.5 text-sm text-foreground-subtle">
                  <Brain className="h-3.5 w-3.5" weight="duotone" />
                  Curated company fact
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm text-foreground-subtle">
                  <FileText className="h-3.5 w-3.5" weight="duotone" />
                  Source unavailable
                </span>
              )}
            </div>
          </div>

          {/* Feedback */}
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wider text-foreground-muted">
              Feedback
            </div>
            {feedbackSent ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                <Check className="h-3 w-3" weight="bold" />
                Marked as {feedbackSent.replace("_", " ")}
              </span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {feedbackOptions.map((fb) => (
                  <button
                    key={fb.type}
                    onClick={() => handleFeedback(fb.type)}
                    disabled={feedbackMutation.isPending}
                    className="cursor-pointer rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface-elevated hover:text-foreground disabled:opacity-50"
                  >
                    {fb.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCorrectionOpen((open) => !open)}
                  className="cursor-pointer rounded-lg border border-accent/30 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
                >
                  Suggest correction
                </button>
              </div>
            )}
          </div>

          {correctionOpen && (
            <div className="space-y-3 rounded-lg border border-border bg-surface-elevated/30 p-3">
              <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-surface p-1">
                {(["wrong", "outdated", "incomplete"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setCorrectionType(type)}
                    className={cn(
                      "h-8 rounded text-[11px] font-medium capitalize transition-colors",
                      correctionType === type
                        ? "bg-accent text-white"
                        : "text-foreground-muted hover:text-foreground",
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <textarea
                value={correctedContent}
                onChange={(event) => setCorrectedContent(event.target.value)}
                className="min-h-28 w-full resize-y rounded-md border border-border bg-surface p-2 text-sm focus:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent/20"
              />

              <textarea
                value={correctionReason}
                onChange={(event) => setCorrectionReason(event.target.value)}
                placeholder="Reason or reviewer note"
                className="min-h-16 w-full resize-y rounded-md border border-border bg-surface p-2 text-sm placeholder:text-foreground-subtle focus:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent/20"
              />

              {evidence.length > 0 && (
                <div className="space-y-2">
                  <select
                    value={evidenceChunkId}
                    onChange={(event) => {
                      const chunkId = event.target.value;
                      setEvidenceChunkId(chunkId);
                      const chunk = evidence.find(
                        (item) => item.chunkId === chunkId,
                      );
                      setCorrectedChunkContent(chunk?.content ?? "");
                    }}
                    className="h-9 w-full rounded-md border border-border bg-surface px-2 text-xs text-foreground-muted focus:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    <option value="">Do not update source chunk</option>
                    {evidence.map((item) => (
                      <option key={item.chunkId} value={item.chunkId}>
                        Update chunk #{item.chunkIndex}
                      </option>
                    ))}
                  </select>
                  {evidenceChunkId && (
                    <textarea
                      value={correctedChunkContent}
                      onChange={(event) =>
                        setCorrectedChunkContent(event.target.value)
                      }
                      placeholder="Corrected source chunk text"
                      className="min-h-24 w-full resize-y rounded-md border border-border bg-surface p-2 text-sm placeholder:text-foreground-subtle focus:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCorrectionOpen(false)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground-muted transition-colors hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCorrection}
                  disabled={correctionMutation.isPending}
                  className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity disabled:opacity-50"
                >
                  Apply correction
                </button>
              </div>
            </div>
          )}

          {/* Extracted from (source chunks) */}
          {(evidenceLoading || evidence.length > 0) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-foreground-muted">
                <Stack className="h-3.5 w-3.5" />
                Extracted from{" "}
                {evidence.length > 0 &&
                  `${evidence.length} chunk${evidence.length === 1 ? "" : "s"}`}
              </div>

              {evidenceLoading && (
                <div className="space-y-2">
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="h-10 animate-pulse rounded-lg border border-border bg-surface-elevated/40"
                    />
                  ))}
                </div>
              )}

              <div className="space-y-2">
                {evidence.map((item) => {
                  const open = expandedChunk === item.chunkId;
                  return (
                    <div
                      key={item.chunkId}
                      className="overflow-hidden rounded-lg border border-border bg-surface-elevated/40"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedChunk(open ? null : item.chunkId)
                        }
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-surface"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="inline-flex h-5 shrink-0 items-center justify-center rounded bg-surface px-1.5 text-[10px] font-semibold tabular-nums text-foreground-muted">
                            #{item.chunkIndex}
                          </span>
                          <span className="truncate text-xs text-foreground-muted">
                            {item.sectionPath ? (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={INLINE_CHUNK_MARKDOWN_COMPONENTS}
                                allowedElements={[
                                  "p",
                                  "strong",
                                  "em",
                                  "code",
                                  "span",
                                  "del",
                                ]}
                                unwrapDisallowed
                              >
                                {item.sectionPath}
                              </ReactMarkdown>
                            ) : item.pageNumber != null ? (
                              `Page ${item.pageNumber}`
                            ) : (
                              "Chunk"
                            )}
                          </span>
                        </span>
                        <CaretRight
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 text-foreground-subtle transition-transform",
                            open && "rotate-90",
                          )}
                          weight="bold"
                        />
                      </button>
                      {open && (
                        <div className="border-t border-border px-3 py-2.5">
                          <div className="markdown-body">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={CHUNK_MARKDOWN_COMPONENTS}
                            >
                              {normalizeChunkMarkdown(item.content)}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
