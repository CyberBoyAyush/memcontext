import { env } from "../env.js";

const EXA_CONTENTS_ENDPOINT = "https://api.exa.ai/contents";
const MAX_EXA_CONTENT_CHARS = 250_000;
const DEFAULT_PRIORITY_PAGE_LIMIT = 15;
const MAX_PRIORITY_PAGE_LIMIT = 25;
const EXA_CONTENTS_BATCH_SIZE = 10;

interface ExaContentResult {
  title?: string;
  url?: string;
  id?: string;
  text?: string;
  subpages?: ExaContentResult[];
}

interface ExaContentsResponse {
  results?: ExaContentResult[];
  requestId?: string;
  statuses?: Array<{
    id?: string;
    url?: string;
    status?: string;
    error?:
      | string
      | { tag?: string; message?: string; httpStatusCode?: number };
  }>;
}

interface ExaDocsIndexEntry {
  title: string;
  url: string;
  description?: string;
  score: number;
}

interface ExaScrapeMetadata {
  requestId?: string;
  statuses: ExaContentsResponse["statuses"];
  pageCount: number;
  crawlMode: "single" | "subpages" | "docs-priority";
  discoveredPageCount?: number;
  selectedPageCount?: number;
  failedPageCount?: number;
  selectedPages?: Array<{
    title: string;
    url: string;
    score: number;
  }>;
}

function clampPriorityPageLimit(value?: number) {
  if (!Number.isFinite(value)) return DEFAULT_PRIORITY_PAGE_LIMIT;
  return Math.min(
    MAX_PRIORITY_PAGE_LIMIT,
    Math.max(1, Math.floor(value as number)),
  );
}

function getLlmsTxtUrls(url: string) {
  try {
    const parsed = new URL(url);
    const candidates = new Set<string>();
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      candidates.add(`${parsed.origin}/${pathParts[0]}/llms.txt`);
    }
    candidates.add(`${parsed.origin}/llms.txt`);
    return Array.from(candidates);
  } catch {
    return [];
  }
}

function normalizeDocsMarkdown(content: string) {
  return content
    .replace(
      /^> ## Documentation Index\n>\s*\n> Fetch the complete documentation index[^\n]*\n>\s*\n> Use this file to discover all available pages before exploring further\.\n?/gim,
      "",
    )
    .replace(/^> ## Documentation Index[\s\S]*?^# /gim, "# ")
    .trim();
}

function formatPage(result: ExaContentResult) {
  const title = result.title?.trim() || result.url || result.id || "Untitled";
  const url = result.url || result.id;
  const text = result.text ? normalizeDocsMarkdown(result.text) : undefined;
  if (!text) return "";
  return [`# ${title}`, url ? `Source: ${url}` : undefined, "", text]
    .filter((value) => value !== undefined)
    .join("\n");
}

function collectMarkdown(results: ExaContentResult[]) {
  const pages = results.flatMap((result) => [
    result,
    ...(result.subpages ?? []),
  ]);
  const markdown = pages.map(formatPage).filter(Boolean).join("\n\n---\n\n");
  if (!markdown.trim()) {
    throw new Error("Exa returned no extractable content");
  }
  return markdown.slice(0, MAX_EXA_CONTENT_CHARS);
}

function parseLlmsTxt(content: string, baseUrl: string): ExaDocsIndexEntry[] {
  const base = new URL(baseUrl);
  const entries: ExaDocsIndexEntry[] = [];
  const linkPattern = /^- \[([^\]]+)\]\(([^)\s]+)\)(?::\s*(.*))?$/gm;
  for (const match of content.matchAll(linkPattern)) {
    const url = new URL(match[2].trim(), base);
    if (url.protocol !== "http:" && url.protocol !== "https:") continue;
    if (url.origin !== base.origin) continue;
    entries.push({
      title: match[1].trim(),
      url: url.toString(),
      description: match[3]?.trim(),
      score: 0,
    });
  }

  return entries;
}

function scoreDocsIndexEntry(entry: ExaDocsIndexEntry) {
  const value =
    `${entry.title} ${entry.url} ${entry.description ?? ""}`.toLowerCase();
  let score = 0;
  const add = (points: number, terms: string[]) => {
    if (terms.some((term) => value.includes(term))) score += points;
  };

  add(45, [
    "quickstart",
    "introduction",
    "overview",
    "getting-started",
    "getting started",
  ]);
  add(40, ["authentication", "api reference", "developers", "openapi"]);
  add(35, [
    "search",
    "save",
    "add document",
    "ingest",
    "memory operations",
    "document operations",
  ]);
  add(30, ["mcp", "sdk", "webhook", "webhooks"]);
  add(25, ["create", "list", "update", "delete"]);
  add(20, [
    "concept",
    "how-it-works",
    "hybrid",
    "scope",
    "project",
    "versioning",
    "filtering",
  ]);
  add(15, ["complete", "reference", "developer", "guide"]);

  if (entry.url.includes("/api-reference/")) score += 12;
  if (entry.url.endsWith(".md")) score += 4;
  if (!entry.description) score -= 8;
  if (
    /\b(delete|forget|remove)\b/.test(value) &&
    !/\b(overview|reference|operations)\b/.test(value)
  ) {
    score -= 8;
  }

  return score;
}

