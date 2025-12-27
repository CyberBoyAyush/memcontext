"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "What is MCP?",
    a: "Model Context Protocol — an open standard by Anthropic for connecting AI tools to external services. It's how MemContext talks to Claude, Cursor, Cline, etc.",
  },
  {
    q: "How does automatic memory work?",
    a: "When you share preferences or context, MemContext detects what's worth remembering and saves it. Later, when you ask something related, it automatically retrieves relevant memories.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Memories are encrypted at rest and in transit. We never use your data to train models. You can export or delete anytime.",
  },
  {
    q: "Does it work across multiple tools?",
    a: "Yes. Connect any MCP-compatible tool and they share the same memory. Preferences set in Claude Desktop work in Cursor too.",
  },
  {
    q: "Is it free?",
    a: "MemContext is open source. Self-host it, or use our hosted service when it launches.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-12 sm:mb-20">FAQ</h2>

        <div className="space-y-0">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-border">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between py-5 sm:py-6 text-left group"
              >
                <span className="text-sm sm:text-base font-medium pr-4 group-hover:text-foreground-muted transition-colors">
                  {faq.q}
                </span>
                <ChevronDown
                  className={`w-4 h-4 sm:w-5 sm:h-5 text-foreground-subtle shrink-0 transition-transform duration-300 ${
                    open === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  open === i ? "grid-rows-[1fr] pb-5 sm:pb-6" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="text-sm sm:text-base text-foreground-muted leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
