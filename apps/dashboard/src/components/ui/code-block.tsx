"use client";

import { useState, useEffect } from "react";
import { codeToHtml } from "shiki";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({
  code,
  language,
  filename,
  showLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    async function highlight() {
      try {
        const html = await codeToHtml(code, {
          lang: language,
          themes: {
            light: "github-light",
            dark: "github-dark",
          },
          defaultColor: false,
        });
        setHighlightedHtml(html);
      } catch {
        setHighlightedHtml(null);
      }
    }
    highlight();
  }, [code, language]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-surface w-full">
      {filename && (
        <div className="px-4 py-2.5 border-b border-border bg-surface-elevated flex items-center justify-between gap-2">
          <span className="text-sm font-mono text-foreground-muted truncate">
            {filename}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 text-xs gap-1.5 shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-success" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </Button>
        </div>
      )}
      <div className="relative">
        <div className="overflow-x-auto">
          {highlightedHtml ? (
            <div
              className={cn(
                "shiki-container text-sm leading-relaxed",
                "[&_pre]:!bg-transparent [&_pre]:p-4 [&_pre]:m-0",
                "[&_code]:block [&_code]:whitespace-pre [&_code]:w-max",
                "[&_span]:!bg-transparent",
                showLineNumbers &&
                  "[&_.line]:before:content-[counter(line)] [&_.line]:before:counter-increment-[line] [&_.line]:before:mr-4 [&_.line]:before:text-foreground-subtle [&_.line]:before:inline-block [&_.line]:before:w-4 [&_.line]:before:text-right",
              )}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          ) : (
            <pre className="p-4 text-sm font-mono leading-relaxed">
              <code className="whitespace-pre block w-max">{code}</code>
            </pre>
          )}
        </div>
        {!filename && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="absolute top-2 right-2 h-8 w-8 shrink-0 cursor-pointer"
          >
            {copied ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
