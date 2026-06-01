import { env } from "../env.js";

const EXA_CONTENTS_ENDPOINT = "https://api.exa.ai/contents";
const MAX_EXA_CONTENT_CHARS = 250_000;

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

function formatPage(result: ExaContentResult) {
  const title = result.title?.trim() || result.url || result.id || "Untitled";
  const url = result.url || result.id;
  const text = result.text?.trim();
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

export async function scrapeUrlWithExa(params: {
  url: string;
  crawlSubpages?: boolean;
  subpageTarget?: string[];
}) {
  if (!env.EXA_API_KEY) {
    throw new Error("EXA_API_KEY is required for URL scraping");
  }

  const response = await fetch(EXA_CONTENTS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.EXA_API_KEY,
    },
    body: JSON.stringify({
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
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Exa scraping failed (${response.status})${errorText ? `: ${errorText}` : ""}`,
    );
  }

  const payload = (await response.json()) as ExaContentsResponse;
  const failedStatus = payload.statuses?.find((status) => {
    const statusText = status.status?.toLowerCase() ?? "";
    return (
      status.error ||
      statusText.includes("error") ||
      statusText.includes("fail") ||
      statusText.includes("timeout")
    );
  });
  if (failedStatus) {
    const error =
      typeof failedStatus.error === "object"
        ? (failedStatus.error.message ?? failedStatus.error.tag)
        : failedStatus.error;
    throw new Error(`Exa could not scrape URL${error ? `: ${error}` : ""}`);
  }

  const results = payload.results ?? [];
  return {
    content: collectMarkdown(results),
    resolvedUrl: results[0]?.url ?? params.url,
    title: results[0]?.title,
    requestId: payload.requestId,
    statuses: payload.statuses ?? [],
    pageCount:
      results.length +
      results.reduce(
        (count, result) => count + (result.subpages?.length ?? 0),
        0,
      ),
  };
}