async function requestExaContents(body: Record<string, unknown>) {
  const response = await fetch(EXA_CONTENTS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.EXA_API_KEY ?? "",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Exa scraping failed (${response.status})${errorText ? `: ${errorText}` : ""}`,
    );
  }

  return (await response.json()) as ExaContentsResponse;
}

function getFailedStatus(statuses?: ExaContentsResponse["statuses"]) {
  return statuses?.find((status) => {
    const statusText = status.status?.toLowerCase() ?? "";
    return (
      status.error ||
      statusText.includes("error") ||
      statusText.includes("fail") ||
      statusText.includes("timeout")
    );
  });
}

function formatExaFailure(
  status: NonNullable<ExaContentsResponse["statuses"]>[number],
) {
  const error =
    typeof status.error === "object"
      ? (status.error.message ?? status.error.tag)
      : status.error;
  return `Exa could not scrape URL${error ? `: ${error}` : ""}`;
}

async function scrapeDocsPriorityWithExa(params: {
  url: string;
  priorityPageLimit?: number;
}) {
  let indexPayload: ExaContentsResponse | null = null;
  let entries: ExaDocsIndexEntry[] = [];

  for (const llmsTxtUrl of getLlmsTxtUrls(params.url)) {
    const candidatePayload = await requestExaContents({
      urls: [llmsTxtUrl],
      text: {
        maxCharacters: 50_000,
        includeHtmlTags: false,
        excludeSections: ["navigation", "footer", "sidebar", "metadata"],
      },
      maxAgeHours: 24,
      livecrawlTimeout: 15_000,
    });
    const indexText = candidatePayload.results?.[0]?.text?.trim();
    if (!indexText) continue;
    const candidateEntries = parseLlmsTxt(indexText, llmsTxtUrl)
      .map((entry) => ({ ...entry, score: scoreDocsIndexEntry(entry) }))
      .sort((left, right) => right.score - left.score);
    if (candidateEntries.length === 0) continue;
    indexPayload = candidatePayload;
    entries = candidateEntries;
    break;
  }

  if (!indexPayload || entries.length === 0) return null;

  const selected = entries.slice(
    0,
    clampPriorityPageLimit(params.priorityPageLimit),
  );
  const results: ExaContentResult[] = [];
  const statuses: ExaContentsResponse["statuses"] = [
    ...(indexPayload.statuses ?? []),
  ];
  const requestIds = [indexPayload.requestId].filter(Boolean);

  for (
    let index = 0;
    index < selected.length;
    index += EXA_CONTENTS_BATCH_SIZE
  ) {
    const batch = selected.slice(index, index + EXA_CONTENTS_BATCH_SIZE);
    const payload = await requestExaContents({
      urls: batch.map((entry) => entry.url),
      text: {
        maxCharacters: 15_000,
        includeHtmlTags: false,
        excludeSections: ["navigation", "footer", "sidebar", "metadata"],
      },
      maxAgeHours: 24,
      livecrawlTimeout: 15_000,
    });
    results.push(...(payload.results ?? []));
    statuses.push(...(payload.statuses ?? []));
    if (payload.requestId) requestIds.push(payload.requestId);
  }

  if (results.length === 0) return null;

  let content: string;
  try {
    content = collectMarkdown(results);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Exa returned no extractable content"
    ) {
      return null;
    }
    throw error;
  }

  return {
    content,
    resolvedUrl: params.url,
    title: results[0]?.title,
    requestId: requestIds.join(","),
    statuses,
    pageCount: results.length,
    crawlMode: "docs-priority" as const,
    discoveredPageCount: entries.length,
    selectedPageCount: selected.length,
    failedPageCount: Math.max(0, selected.length - results.length),
    selectedPages: selected.map((entry) => ({
      title: entry.title,
      url: entry.url,
      score: entry.score,
    })),
  };
}

export async function scrapeUrlWithExa(params: {
  url: string;
  crawlSubpages?: boolean;
  subpageTarget?: string[];
  priorityPageLimit?: number;
}) {
  if (!env.EXA_API_KEY) {
    throw new Error("EXA_API_KEY is required for URL scraping");
  }

  if (params.crawlSubpages) {
    const docsPriority = await scrapeDocsPriorityWithExa({
      url: params.url,
      priorityPageLimit: params.priorityPageLimit,
    });
    if (docsPriority) return docsPriority;
  }

  const payload = await requestExaContents({
    urls: [params.url],
    text: {
      maxCharacters: 20_000,
      includeHtmlTags: false,
      excludeSections: ["navigation", "footer", "sidebar", "metadata"],
    },
    subpages: params.crawlSubpages ? 10 : 0,
    subpageTarget:
      params.subpageTarget && params.subpageTarget.length > 0
        ? params.subpageTarget
        : params.crawlSubpages
          ? ["docs", "documentation", "guide", "api", "reference"]
          : undefined,
    maxAgeHours: 24,
    livecrawlTimeout: 15_000,
  });

  const failedStatus = getFailedStatus(payload.statuses);
  if (failedStatus) {
    throw new Error(formatExaFailure(failedStatus));
  }

  const results = payload.results ?? [];
  const pageCount =
    results.length +
    results.reduce(
      (count, result) => count + (result.subpages?.length ?? 0),
      0,
    );
  const metadata: ExaScrapeMetadata = {
    requestId: payload.requestId,
    statuses: payload.statuses ?? [],
    pageCount,
    crawlMode: params.crawlSubpages ? "subpages" : "single",
  };

  return {
    content: collectMarkdown(results),
    resolvedUrl: results[0]?.url ?? params.url,
    title: results[0]?.title,
    ...metadata,
  };
}
