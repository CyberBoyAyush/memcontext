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
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import {
  companyBrainMemoryEvidenceQueryOptions,
  useSubmitVaultMemoryFeedback,
  type CompanyBrainMemory,
  type VaultFeedbackType,
} from "@/lib/queries/company-brain";

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
  const [feedbackSent, setFeedbackSent] = useState<VaultFeedbackType | null>(
    null,
  );
  const [isClosing, setIsClosing] = useState(false);
  const [expandedChunk, setExpandedChunk] = useState<string | null>(null);
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
              {memory.content}
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

            {memory.sourceTitle && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-foreground-muted">
                  <FileText className="h-3.5 w-3.5" />
                  Source
                </div>
                {memory.sourceUrl ? (
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
                )}
              </div>
            )}
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
              </div>
            )}
          </div>

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
                            {item.sectionPath ??
                              (item.pageNumber != null
                                ? `Page ${item.pageNumber}`
                                : "Chunk")}
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
                          <p className="whitespace-pre-wrap break-words text-xs leading-6 text-foreground/80">
                            {item.content}
                          </p>
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
