"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Brain,
  Filter,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Tag,
  FolderOpen,
  Pencil,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  memoriesQueryOptions,
  useDeleteMemory,
  useUpdateMemory,
} from "@/lib/queries/memories";
import { formatRelativeTime, cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

interface Memory {
  id: string;
  content: string;
  category: string | null;
  project: string | null;
  source: string;
  createdAt: string;
}

const categories = [
  { value: "", label: "All Categories" },
  { value: "preference", label: "Preference" },
  { value: "fact", label: "Fact" },
  { value: "decision", label: "Decision" },
  { value: "context", label: "Context" },
];

const editCategories = [
  { value: "preference", label: "Preference" },
  { value: "fact", label: "Fact" },
  { value: "decision", label: "Decision" },
  { value: "context", label: "Context" },
];

const categoryConfig: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  preference: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  fact: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  decision: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20",
  },
  context: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
};

const ITEMS_PER_PAGE = 10;

// Edit Modal Component
function EditMemoryModal({
  memory,
  onClose,
  onSuccess,
  onError,
}: {
  memory: Memory;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [content, setContent] = useState(memory.content);
  const [editCategory, setEditCategory] = useState(memory.category || "");
  const [editProject, setEditProject] = useState(memory.project || "");

  const updateMutation = useUpdateMemory();

  async function handleSave() {
    try {
      await updateMutation.mutateAsync({
        id: memory.id,
        content: content !== memory.content ? content : undefined,
        category:
          editCategory !== (memory.category || "")
            ? editCategory || undefined
            : undefined,
        project:
          editProject !== (memory.project || "")
            ? editProject || undefined
            : undefined,
      });
      onSuccess("Memory updated successfully");
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update memory");
    }
  }

  const hasChanges =
    content !== memory.content ||
    editCategory !== (memory.category || "") ||
    editProject !== (memory.project || "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-background border border-border rounded-2xl shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Pencil className="h-5 w-5 text-foreground-muted" />
            Edit Memory
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Content textarea */}
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="flex w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 resize-none"
              placeholder="Memory content..."
            />
          </div>

          {/* Category and Project row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <select
                id="edit-category"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="">No category</option>
                {editCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-project">Project</Label>
              <Input
                id="edit-project"
                value={editProject}
                onChange={(e) => setEditProject(e.target.value)}
                placeholder="Project name (optional)"
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="text-xs text-foreground-subtle flex items-center gap-4">
            <span>Created {formatRelativeTime(memory.createdAt)}</span>
            <span>•</span>
            <span>Source: {memory.source}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-surface/50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MemoriesPage() {
  const [category, setCategory] = useState("");
  const [project, setProject] = useState("");
  const [page, setPage] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);

  const toast = useToast();
  const offset = page * ITEMS_PER_PAGE;

  const { data, isLoading, error, isFetching } = useQuery(
    memoriesQueryOptions({
      limit: ITEMS_PER_PAGE,
      offset,
      category: category || undefined,
      project: project || undefined,
    }),
  );

  const deleteMutation = useDeleteMemory();

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this memory?")) return;
    setDeleteId(id);
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Memory deleted successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete memory",
      );
    } finally {
      setDeleteId(null);
    }
  }

  const totalPages = data ? Math.ceil(data.total / ITEMS_PER_PAGE) : 0;
  const showingFrom = data && data.total > 0 ? offset + 1 : 0;
  const showingTo = data ? Math.min(offset + ITEMS_PER_PAGE, data.total) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Memories</h1>
        <p className="text-foreground-muted mt-1">
          View and manage your saved memories
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-foreground-muted" />
              <span className="text-sm text-foreground-muted">Filters:</span>
            </div>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(0);
              }}
              className="flex h-10 rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <Input
              placeholder="Filter by project..."
              value={project}
              onChange={(e) => {
                setProject(e.target.value);
                setPage(0);
              }}
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Memory list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-foreground-muted" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-center text-error">
            Failed to load memories. Please try again.
          </CardContent>
        </Card>
      ) : data?.memories.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Brain className="h-12 w-12 mx-auto text-foreground-subtle mb-4" />
            <h3 className="text-lg font-medium mb-2">No memories yet</h3>
            <p className="text-foreground-muted">
              Start saving memories through your AI assistant
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data?.memories.map((memory) => {
            const config = memory.category
              ? categoryConfig[memory.category]
              : null;

            return (
              <Card
                key={memory.id}
                className={cn(
                  "group relative overflow-hidden transition-all duration-200",
                  "hover:shadow-lg hover:shadow-black/20",
                  config?.border,
                  config?.bg,
                )}
              >
                {/* Category accent line */}
                {config && (
                  <div
                    className={cn(
                      "absolute left-0 top-0 bottom-0 w-1",
                      config.text.replace("text-", "bg-"),
                    )}
                  />
                )}

                <CardContent className="p-5 pl-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Content */}
                      <p className="text-[15px] leading-relaxed text-foreground/90">
                        {memory.content}
                      </p>

                      {/* Metadata row */}
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        {/* Category badge */}
                        {memory.category && config && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium",
                              config.bg,
                              config.text,
                              "border",
                              config.border,
                            )}
                          >
                            <Tag className="h-3 w-3" />
                            {memory.category}
                          </span>
                        )}

                        {/* Project badge */}
                        {memory.project && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-surface-elevated text-foreground-muted border border-border">
                            <FolderOpen className="h-3 w-3" />
                            {memory.project}
                          </span>
                        )}

                        {/* Timestamp */}
                        <span className="inline-flex items-center gap-1.5 text-foreground-subtle">
                          <Calendar className="h-3 w-3" />
                          {formatRelativeTime(memory.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-foreground-subtle hover:text-foreground hover:bg-surface-elevated"
                        onClick={() => setEditingMemory(memory)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-foreground-subtle hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => handleDelete(memory.id)}
                        disabled={deleteId === memory.id}
                      >
                        {deleteId === memory.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Pagination */}
          {data && data.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
              <p className="text-sm text-foreground-muted">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {showingFrom}-{showingTo}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {data.total}
                </span>{" "}
                memories
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || isFetching}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                <div className="hidden sm:flex items-center gap-1 px-2">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i;
                    } else if (page < 3) {
                      pageNum = i;
                    } else if (page > totalPages - 4) {
                      pageNum = totalPages - 5 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "ghost"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setPage(pageNum)}
                        disabled={isFetching}
                      >
                        {pageNum + 1}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!data.hasMore || isFetching}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Loading overlay for pagination */}
          {isFetching && !isLoading && (
            <div className="fixed bottom-4 right-4 bg-surface-elevated px-4 py-2 rounded-lg border border-border shadow-lg flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingMemory && (
        <EditMemoryModal
          memory={editingMemory}
          onClose={() => setEditingMemory(null)}
          onSuccess={(message) => toast.success(message)}
          onError={(message) => toast.error(message)}
        />
      )}
    </div>
  );
}
