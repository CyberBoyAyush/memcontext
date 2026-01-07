"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Brain,
  Trash,
  SpinnerGap,
  CaretLeft,
  CaretRight,
  Calendar,
  Tag,
  FolderOpen,
  PencilSimple,
  X,
  MagnifyingGlass,
  CaretDown,
  Check,
  Clock,
  FileText,
  Globe,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  memoriesQueryOptions,
  useDeleteMemory,
  useUpdateMemory,
} from "@/lib/queries/memories";
import { formatDateTime, cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import { api } from "@/lib/api";

interface Memory {
  id: string;
  content: string;
  category: string | null;
  project: string | null;
  source: string;
  createdAt: string;
}

const categories = [
  { value: "", label: "All" },
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
  {
    bg: string;
    text: string;
    border: string;
    lightBg: string;
    lightText: string;
    dot: string;
  }
> = {
  preference: {
    bg: "bg-accent/10",
    text: "text-accent",
    border: "border-accent/20",
    lightBg: "bg-accent/5 dark:bg-accent/10",
    lightText: "text-accent dark:text-accent",
    dot: "bg-accent",
  },
  fact: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    lightBg: "bg-emerald-50 dark:bg-emerald-500/10",
    lightText: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  decision: {
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-violet-500/20",
    lightBg: "bg-violet-50 dark:bg-violet-500/10",
    lightText: "text-violet-600 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  context: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    lightBg: "bg-amber-50 dark:bg-amber-500/10",
    lightText: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
};

const ITEMS_PER_PAGE = 10;

interface DashboardStats {
  categories: {
    preference: number;
    fact: number;
    decision: number;
    context: number;
    uncategorized: number;
  };
  projects: Array<{ name: string; count: number }>;
  recentMemories: Array<{
    id: string;
    content: string;
    category: string | null;
    project: string;
    createdAt: string;
  }>;
}

function TableSkeleton() {
  return (
    <Card className="overflow-hidden flex-1 min-h-0 flex flex-col">
      <div className="overflow-auto flex-1 scrollbar-hide">
        <table className="w-full min-w-[700px]">
          <thead className="sticky top-0 z-10 bg-surface-elevated border-b border-border">
            <tr>
              <th className="text-center py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider w-12 border-r border-border">
                #
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider w-64 border-r border-border">
                Content
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider w-28 border-r border-border">
                Category
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider w-32 border-r border-border">
                Project
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider w-44 border-r border-border">
                Created
              </th>
              <th className="text-center py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider w-12">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <tr key={i} className="animate-pulse border-b border-border">
                <td className="py-3 w-12 border-r border-border">
                  <div className="h-4 bg-surface-elevated rounded w-6 mx-auto" />
                </td>
                <td className="px-4 py-3 w-64 border-r border-border">
                  <div className="space-y-2">
                    <div className="h-4 bg-surface-elevated rounded w-full" />
                    <div className="h-4 bg-surface-elevated rounded w-3/4" />
                  </div>
                </td>
                <td className="px-4 py-3 w-28 border-r border-border">
                  <div className="h-6 bg-surface-elevated rounded-full w-20" />
                </td>
                <td className="px-4 py-3 w-32 border-r border-border">
                  <div className="h-4 bg-surface-elevated rounded w-24" />
                </td>
                <td className="px-4 py-3 w-44 border-r border-border">
                  <div className="h-4 bg-surface-elevated rounded w-32" />
                </td>
                <td className="py-3 w-12">
                  <div className="h-8 w-8 bg-surface-elevated rounded mx-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function MemoryDetailPanel({
  memory,
  onClose,
  onSuccess,
  onError,
  onDelete,
}: {
  memory: Memory;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onDelete: () => void;
}) {
  // State is initialized from props - component should be keyed by memory.id to reset state
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(memory.content);
  const [editCategory, setEditCategory] = useState(memory.category || "");
  const [editProject, setEditProject] = useState(memory.project || "");
  const [isClosing, setIsClosing] = useState(false);

  const updateMutation = useUpdateMemory();
  const config = memory.category ? categoryConfig[memory.category] : null;

  function handleClose() {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 280);
  }

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
      // Close panel after save so it shows fresh data when reopened
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update memory");
    }
  }

  function handleCancel() {
    setContent(memory.content);
    setEditCategory(memory.category || "");
    setEditProject(memory.project || "");
    setIsEditing(false);
  }

  const hasChanges =
    content !== memory.content ||
    editCategory !== (memory.category || "") ||
    editProject !== (memory.project || "");

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]",
          isClosing ? "animate-backdrop-fade-out" : "animate-backdrop-fade-in",
        )}
        onClick={updateMutation.isPending ? undefined : handleClose}
      />

      {/* Side Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-md bg-background border-l border-border shadow-2xl flex flex-col",
          isClosing ? "animate-panel-slide-out" : "animate-panel-slide-in",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold">Memory Details</h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-1.5 hover:translate-y-0 hover:shadow-none cursor-pointer"
              >
                <PencilSimple className="h-3.5 w-3.5" weight="bold" />
                Edit
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={updateMutation.isPending}
              className="cursor-pointer"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
          {isEditing ? (
            <>
              {/* Edit Mode */}
              <div className="space-y-2">
                <Label htmlFor="content" className="text-foreground-muted">
                  Content
                </Label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  className="flex w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-foreground-subtle resize-none"
                  placeholder="Memory content..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground-muted">Category</Label>
                <CategorySelect
                  value={editCategory}
                  onChange={setEditCategory}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-project" className="text-foreground-muted">
                  Project
                </Label>
                <Input
                  id="edit-project"
                  value={editProject}
                  onChange={(e) => setEditProject(e.target.value)}
                  placeholder="Project name (optional)"
                />
              </div>
            </>
          ) : (
            <>
              {/* View Mode */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground-muted uppercase tracking-wider">
                  <FileText className="h-3.5 w-3.5" />
                  Content
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {memory.content}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-foreground-muted uppercase tracking-wider">
                    <Tag className="h-3.5 w-3.5" />
                    Category
                  </div>
                  {memory.category && config ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                        config.lightBg,
                        config.lightText,
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
                  <div className="flex items-center gap-2 text-xs font-medium text-foreground-muted uppercase tracking-wider">
                    <FolderOpen className="h-3.5 w-3.5" />
                    Project
                  </div>
                  {memory.project ? (
                    <span className="text-sm">{memory.project}</span>
                  ) : (
                    <span className="text-sm text-foreground-subtle flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" />
                      Global
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-foreground-muted uppercase tracking-wider">
                    <Calendar className="h-3.5 w-3.5" />
                    Created
                  </div>
                  <div className="text-sm">
                    <div>{formatDateTime(memory.createdAt).date}</div>
                    <div className="text-foreground-muted">
                      {formatDateTime(memory.createdAt).time}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-foreground-muted uppercase tracking-wider">
                    <Clock className="h-3.5 w-3.5" />
                    Source
                  </div>
                  <span className="text-sm">{memory.source}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 shrink-0">
          {isEditing ? (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="flex-1 hover:translate-y-0 hover:shadow-none cursor-pointer"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 hover:translate-y-0 hover:shadow-none cursor-pointer"
                onClick={handleSave}
                disabled={!hasChanges || updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <SpinnerGap
                      className="h-4 w-4 animate-spin mr-2"
                      weight="bold"
                    />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full text-error hover:bg-error/10 hover:text-error hover:translate-y-0 hover:shadow-none cursor-pointer"
              onClick={onDelete}
            >
              <Trash className="h-4 w-4 mr-2" weight="duotone" />
              Delete Memory
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

function DeleteConfirmDialog({
  onClose,
  onConfirm,
  isDeleting,
}: {
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isDeleting ? undefined : onClose}
      />

      <div className="relative w-full max-w-md bg-background border border-border rounded-xl shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-0">
          <h3 className="text-lg font-semibold">Delete Memory</h3>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-foreground-muted">
            Are you sure you want to delete this memory?
          </p>

          <p className="text-sm font-medium">This action is irreversible.</p>

          {/* Checkbox confirmation */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="peer sr-only"
              />
              <div className="w-5 h-5 rounded-sm border-2 border-foreground-muted peer-checked:bg-foreground peer-checked:border-foreground transition-colors flex items-center justify-center">
                {confirmed && (
                  <Check
                    className="h-3.5 w-3.5 text-background"
                    weight="bold"
                  />
                )}
              </div>
            </div>
            <span className="text-sm text-foreground-muted">
              I understand and confirm
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 pt-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="hover:translate-y-0 hover:shadow-none cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting || !confirmed}
            className="hover:translate-y-0 hover:shadow-none cursor-pointer"
          >
            {isDeleting ? (
              <>
                <SpinnerGap
                  className="h-4 w-4 animate-spin mr-2"
                  weight="bold"
                />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeleteButton({
  onDelete,
  isDeleting,
}: {
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-foreground-muted hover:text-error hover:bg-error/10 cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
      disabled={isDeleting}
    >
      {isDeleting ? (
        <SpinnerGap className="h-4 w-4 animate-spin" weight="bold" />
      ) : (
        <Trash className="h-4 w-4" weight="duotone" />
      )}
    </Button>
  );
}

function CategorySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedCategory = editCategories.find((cat) => cat.value === value);
  const config = value ? categoryConfig[value] : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50",
          "hover:bg-surface-elevated",
        )}
      >
        <span className="flex items-center gap-2">
          {config && (
            <span className={cn("w-2 h-2 rounded-full", config.dot)} />
          )}
          <span className={!value ? "text-foreground-subtle" : ""}>
            {selectedCategory?.label || "Select category"}
          </span>
        </span>
        <CaretDown
          className={cn(
            "h-4 w-4 text-foreground-muted transition-transform",
            open && "rotate-180",
          )}
          weight="bold"
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[70]"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full mt-2 z-[80] w-full bg-background border border-border rounded-xl shadow-lg py-1 animate-scale-in">
            <button
              type="button"
              className={cn(
                "w-full px-4 py-2.5 text-sm text-left hover:bg-surface flex items-center justify-between gap-2 transition-colors",
                !value && "bg-surface",
              )}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              <span className="text-foreground-subtle">No category</span>
              {!value && <Check className="h-4 w-4 text-foreground" />}
            </button>
            {editCategories.map((cat) => {
              const catConfig = categoryConfig[cat.value];
              return (
                <button
                  type="button"
                  key={cat.value}
                  className={cn(
                    "w-full px-4 py-2.5 text-sm text-left hover:bg-surface flex items-center justify-between gap-2 transition-colors",
                    value === cat.value && "bg-surface",
                  )}
                  onClick={() => {
                    onChange(cat.value);
                    setOpen(false);
                  }}
                >
                  <span className="flex items-center gap-2">
                    {catConfig && (
                      <span
                        className={cn("w-2 h-2 rounded-full", catConfig.dot)}
                      />
                    )}
                    {cat.label}
                  </span>
                  {value === cat.value && (
                    <Check className="h-4 w-4 text-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function CategoryFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer",
          value
            ? "text-foreground"
            : "text-foreground-muted hover:text-foreground",
        )}
      >
        Category
        <CaretDown
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
          weight="bold"
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-50 min-w-[140px] bg-surface-elevated border border-border rounded-lg overflow-hidden animate-scale-in">
            {categories.map((cat) => (
              <button
                key={cat.value}
                className={cn(
                  "w-full px-3 py-2.5 text-sm text-left transition-colors cursor-pointer flex items-center gap-2",
                  value === cat.value
                    ? "bg-surface-hover text-foreground"
                    : "text-foreground-muted hover:bg-surface hover:text-foreground",
                )}
                onClick={() => {
                  onChange(cat.value);
                  setOpen(false);
                }}
              >
                {cat.value && categoryConfig[cat.value] && (
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      categoryConfig[cat.value].dot,
                    )}
                  />
                )}
                {cat.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ProjectFilter({
  value,
  onChange,
  projects,
  isLoading,
}: {
  value: string;
  onChange: (value: string) => void;
  projects: Array<{ name: string; count: number }>;
  isLoading: boolean;
}) {
  const [open, setOpen] = useState(false);

  const globalProject = projects.find((p) => p.name === "Global");
  const otherProjects = projects.filter((p) => p.name !== "Global");

  // Build project options list
  const projectOptions = [
    { value: "", label: "All" },
    ...(globalProject ? [{ value: "__global__", label: "Global" }] : []),
    ...otherProjects.map((p) => ({ value: p.name, label: p.name })),
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={isLoading}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer",
          value
            ? "text-foreground"
            : "text-foreground-muted hover:text-foreground",
          isLoading && "opacity-50 !cursor-not-allowed",
        )}
      >
        Project
        <CaretDown
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
          weight="bold"
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-50 min-w-[140px] bg-surface-elevated border border-border rounded-lg overflow-hidden animate-scale-in max-h-64 overflow-y-auto">
            {projectOptions.map((proj) => (
              <button
                key={proj.value}
                className={cn(
                  "w-full px-3 py-2.5 text-sm text-left transition-colors cursor-pointer truncate",
                  value === proj.value
                    ? "bg-surface-hover text-foreground"
                    : "text-foreground-muted hover:bg-surface hover:text-foreground",
                )}
                onClick={() => {
                  onChange(proj.value);
                  setOpen(false);
                }}
              >
                {proj.label}
              </button>
            ))}

            {/* Empty state */}
            {!isLoading && projectOptions.length === 1 && (
              <div className="px-3 py-4 text-sm text-foreground-muted text-center">
                No projects yet
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function MemoriesPage() {
  const [category, setCategory] = useState("");
  const [project, setProject] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [deletingMemory, setDeletingMemory] = useState<Memory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const toast = useToast();
  const queryClient = useQueryClient();
  const offset = page * ITEMS_PER_PAGE;

  // Fetch dashboard stats for project list (reuses cache if already fetched on dashboard)
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get<DashboardStats>("/api/user/dashboard-stats"),
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Convert project filter value for API
  // "__global__" means filter for memories with no project (null)
  const projectFilter = project === "__global__" ? "" : project || undefined;
  // For global filter, we pass empty string which will match null projects
  const isGlobalFilter = project === "__global__";

  const { data, isLoading, error, isFetching } = useQuery(
    memoriesQueryOptions({
      limit: ITEMS_PER_PAGE,
      offset,
      category: category || undefined,
      project: isGlobalFilter ? "__null__" : projectFilter,
      search: search || undefined,
    }),
  );

  const deleteMutation = useDeleteMemory();

  async function handleDelete() {
    if (!deletingMemory) return;
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(deletingMemory.id);
      toast.success("Memory deleted successfully");
      setDeletingMemory(null);
      setSelectedMemory(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete memory",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const totalPages = data ? Math.ceil(data.total / ITEMS_PER_PAGE) : 0;
  const showingFrom = data && data.total > 0 ? offset + 1 : 0;
  const showingTo = data ? Math.min(offset + ITEMS_PER_PAGE, data.total) : 0;

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["memories"] });
  }

  return (
    <div className="h-full flex flex-col animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold tracking-tight">
                Memories
              </span>
              <span className="text-sm -mb-2 text-foreground-muted">
                (
                {data?.total
                  ? `${data.total} memories stored`
                  : "Manage your saved memories"}
                )
              </span>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-2">
          {/* Content Search */}
          <div className="relative w-full sm:w-64">
            <MagnifyingGlass
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-subtle"
              weight="bold"
            />
            <Input
              placeholder="Search memories..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-10 bg-surface border-border"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isFetching}
            className="h-10 w-10 shrink-0 cursor-pointer"
          >
            <ArrowsClockwise
              className={cn("h-4 w-4", isFetching && "animate-spin")}
              weight="bold"
            />
          </Button>
        </div>
      </div>

      {/* Active filters indicator */}
      {(category || search || project) && (
        <div className="flex items-center gap-2 pb-4 shrink-0 flex-wrap">
          <span className="text-sm text-foreground-muted">Filtered by:</span>
          {search && (
            <button
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(0);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors bg-surface-elevated text-foreground hover:opacity-80 cursor-pointer"
            >
              <MagnifyingGlass className="h-3 w-3" weight="bold" />
              &quot;{search}&quot;
              <X className="h-3 w-3 ml-0.5" />
            </button>
          )}
          {project && (
            <button
              onClick={() => {
                setProject("");
                setPage(0);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors bg-surface-elevated text-foreground-muted hover:opacity-80 cursor-pointer"
            >
              {project === "__global__" ? (
                <Globe className="h-3 w-3" />
              ) : (
                <FolderOpen className="h-3 w-3" />
              )}
              {project === "__global__" ? "Global" : project}
              <X className="h-3 w-3 ml-0.5" />
            </button>
          )}
          {category && (
            <button
              onClick={() => {
                setCategory("");
                setPage(0);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer",
                categoryConfig[category]?.lightBg,
                categoryConfig[category]?.lightText,
                "hover:opacity-80",
              )}
            >
              <Tag className="h-3 w-3" />
              {category}
              <X className="h-3 w-3 ml-0.5" />
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <Card className="flex-1">
          <CardContent className="p-8 text-center">
            <div className="text-error mb-2">Failed to load memories</div>
            <p className="text-sm text-foreground-muted">
              Please try again later
            </p>
          </CardContent>
        </Card>
      ) : data?.memories.length === 0 ? (
        <Card className="flex-1">
          <CardContent className="p-16 text-center">
            <Brain className="h-16 w-16 mx-auto text-foreground-subtle mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No memories yet</h3>
            <p className="text-foreground-muted max-w-sm mx-auto">
              Start saving memories through your AI assistant and they&apos;ll
              appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 gap-4">
          {/* Table */}
          <Card className="overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="overflow-auto flex-1 scrollbar-hide">
              <table className="w-full min-w-[700px]">
                <thead className="sticky top-0 z-10 bg-surface-elevated border-b border-border">
                  <tr>
                    <th className="text-center py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider w-12 border-r border-border">
                      #
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider w-64 border-r border-border">
                      Content
                    </th>
                    <th className="text-left px-4 py-3 w-28 border-r border-border">
                      <CategoryFilter
                        value={category}
                        onChange={(val) => {
                          setCategory(val);
                          setPage(0);
                        }}
                      />
                    </th>
                    <th className="text-left px-4 py-3 w-32 border-r border-border">
                      <ProjectFilter
                        value={project}
                        onChange={(val) => {
                          setProject(val);
                          setPage(0);
                        }}
                        projects={dashboardStats?.projects ?? []}
                        isLoading={statsLoading}
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider w-44 border-r border-border">
                      Created
                    </th>
                    <th className="text-center py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider w-12">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.memories.map((memory, index) => {
                    const config = memory.category
                      ? categoryConfig[memory.category]
                      : null;

                    return (
                      <tr
                        key={memory.id}
                        className={cn(
                          "group hover:bg-surface/50 transition-colors cursor-pointer border-b border-border",
                          selectedMemory?.id === memory.id && "bg-surface/50",
                        )}
                        onClick={() => setSelectedMemory(memory)}
                      >
                        {/* Serial Number */}
                        <td className="py-3 text-center text-sm text-foreground-muted font-medium w-12 border-r border-border">
                          {offset + index + 1}
                        </td>

                        {/* Content */}
                        <td className="px-4 py-3 w-64 border-r border-border">
                          <p className="text-sm leading-relaxed line-clamp-2">
                            {memory.content}
                          </p>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3 w-28 border-r border-border">
                          {memory.category && config ? (
                            <span
                              className={cn(
                                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                                config.lightBg,
                                config.lightText,
                              )}
                            >
                              {memory.category}
                            </span>
                          ) : (
                            <span className="text-xs text-foreground-subtle">
                              —
                            </span>
                          )}
                        </td>

                        {/* Project */}
                        <td className="px-4 py-3 w-32 border-r border-border">
                          <span className="text-sm text-foreground-muted truncate block">
                            {memory.project || "Global"}
                          </span>
                        </td>

                        {/* Created */}
                        <td className="px-4 py-3 w-44 border-r border-border">
                          <span className="text-sm text-foreground-muted whitespace-nowrap">
                            {formatDateTime(memory.createdAt).date},{" "}
                            {formatDateTime(memory.createdAt).time}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 w-12">
                          <div className="flex justify-center">
                            <DeleteButton
                              onDelete={() => setDeletingMemory(memory)}
                              isDeleting={
                                isDeleting && deletingMemory?.id === memory.id
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Empty placeholder rows to always show 10 rows */}
                  {data?.memories &&
                    data.memories.length < ITEMS_PER_PAGE &&
                    Array.from({
                      length: ITEMS_PER_PAGE - data.memories.length,
                    }).map((_, index) => (
                      <tr
                        key={`empty-${index}`}
                        className="border-b border-border"
                      >
                        <td className="py-3 w-12 border-r border-border">
                          &nbsp;
                        </td>
                        <td className="px-4 py-3 w-64 border-r border-border">
                          &nbsp;
                        </td>
                        <td className="px-4 py-3 w-28 border-r border-border">
                          &nbsp;
                        </td>
                        <td className="px-4 py-3 w-32 border-r border-border">
                          &nbsp;
                        </td>
                        <td className="px-4 py-3 w-44 border-r border-border">
                          &nbsp;
                        </td>
                        <td className="py-3 w-12">&nbsp;</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {data && data.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
              <p className="text-sm text-foreground-muted order-2 sm:order-1">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {showingFrom}
                </span>
                {" to "}
                <span className="font-medium text-foreground">{showingTo}</span>
                {" of "}
                <span className="font-medium text-foreground">
                  {data.total}
                </span>
              </p>

              <div className="flex items-center gap-1.5 order-1 sm:order-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || isFetching}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                    "bg-surface-elevated border border-border",
                    page === 0 || isFetching
                      ? "opacity-50 !cursor-not-allowed"
                      : "hover:bg-surface-hover hover:border-border-hover",
                  )}
                >
                  <CaretLeft className="h-4 w-4" weight="bold" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                <div className="flex items-center gap-1 bg-surface-elevated border border-border rounded-lg p-1">
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
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        disabled={isFetching}
                        className={cn(
                          "w-8 h-8 rounded-md text-sm font-medium transition-colors cursor-pointer",
                          page === pageNum
                            ? "bg-accent text-white"
                            : "text-foreground-muted hover:text-foreground hover:bg-surface",
                          isFetching && "opacity-50 !cursor-not-allowed",
                        )}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!data.hasMore || isFetching}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                    "bg-surface-elevated border border-border",
                    !data.hasMore || isFetching
                      ? "opacity-50 !cursor-not-allowed"
                      : "hover:bg-surface-hover hover:border-border-hover",
                  )}
                >
                  <span className="hidden sm:inline">Next</span>
                  <CaretRight className="h-4 w-4" weight="bold" />
                </button>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isFetching && !isLoading && (
            <div className="fixed bottom-4 right-4 bg-surface-elevated px-4 py-2 rounded-lg border border-border shadow-lg flex items-center gap-2 animate-fade-in">
              <SpinnerGap className="h-4 w-4 animate-spin" weight="bold" />
              <span className="text-sm">Loading...</span>
            </div>
          )}
        </div>
      )}

      {/* Memory Detail Side Panel */}
      {selectedMemory && (
        <MemoryDetailPanel
          key={selectedMemory.id}
          memory={selectedMemory}
          onClose={() => setSelectedMemory(null)}
          onSuccess={(message) => toast.success(message)}
          onError={(message) => toast.error(message)}
          onDelete={() => setDeletingMemory(selectedMemory)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingMemory && (
        <DeleteConfirmDialog
          onClose={() => setDeletingMemory(null)}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
