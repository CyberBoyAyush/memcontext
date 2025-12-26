export function normalizeProjectName(
  project: string | undefined | null,
): string | undefined {
  if (!project || typeof project !== "string") {
    return undefined;
  }

  const normalized = project
    .toLowerCase()
    .replace(/[\s\-_]+/g, "")
    .replace(/[^a-z0-9]/g, "");

  return normalized.length > 0 ? normalized : undefined;
}
