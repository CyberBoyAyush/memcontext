// Pure helpers for cross-app context: transcript chunking, handoff detection, context rendering.
import type { TranscriptMessage } from "@memcontext/types";
import { redactSecrets } from "./redact.js";

export const TRANSCRIPT_CHUNK_CHARS = 6000;
export const MAX_MESSAGE_CHARS = 8000;
export const DEFAULT_CONTEXT_TOKENS = 600;
const CARRY_LINES = 2;
const CARRY_CHARS = 600;

const HANDOFF_PREFIX = /^\s*(?:in[\s-]?progress|wip|handoff)\s*[:\-–—]\s*/i;

/** "In progress: …" / "WIP: …" / "Handoff: …" notes become the project's handoff. */
export function isHandoffContent(content: string): boolean {
  return HANDOFF_PREFIX.test(content);
}

/** True for a real calendar day in YYYY-MM-DD form (rejects 2026-00-01, 2026-02-30). */
export function isValidDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const parsed = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day;
}

export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

export interface TranscriptChunks {
  chunks: string[];
  /** Day (YYYY-MM-DD) of each chunk, when messages carry `at`. A chunk never spans two days. */
  days: Array<string | undefined>;
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
  const lines: Array<{ text: string; day?: string }> = [];
  let lastDay: string | undefined;
  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") continue;
    const body = message.content.trim();
    if (!body) continue;
    // Redact the whole message first so a cut can never split a secret or a <private> span.
    const r = redactSecrets(body);
    redacted += r.count;
    if (message.at && !Number.isNaN(Date.parse(message.at))) {
      lastDay = new Date(message.at).toISOString().slice(0, 10);
    }
    const label = message.role === "user" ? "USER" : "ASSISTANT";
    // Long messages become several lines instead of being truncated.
    for (let i = 0; i < r.text.length; i += MAX_MESSAGE_CHARS) {
      lines.push({ text: `${label}: ${r.text.slice(i, i + MAX_MESSAGE_CHARS)}`, day: lastDay });
    }
  }

  // A new day starts a new chunk, so every fact has one unambiguous day for supersession.
  // The last turns of the previous day ride along as context (e.g. a question asked before midnight).
  const chunks: string[] = [];
  const days: Array<string | undefined> = [];
  let current: string[] = [];
  let raw: string[] = [];
  let carry: string[] = [];
  let carryDay: string | undefined;
  let currentDay: string | undefined;
  let size = 0;
  for (const line of lines) {
    const newDay = line.day !== currentDay;
    if (size > 0 && (size + line.text.length > target || newDay)) {
      chunks.push(current.join("\n\n"));
      days.push(currentDay);
      carry = newDay ? raw.slice(-CARRY_LINES).map((l) => l.slice(0, CARRY_CHARS)) : [];
      carryDay = currentDay;
      current = [];
      raw = [];
      size = 0;
    }
    if (current.length === 0) {
      currentDay = line.day;
      if (carry.length) {
        // Keep the earlier day so "tomorrow" in a copied turn resolves against that day.
        const context = `[earlier${carryDay ? ` ${carryDay}` : ""}, context only]\n${carry.join("\n\n")}`;
        current.push(context);
        size += context.length + 2;
        carry = [];
      }
    }
    const text = raw.length === 0 && line.day ? `[${line.day}] ${line.text}` : line.text;
    current.push(text);
    raw.push(line.text);
    size += text.length + 2;
  }
  let heldBack = false;
  if (current.length) {
    if (options.final || size >= target) {
      chunks.push(current.join("\n\n"));
      days.push(currentDay);
    } else heldBack = true;
  }
  return { chunks, days, redacted, heldBack };
}

export interface ContextLine {
  content: string;
  createdAt: Date;
  client?: string;
  project?: string;
  previous?: Array<{ content: string; createdAt: Date }>;
}

const day = (d: Date) => new Date(d).toISOString().slice(0, 10);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function renderLine(line: ContextLine): string {
  const meta = [line.project ? `project ${line.project}` : "", day(line.createdAt), line.client ? `via ${line.client}` : ""];
  let text = `- ${line.content} (${meta.filter(Boolean).join(", ")})`;
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
