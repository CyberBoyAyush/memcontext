"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "What is MemContext?",
    a: "MemContext is a persistent memory layer for AI coding assistants. It remembers your preferences, coding style, project context, and past conversations — so your AI never starts from scratch.",
  },
  {
    q: "What is MCP?",
    a: "Model Context Protocol is an open standard by Anthropic for connecting AI tools to external services. It's how MemContext integrates with Claude Code, Cursor, Codex, and other AI assistants.",
  },
  {
    q: "How does automatic memory work?",
    a: "When you share preferences or context, MemContext intelligently detects what's worth remembering and saves it. Later, when you ask something related, it automatically retrieves relevant memories — no manual tagging needed.",
  },
  {
    q: "Is my data private and secure?",
    a: "Absolutely. All memories are encrypted at rest and in transit. We never use your data to train models or share it with third parties. You own your data — export or delete anytime.",
  },
  {
    q: "Does it work across multiple AI tools?",
    a: "Yes! Connect any MCP-compatible tool and they share the same memory. Preferences you set in Claude Code automatically work in Cursor, Codex, and other supported tools.",
  },
  {
    q: "Is there a free plan?",
    a: "We're still figuring out the exact pricing, but yes — there will definitely be a generous free tier. We want everyone to experience the magic of persistent AI memory.",
  },
  {
    q: "When is MemContext launching?",
    a: "Soon! Join the waitlist to get early access and be notified the moment we launch. Follow us on X for updates.",
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
