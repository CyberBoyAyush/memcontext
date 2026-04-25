export function normalizeProjectName(
  project: string | undefined | null,
): string | undefined {
  if (!project || typeof project !== "string") {
    return undefined;
  }

  const normalized = project
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .replace(/[^a-z0-9]/g, "");

  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeScope(
  scope: string | undefined | null,
): string | undefined {
  if (!scope || typeof scope !== "string") {
    return undefined;
  }

  const normalized = scope.trim();

  return normalized.length > 0 ? normalized : undefined;
}
