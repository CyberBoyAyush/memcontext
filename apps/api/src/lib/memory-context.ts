// Pure helpers for cross-app context: transcript chunking, handoff detection, context rendering.
import type { TranscriptMessage } from "@memcontext/types";
import { redactSecrets } from "./redact.js";

export const TRANSCRIPT_CHUNK_CHARS = 6000;
export const MAX_MESSAGE_CHARS = 8000;
export const DEFAULT_CONTEXT_TOKENS = 600;

const HANDOFF_PREFIX = /^\s*(?:in[\s-]?progress|wip|handoff)\s*[:\-–—]\s*/i;

/** "In progress: …" / "WIP: …" / "Handoff: …" notes become the project's handoff. */
export function isHandoffContent(content: string): boolean {
  return HANDOFF_PREFIX.test(content);
}

export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

export interface TranscriptChunks {
  chunks: string[];
  redacted: number;
  heldBack: boolean;
}

/**
 * Turn chat messages into redacted, fixed-boundary chunks. Boundaries depend only on earlier
 * messages, so re-sending a growing transcript reproduces the same leading chunks (idempotent).
 * With final=false the trailing partial chunk is held back until more messages arrive.
 */
export function chunkTranscript(
  messages: TranscriptMessage[],
  options: { final: boolean; chunkChars?: number },
): TranscriptChunks {
  const target = options.chunkChars ?? TRANSCRIPT_CHUNK_CHARS;
  let redacted = 0;
  const lines: string[] = [];
  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") continue;
    const body = message.content.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!body) continue;
    const r = redactSecrets(body);
    redacted += r.count;
    lines.push(`${message.role === "user" ? "USER" : "ASSISTANT"}: ${r.text}`);
  }

  const chunks: string[] = [];
  let current: string[] = [];
  let size = 0;
  for (const line of lines) {
    if (size > 0 && size + line.length > target) {
      chunks.push(current.join("\n\n"));
      current = [];
      size = 0;
    }
    current.push(line);
    size += line.length + 2;
  }
  let heldBack = false;
  if (current.length) {
    if (options.final || size >= target) chunks.push(current.join("\n\n"));
    else heldBack = true;
  }
  return { chunks, redacted, heldBack };
}

export interface ContextLine {
  content: string;
  createdAt: Date;
  client?: string;
  previous?: Array<{ content: string; createdAt: Date }>;
}

const day = (d: Date) => new Date(d).toISOString().slice(0, 10);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function renderLine(line: ContextLine): string {
  let text = `- ${line.content} (${day(line.createdAt)}${line.client ? `, via ${line.client}` : ""})`;
  if (line.previous?.length) {
    text += ` · before: ${line.previous
      .slice(0, 2)
      .map((p) => `${clip(p.content, 90)} (${day(p.createdAt)})`)
      .join(" → ")}`;
  }
  return text;
}

/** Pack sections into a token budget. Sections are filled in order; whole lines only. */
export function renderContext(
  sections: Array<{ title: string; lines: ContextLine[] }>,
  maxTokens: number,
): { text: string; tokens: number; included: number } {
  const header =
    "Memory from the user's other AI apps (newest first; \"before:\" lists what changed). If something you need is missing, search memory before saying you don't know.";
  let used = estimateTokens(header) + 12;
  let included = 0;
  const parts: string[] = [];
  for (const section of sections) {
    const kept: string[] = [];
    for (const line of section.lines) {
      const rendered = renderLine(line);
      const cost = estimateTokens(rendered) + (kept.length === 0 ? estimateTokens(section.title) + 1 : 0);
      if (used + cost > maxTokens) continue;
      kept.push(rendered);
      used += cost;
      included++;
    }
    if (kept.length) parts.push(`## ${section.title}\n${kept.join("\n")}`);
  }
  const text = `<memcontext>\n${header}\n\n${parts.length ? parts.join("\n\n") : "(no relevant memory yet)"}\n</memcontext>`;
  return { text, tokens: estimateTokens(text), included };
}
