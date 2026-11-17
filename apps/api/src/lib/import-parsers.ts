// Parsers for ChatGPT and Claude data exports (`conversations.json`).
import type { TranscriptMessage } from "@memcontext/types";

export interface ParsedConversation {
  id: string;
  title?: string;
  /** ISO date of the last activity. */
  date?: string;
  messages: TranscriptMessage[];
}

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);

const toIso = (v: unknown): string | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return new Date(v < 1e12 ? v * 1000 : v).toISOString();
  if (typeof v === "string" && !Number.isNaN(Date.parse(v))) return new Date(v).toISOString();
  return undefined;
};

export function detectExportFormat(conversations: unknown[]): "chatgpt" | "claude" | null {
  const first = conversations.find(isObject);
  if (!first) return null;
  if ("mapping" in first) return "chatgpt";
  if ("chat_messages" in first) return "claude";
  return null;
}

function chatgptText(content: unknown): string {
  if (!isObject(content)) return "";
  const parts = Array.isArray(content.parts) ? content.parts : [];
  const text = parts.filter((p): p is string => typeof p === "string").join("\n");
  return text || (typeof content.text === "string" ? content.text : "");
}

/** ChatGPT: follow `current_node` up the `mapping` tree to get the visible branch in order. */
export function parseChatGPTExport(conversations: unknown[]): ParsedConversation[] {
  const out: ParsedConversation[] = [];
  for (const conv of conversations) {
    if (!isObject(conv) || !isObject(conv.mapping)) continue;
    const mapping = conv.mapping as Record<string, Json>;
    let nodeId = typeof conv.current_node === "string" ? conv.current_node : undefined;
    if (!nodeId) {
      const leaves = Object.entries(mapping).filter(([, n]) => !Array.isArray(n.children) || n.children.length === 0);
      nodeId = leaves[leaves.length - 1]?.[0];
    }
    const chain: TranscriptMessage[] = [];
    const seen = new Set<string>();
    while (nodeId && mapping[nodeId] && !seen.has(nodeId)) {
      seen.add(nodeId);
      const node: Json = mapping[nodeId];
      const message: Json | undefined = isObject(node.message) ? node.message : undefined;
      const role = isObject(message?.author) ? message?.author.role : undefined;
      const text = chatgptText(message?.content).trim();
      if ((role === "user" || role === "assistant") && text) {
        chain.push({ role, content: text, at: toIso(message?.create_time) });
      }
      nodeId = typeof node.parent === "string" ? node.parent : undefined;
    }
    chain.reverse();
    if (chain.length === 0) continue;
    out.push({
      id: String(conv.conversation_id ?? conv.id ?? ""),
      title: typeof conv.title === "string" ? conv.title : undefined,
      date: toIso(conv.update_time) ?? toIso(conv.create_time),
      messages: chain,
    });
  }
  return out.filter((c) => c.id);
}

/** Claude: `chat_messages` are already ordered; text lives in `text` or `content[].text`. */
export function parseClaudeExport(conversations: unknown[]): ParsedConversation[] {
  const out: ParsedConversation[] = [];
  for (const conv of conversations) {
    if (!isObject(conv) || !Array.isArray(conv.chat_messages)) continue;
    const messages: TranscriptMessage[] = [];
    for (const m of conv.chat_messages) {
      if (!isObject(m)) continue;
      const role = m.sender === "human" ? "user" : m.sender === "assistant" ? "assistant" : undefined;
      if (!role) continue;
      let text = typeof m.text === "string" ? m.text : "";
      if (!text && Array.isArray(m.content)) {
        text = m.content
          .filter((c): c is Json => isObject(c) && c.type === "text" && typeof c.text === "string")
          .map((c) => c.text as string)
          .join("\n");
      }
      if (text.trim()) messages.push({ role, content: text.trim(), at: toIso(m.created_at) });
    }
    if (messages.length === 0) continue;
    out.push({
      id: String(conv.uuid ?? conv.id ?? ""),
      title: typeof conv.name === "string" ? conv.name : undefined,
      date: toIso(conv.updated_at) ?? toIso(conv.created_at),
      messages,
    });
  }
  return out.filter((c) => c.id);
}
