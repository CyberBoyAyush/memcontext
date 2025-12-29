"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Key,
  Plus,
  Trash2,
  Loader2,
  Copy,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  apiKeysQueryOptions,
  useCreateApiKey,
  useDeleteApiKey,
  type CreateApiKeyResponse,
} from "@/lib/queries/api-keys";
import { formatRelativeTime } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

export default function ApiKeysPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newKey, setNewKey] = useState<CreateApiKeyResponse | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const toast = useToast();
  const { data, isLoading, error } = useQuery(apiKeysQueryOptions());
  const createMutation = useCreateApiKey();
  const deleteMutation = useDeleteApiKey();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!keyName.trim()) return;

    try {
      const result = await createMutation.mutateAsync(keyName.trim());
      setNewKey(result);
      setKeyName("");
      setShowCreateForm(false);
      toast.success("API key created successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create API key",
      );
    }
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        "Are you sure you want to delete this API key? This action cannot be undone.",
      )
    )
      return;
    setDeleteId(id);
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("API key deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete API key",
      );
    } finally {
      setDeleteId(null);
    }
  }

  async function copyKey() {
    if (!newKey?.key) return;
    await navigator.clipboard.writeText(newKey.key);
    setCopied(true);
    toast.success("API key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-foreground-muted mt-1">
            Manage your API keys for MCP integration
          </p>
        </div>
        {!showCreateForm && !newKey && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4" />
            Create Key
          </Button>
        )}
      </div>

      {/* New key display */}
      {newKey && (
        <Card className="border-success/50 bg-success/5">
          <CardHeader>
            <CardTitle className="text-success flex items-center gap-2">
              <Check className="h-5 w-5" />
              API Key Created
            </CardTitle>
            <CardDescription>
              Copy your API key now. You won&apos;t be able to see it again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 rounded-lg bg-surface border border-border font-mono text-sm overflow-x-auto">
                {showKey ? newKey.key : "•".repeat(40)}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <Button variant="outline" size="icon" onClick={copyKey}>
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setNewKey(null);
                setShowKey(false);
              }}
            >
              Done
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create API Key</CardTitle>
            <CardDescription>
              Give your API key a name to identify it later
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="keyName" className="sr-only">
                  Key Name
                </Label>
                <Input
                  id="keyName"
                  placeholder="e.g., Claude Desktop, Cursor"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  disabled={createMutation.isPending}
                />
              </div>
              <Button
                type="submit"
                disabled={createMutation.isPending || !keyName.trim()}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setKeyName("");
                }}
              >
                Cancel
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* API Keys list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-foreground-muted" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-center text-error">
            Failed to load API keys. Please try again.
          </CardContent>
        </Card>
      ) : data?.keys.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Key className="h-12 w-12 mx-auto text-foreground-subtle mb-4" />
            <h3 className="text-lg font-medium mb-2">No API keys yet</h3>
            <p className="text-foreground-muted mb-4">
              Create an API key to start using MemContext with your AI assistant
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4" />
              Create your first key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data?.keys.map((key) => (
            <Card
              key={key.id}
              className="hover:bg-surface-elevated/50 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="p-2 rounded-lg bg-surface-elevated">
                      <Key className="h-5 w-5 text-foreground-muted" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{key.name}</p>
                      <div className="flex items-center gap-2 text-sm text-foreground-muted">
                        <code className="font-mono">{key.keyPrefix}...</code>
                        <span>•</span>
                        <span>Created {formatRelativeTime(key.createdAt)}</span>
                        {key.lastUsedAt && (
                          <>
                            <span>•</span>
                            <span>
                              Last used {formatRelativeTime(key.lastUsedAt)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-foreground-subtle hover:text-error"
                    onClick={() => handleDelete(key.id)}
                    disabled={deleteId === key.id}
                  >
                    {deleteId === key.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
