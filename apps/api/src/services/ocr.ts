import { Buffer } from "node:buffer";
import { env } from "../env.js";

const MISTRAL_OCR_ENDPOINT = "https://api.mistral.ai/v1/ocr";

type OcrDocumentType = "document_url" | "image_url";

interface MistralOcrPage {
  index?: number;
  markdown?: string;
}

interface MistralOcrResponse {
  model?: string;
  pages?: MistralOcrPage[];
}

function getDataUrl(bytes: Uint8Array, mimeType: string) {
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

function getOcrDocument(params: {
  bytes?: Uint8Array;
  mimeType: string;
  publicUrl?: string | null;
}) {
  const url =
    params.publicUrl ??
    (params.bytes ? getDataUrl(params.bytes, params.mimeType) : null);
  if (!url) {
    throw new Error("OCR requires a public URL or file bytes");
  }

  const isImage = params.mimeType.startsWith("image/");
  const type: OcrDocumentType = isImage ? "image_url" : "document_url";
  return isImage
    ? { type, image_url: url }
    : { type, document_url: url };
}

function extractMarkdown(response: MistralOcrResponse) {
  const pages = response.pages ?? [];
  const markdown = pages
    .map((page, index) => {
      const content = page.markdown?.trim();
      if (!content) return "";
      return `<!-- Page ${page.index ?? index + 1} -->\n${content}`;
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();

  if (!markdown) {
    throw new Error("Mistral OCR returned no extractable text");
  }

  return {
    markdown,
    pageCount: pages.length,
    model: response.model ?? env.MISTRAL_OCR_MODEL,
  };
}

export async function extractDocumentWithOcr(params: {
  bytes?: Uint8Array;
  mimeType: string;
  publicUrl?: string | null;
}) {
  if (!env.MISTRAL_API_KEY) {
    throw new Error("MISTRAL_API_KEY is required for OCR document extraction");
  }

  const response = await fetch(MISTRAL_OCR_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.MISTRAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.MISTRAL_OCR_MODEL,
      document: getOcrDocument(params),
      table_format: "markdown",
      // We only need extracted text/markdown, never the images. Setting
      // image_limit to 0 tells Mistral to skip image extraction entirely.
      // This is required for .docx files: with images present and
      // include_image_base64 disabled, Mistral returns a 400 (code 3051)
      // unless image_limit is 0.
      include_image_base64: false,
      image_limit: 0,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Mistral OCR failed (${response.status})${errorText ? `: ${errorText}` : ""}`,
    );
  }

  const payload = (await response.json()) as MistralOcrResponse;
  return extractMarkdown(payload);
}
