"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type MarkdownSize = "sm" | "xs";

function textClass(size: MarkdownSize) {
  return size === "sm" ? "text-sm text-foreground/90" : "text-xs text-foreground/85";
}

function codeTextClass(size: MarkdownSize) {
  return size === "sm" ? "text-[12px]" : "text-[11px]";
}

function countTableCells(value: string): number {
  return value
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean).length;
}

/**
 * Normalize chunked markdown tables so remark-gfm can render them as real tables.
 * Handles missing separator rows and rows collapsed onto one physical line.
 */
export function normalizeChunkMarkdown(input: string): string {
  if (!input) return input;

  const normalized = input.replace(/\|\s*\|/g, (match, offset, str) => {
    const before = str.slice(0, offset);
    const after = str.slice(offset + match.length);
    const beforeLineStart = before.lastIndexOf("\n") + 1;
    const afterLineEnd = after.indexOf("\n");
    const beforeLine = before.slice(beforeLineStart);
    const afterLine = afterLineEnd === -1 ? after : after.slice(0, afterLineEnd);

    // Only split true collapsed row boundaries. Empty cells like `| a |  | b |`
    // have too few cells on either side and must stay on the same row.
    if (countTableCells(beforeLine) >= 2 && countTableCells(afterLine) >= 2) {
      return "|\n|";
    }

    return match;
  });

  const lines = normalized.split("\n");
  const isTableRow = (s: string) =>
    s.startsWith("|") && s.endsWith("|") && s.includes("|", 1);
  const isSeparator = (s: string) =>
    /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(s);
  const out: string[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (isTableRow(trimmed)) {
      out.push(line);
      const next = (lines[i + 1] ?? "").trim();

      if (!inTable) {
        if (!isSeparator(next)) {
          const cellCount = countTableCells(trimmed);
          if (cellCount >= 2 && isTableRow(next)) {
            out.push("|" + " --- |".repeat(cellCount));
          }
        }
        inTable = true;
      }
    } else {
      out.push(line);
      inTable = false;
    }
  }

  return out.join("\n");
}

function createChunkMarkdownComponents(size: MarkdownSize): Components {
  const bodyText = textClass(size);
  const codeText = codeTextClass(size);

  return {
    p: ({ children }) => (
      <p className={cn("break-words leading-6 [&:not(:first-child)]:mt-2", bodyText)}>
        {children}
      </p>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    a: ({ children, href }) => (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-accent underline-offset-2 hover:underline"
      >
        {children}
      </a>
    ),
    ul: ({ children }) => (
      <ul className={cn("mt-2 list-disc space-y-1 pl-5", bodyText)}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className={cn("mt-2 list-decimal space-y-1 pl-5", bodyText)}>
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="leading-6">{children}</li>,
    code: ({ children }) => (
      <code className={cn("rounded bg-surface px-1 py-0.5 font-mono text-foreground", codeText)}>
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className={cn("mt-2 overflow-x-auto rounded-md border border-border bg-surface p-2 leading-5 text-foreground/90", codeText)}>
        {children}
      </pre>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mt-2 border-l-2 border-border pl-3 italic text-foreground-muted">
        {children}
      </blockquote>
    ),
    h1: ({ children }) => (
      <h1 className="mt-3 text-sm font-semibold text-foreground first:mt-0">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mt-3 text-sm font-semibold text-foreground first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className={cn("mt-2 font-semibold text-foreground first:mt-0", size === "sm" ? "text-sm" : "text-[13px]")}>{children}</h3>
    ),
    table: ({ children }) => (
      <div className="mt-2 overflow-x-auto rounded-md border border-border">
        <table className={cn("w-full border-collapse", codeText)}>{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-surface-elevated">{children}</thead>
    ),
    th: ({ children }) => (
      <th className="border-b border-r border-border px-2 py-1.5 text-left font-semibold text-foreground last:border-r-0">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className={cn("border-b border-r border-border/60 px-2 py-1.5 align-top last:border-r-0", size === "sm" ? "text-foreground/90" : "text-foreground/85")}>
        {children}
      </td>
    ),
    hr: () => <hr className="my-2 border-border" />,
  };
}

const chunkMarkdownComponents = {
  sm: createChunkMarkdownComponents("sm"),
  xs: createChunkMarkdownComponents("xs"),
};

const inlineChunkMarkdownComponents: Components = {
  p: ({ children }) => <>{children}</>,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground/90">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => (
    <code className="rounded bg-surface px-1 py-px font-mono text-[11px] text-foreground/90">
      {children}
    </code>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-accent underline-offset-2 hover:underline"
    >
      {children}
    </a>
  ),
};

export function VaultChunkMarkdown({
  content,
  className,
  size = "xs",
}: {
  content: string;
  className?: string;
  size?: MarkdownSize;
}) {
  return (
    <div className={cn("markdown-body", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={chunkMarkdownComponents[size]}
      >
        {normalizeChunkMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}

export function InlineVaultChunkMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={inlineChunkMarkdownComponents}
      allowedElements={["p", "strong", "em", "code", "a", "span", "del", "br"]}
      unwrapDisallowed
    >
      {content}
    </ReactMarkdown>
  );
}
