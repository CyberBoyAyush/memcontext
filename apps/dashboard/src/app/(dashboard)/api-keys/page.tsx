"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Key,
  Plus,
  Trash2,
  Loader2,
  Copy,
  Check,
  Eye,
  EyeOff,
  X,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { IoRefresh } from "react-icons/io5";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  apiKeysQueryOptions,
  useCreateApiKey,
  useDeleteApiKey,
  type CreateApiKeyResponse,
  type ApiKey,
} from "@/lib/queries/api-keys";
import { formatDateTime, cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

function TableSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-elevated/95 dark:bg-surface-elevated">
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider w-12">
                #
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider w-44">
                Name
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider hidden sm:table-cell w-32">
                Key
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider hidden md:table-cell w-44">
                Created
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider hidden lg:table-cell w-44">
                Last Used
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider w-14">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <tr key={i} className="animate-pulse">
                <td className="px-4 py-3 w-12">
                  <div className="h-4 bg-surface-elevated rounded w-5" />
                </td>
                <td className="px-4 py-3 w-44">
                  <div className="h-5 bg-surface-elevated rounded w-28" />
                </td>
                <td className="px-4 py-3 hidden sm:table-cell w-32">
                  <div className="h-5 bg-surface-elevated rounded w-20" />
                </td>
                <td className="px-4 py-3 hidden md:table-cell w-44">
                  <div className="h-4 bg-surface-elevated rounded w-32" />
                </td>
                <td className="px-4 py-3 hidden lg:table-cell w-44">
                  <div className="h-4 bg-surface-elevated rounded w-32" />
                </td>
                <td className="px-4 py-3 text-right w-14">
                  <div className="h-8 w-8 bg-surface-elevated rounded ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CreateKeyModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (result: CreateApiKeyResponse) => void;
}) {
  const [keyName, setKeyName] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const createMutation = useCreateApiKey();
  const toast = useToast();

  function handleClose() {
    setIsClosing(true);
    setTimeout(onClose, 200);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyName.trim()) return;

    try {
      const result = await createMutation.mutateAsync(keyName.trim());
      toast.success("API key created successfully");
      onSuccess(result);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create API key",
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={cn(
          "absolute inset-0 bg-black/10 backdrop-blur-[2px]",
          isClosing ? "animate-backdrop-fade-out" : "animate-backdrop-fade-in",
        )}
        onClick={createMutation.isPending ? undefined : handleClose}
      />

      <div
        className={cn(
          "relative w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl",
          isClosing ? "animate-scale-out" : "animate-scale-in",
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-elevated">
              <Key className="h-5 w-5 text-foreground-muted" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Create API Key</h2>
              <p className="text-sm text-foreground-muted">
                Name your key to identify it later
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            disabled={createMutation.isPending}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keyName">Key Name</Label>
              <Input
                id="keyName"
                placeholder="e.g., Claude Desktop, Cursor, VS Code"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                disabled={createMutation.isPending}
                autoFocus
              />
              <p className="text-xs text-foreground-subtle">
                Choose a descriptive name to remember where this key is used
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 border-t border-border bg-surface/50 rounded-b-2xl">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createMutation.isPending || !keyName.trim()}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Key
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewKeyModal({
  keyData,
  onClose,
}: {
  keyData: CreateApiKeyResponse;
  onClose: () => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const toast = useToast();

  function handleClose() {
    setIsClosing(true);
    setTimeout(onClose, 200);
  }

  async function copyKey() {
    await navigator.clipboard.writeText(keyData.key);
    setCopied(true);
    toast.success("API key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={cn(
          "absolute inset-0 bg-black/10 backdrop-blur-[2px]",
          isClosing ? "animate-backdrop-fade-out" : "animate-backdrop-fade-in",
        )}
      />

      <div
        className={cn(
          "relative w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl",
          isClosing ? "animate-scale-out" : "animate-scale-in",
        )}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-full bg-success/10">
            <Check className="h-7 w-7 text-success" />
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold">API Key Created</h3>
            <p className="text-sm text-foreground-muted">
              Your new API key{" "}
              <span className="font-medium text-foreground">
                {keyData.name}
              </span>{" "}
              has been created.
              <br />
              <span className="text-warning">
                Copy it now — you won&apos;t be able to see it again.
              </span>
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-surface border border-border">
              <code className="flex-1 font-mono text-sm break-all">
                {showKey ? keyData.key : "mc_" + "•".repeat(40)}
              </code>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={copyKey}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClose}
              >
                Done
              </Button>
              <Button className="flex-1" onClick={copyKey}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy API Key
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmDialog({
  apiKey,
  onClose,
  onConfirm,
  isDeleting,
}: {
  apiKey: ApiKey;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isDeleting ? undefined : onClose}
      />

      <div className="relative w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl animate-scale-in">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-red-500/10">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Revoke API Key</h3>
            <p className="text-sm text-foreground-muted">
              Are you sure you want to revoke this API key? Any applications
              using this key will immediately lose access.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-surface border border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-elevated">
                <Key className="h-4 w-4 text-foreground-muted" />
              </div>
              <div>
                <p className="font-medium text-sm">{apiKey.name}</p>
                <p className="text-xs text-foreground-muted font-mono">
                  {apiKey.keyPrefix}...
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 border-t border-border bg-surface/50 rounded-b-2xl">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Revoking...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Revoke Key
              </>
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
      className="h-8 w-8 text-foreground-muted hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10"
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
      disabled={isDeleting}
    >
      {isDeleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}

export default function ApiKeysPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState<CreateApiKeyResponse | null>(
    null,
  );
  const [deletingKey, setDeletingKey] = useState<ApiKey | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, error, isFetching } = useQuery(
    apiKeysQueryOptions(),
  );
  const deleteMutation = useDeleteApiKey();

  async function handleDelete() {
    if (!deletingKey) return;
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(deletingKey.id);
      toast.success("API key revoked successfully");
      setDeletingKey(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to revoke API key",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["api-keys"] });
  }

  function handleCreateSuccess(result: CreateApiKeyResponse) {
    setShowCreateModal(false);
    setNewKeyData(result);
  }

  const keyCount = data?.keys.length ?? 0;

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 flex-shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-elevated">
              <Shield className="h-5 w-5 text-foreground-muted" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
              <p className="text-sm text-foreground-muted">
                {keyCount > 0
                  ? `${keyCount} active key${keyCount !== 1 ? "s" : ""}`
                  : "Manage your API keys for MCP integration"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isFetching}
            className="h-10 w-10"
          >
            <IoRefresh
              className={cn("h-4 w-4", isFetching && "animate-spin")}
            />
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Key</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <Card className="flex-1">
          <CardContent className="p-8 text-center">
            <div className="text-error mb-2">Failed to load API keys</div>
            <p className="text-sm text-foreground-muted">
              Please try again later
            </p>
          </CardContent>
        </Card>
      ) : data?.keys.length === 0 ? (
        <Card className="flex-1">
          <CardContent className="p-16 text-center">
            <Key className="h-16 w-16 mx-auto text-foreground-subtle mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No API keys yet</h3>
            <p className="text-foreground-muted max-w-sm mx-auto mb-6">
              Create an API key to start using MemContext with Claude Desktop,
              Cursor, or other AI assistants
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create your first key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-elevated/95 dark:bg-surface-elevated">
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider w-12">
                    #
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider w-44">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider hidden sm:table-cell w-32">
                    Key
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider hidden md:table-cell w-44">
                    Created
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider hidden lg:table-cell w-44">
                    Last Used
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider w-14">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.keys.map((key, index) => (
                  <tr
                    key={key.id}
                    className="hover:bg-surface/50 transition-colors"
                  >
                    {/* Serial Number */}
                    <td className="px-4 py-3 text-sm text-foreground-muted font-medium w-12">
                      {index + 1}
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3 w-44">
                      <p className="font-medium truncate">{key.name}</p>
                      <p className="text-xs text-foreground-muted font-mono sm:hidden">
                        {key.keyPrefix}...
                      </p>
                    </td>

                    {/* Key Prefix */}
                    <td className="px-4 py-3 hidden sm:table-cell w-32">
                      <code className="px-2 py-1 rounded-md bg-surface-elevated text-xs font-mono text-foreground-muted">
                        {key.keyPrefix}...
                      </code>
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 hidden md:table-cell w-44">
                      <span className="text-sm text-foreground">
                        {formatDateTime(key.createdAt).date},{" "}
                        {formatDateTime(key.createdAt).time}
                      </span>
                    </td>

                    {/* Last Used */}
                    <td className="px-4 py-3 hidden lg:table-cell w-44">
                      {key.lastUsedAt ? (
                        <span className="text-sm text-foreground">
                          {formatDateTime(key.lastUsedAt).date},{" "}
                          {formatDateTime(key.lastUsedAt).time}
                        </span>
                      ) : (
                        <span className="text-sm text-foreground-subtle">
                          Never used
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right w-14">
                      <DeleteButton
                        onDelete={() => setDeletingKey(key)}
                        isDeleting={isDeleting && deletingKey?.id === key.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Info Card */}
      {/* {data && data.keys.length > 0 && (
        <div className="mt-4 p-4 rounded-xl bg-surface border border-border flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 flex-shrink-0">
              <Shield className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-foreground">Security Tip</p>
              <p className="text-foreground-muted mt-0.5">
                Keep your API keys secure. Never share them in public
                repositories or client-side code. Rotate keys periodically and
                revoke any that may have been compromised.
              </p>
            </div>
          </div>
        </div>
      )} */}

      {/* Loading indicator */}
      {isFetching && !isLoading && (
        <div className="fixed bottom-4 right-4 bg-surface-elevated px-4 py-2 rounded-lg border border-border shadow-lg flex items-center gap-2 animate-fade-in">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Refreshing...</span>
        </div>
      )}

      {/* Create Key Modal */}
      {showCreateModal && (
        <CreateKeyModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* New Key Display Modal */}
      {newKeyData && (
        <NewKeyModal keyData={newKeyData} onClose={() => setNewKeyData(null)} />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingKey && (
        <DeleteConfirmDialog
          apiKey={deletingKey}
          onClose={() => setDeletingKey(null)}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
