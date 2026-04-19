"use client";

import { useState } from "react";
import {
  ChevronDown,
  ArrowRight,
  Mail,
  MessageCircle,
  XIcon,
  X,
} from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";
import { BsGithub } from "react-icons/bs";

const faqs = [
  {
    q: "What is MemContext?",
    a: "MemContext is a persistent, evolving memory layer for AI agents and applications. It stores preferences, facts, decisions, and context with hybrid search, auto-expiring temporal memories, and feedback-driven ranking. Use it via MCP with coding assistants or via REST API in any custom app.",
  },
  {
    q: "What is MCP?",
    a: "Model Context Protocol is an open standard by Anthropic for connecting AI tools to external services. It's how MemContext integrates with Claude Code, Cursor, Codex, and other AI assistants.",
  },
  {
    q: "How does automatic memory work?",
    a: "When you save a memory, MemContext expands it for searchability, classifies whether it's permanent or temporal, detects duplicates, and links related memories automatically. During search, it combines vector similarity with keyword matching, filters expired content, and adjusts ranking based on your feedback.",
  },
  {
    q: "Is my data private and secure?",
    a: "Absolutely. All memories are encrypted at rest and in transit. We never use your data to train models or share it with third parties. You own your data — export or delete anytime.",
  },
  {
    q: "Does it work across multiple AI tools and custom apps?",
    a: "Yes. Connect any MCP-compatible tool and they share the same memory. You can also use the REST API to build custom applications on top of MemContext — content generators, support bots, CRM memory, anything.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. The free plan includes 300 memories. Paid plans start at hobby tier with 2,000 memories and go up to pro with 10,000. Check the pricing page for current details.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 sm:py-28 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left Side - Header & CTA */}
          <div className="lg:col-span-4 lg:sticky lg:top-32 lg:self-start">
            {/* Glowing badge pill */}
            <div className="flex justify-start mb-6">
              <div className="group relative">
                {/* Border glow spot - top left */}
                <div
                  className="absolute -top-px -left-px w-16 h-9 rounded-full blur-[1px]"
                  style={{
                    background:
                      "radial-gradient(ellipse at top left, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 70%)",
                  }}
                />
                {/* Border glow spot - bottom right */}
                <div
                  className="absolute -bottom-px -right-px w-16 h-9 rounded-full blur-[1px]"
                  style={{
                    background:
                      "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 30%, transparent 70%)",
                  }}
                />

                {/* Subtle border all around */}
                <div className="absolute -inset-0.5 rounded-full border border-white/10" />

                {/* Main container */}
                <div className="relative inline-flex items-center px-4 py-2 rounded-full bg-surface/95 backdrop-blur-sm">
                  {/* Inner glow - top left */}
                  <div className="absolute top-0 left-0 w-16 h-10 bg-white/5 rounded-full blur-xl -translate-x-1/3 -translate-y-1/2" />
                  {/* Inner glow - bottom right */}
                  <div className="absolute bottom-0 right-0 w-16 h-10 bg-white/5 rounded-full blur-xl translate-x-1/3 translate-y-1/2" />

                  {/* Text */}
                  <span className="relative z-10 text-xs sm:text-sm text-foreground font-medium">
                    FAQ
                  </span>
                </div>
              </div>
            </div>

            {/* Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-4xl font-display font-bold mb-3 tracking-tight leading-[1.1]">
              Frequently Asked
              <br />
              <span className="text-foreground-muted">Questions</span>
            </h2>

            <p className="text-sm sm:text-base text-foreground-muted mb-8 max-w-sm">
              Can&apos;t find the answer you&apos;re looking for? Reach out to
              our team.
            </p>

            {/* CTA Button - Glossy style */}
            <a
              href="https://app.memcontext.in/login"
              className="relative group inline-block mb-8"
            >
              <div
                className="absolute -top-px -left-px w-12 h-6 rounded-xl blur-[0.5px] opacity-80 group-hover:opacity-100 transition-opacity"
                style={{
                  background:
                    "radial-gradient(ellipse at top left, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.25) 40%, transparent 70%)",
                }}
              />
              <div
                className="relative px-6 py-3 rounded-xl flex items-center justify-center gap-2 overflow-hidden transition-all group-hover:scale-[1.02] whitespace-nowrap"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(232, 97, 60, 0.9) 0%, rgba(201, 78, 46, 0.8) 100%)",
                }}
              >
                <div
                  className="absolute inset-0 opacity-60"
                  style={{
                    background:
                      "radial-gradient(ellipse at top left, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 40%, transparent 70%)",
                  }}
                />
                <div
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
                  }}
                />
                <span className="font-display font-semibold text-sm text-white relative z-10">
                  Sign Up
                </span>
                <ArrowRight className="w-4 h-4 text-white relative z-10 transition-transform group-hover:translate-x-1" />
              </div>
            </a>

            {/* Support Links */}
            <div className="space-y-3">
              <p className="text-xs text-foreground-subtle uppercase tracking-wider font-medium">
                Need more help?
              </p>
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                {/* Email Support Card */}
                <a
                  href="https://aysh.me"
                  target="_blank"
                  className="group relative"
                >
                  {/* Border glow - top left */}
                  <div
                    className="absolute -top-px -left-px w-14 h-10 rounded-xl blur-[1px]"
                    style={{
                      background:
                        "radial-gradient(ellipse at top left, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 35%, transparent 65%)",
                    }}
                  />
                  {/* Border glow - bottom right */}
                  <div
                    className="absolute -bottom-px -right-px w-14 h-10 rounded-xl blur-[1px]"
                    style={{
                      background:
                        "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 35%, transparent 65%)",
                    }}
                  />
                  {/* Main card */}
                  <div className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface/60 backdrop-blur-md border border-white/[0.08] group-hover:border-white/15 group-hover:bg-surface/80 transition-all">
                    {/* Inner glow overlay */}
                    <div className="absolute top-0 left-0 w-16 h-10 bg-white/[0.04] rounded-xl blur-xl -translate-x-1/4 -translate-y-1/4" />
                    {/* Icon container with glass */}
                    <div className="relative">
                      <div
                        className="absolute -top-px -left-px w-6 h-6 rounded-lg blur-[0.5px]"
                        style={{
                          background:
                            "radial-gradient(ellipse at top left, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 40%, transparent 70%)",
                        }}
                      />
                      <div className="relative w-8 h-8 rounded-lg bg-surface-elevated/90 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/[0.08] via-transparent to-transparent" />
                        <BsGithub className="w-4 h-4 text-foreground-muted relative z-10" />
                      </div>
                    </div>
                    <div className="relative z-10">
                      <p className="text-sm font-medium text-foreground group-hover:text-white transition-colors">
                        Website
                      </p>
                      <p className="text-[11px] text-foreground-subtle">
                        https://aysh.me
                      </p>
                    </div>
                  </div>
                </a>

                {/* Chat on X Card */}
                <a
                  href="https://aysh.me/X"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative"
                >
                  {/* Border glow - top left */}
                  <div
                    className="absolute -top-px -left-px w-14 h-10 rounded-xl blur-[1px]"
                    style={{
                      background:
                        "radial-gradient(ellipse at top left, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 35%, transparent 65%)",
                    }}
                  />
                  {/* Border glow - bottom right */}
                  <div
                    className="absolute -bottom-px -right-px w-14 h-10 rounded-xl blur-[1px]"
                    style={{
                      background:
                        "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 35%, transparent 65%)",
                    }}
                  />
                  {/* Main card */}
                  <div className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface/60 backdrop-blur-md border border-white/[0.08] group-hover:border-white/15 group-hover:bg-surface/80 transition-all">
                    {/* Inner glow overlay */}
                    <div className="absolute top-0 left-0 w-16 h-10 bg-white/[0.04] rounded-xl blur-xl -translate-x-1/4 -translate-y-1/4" />
                    {/* Icon container with glass */}
                    <div className="relative">
                      <div
                        className="absolute -top-px -left-px w-6 h-6 rounded-lg blur-[0.5px]"
                        style={{
                          background:
                            "radial-gradient(ellipse at top left, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 40%, transparent 70%)",
                        }}
                      />
                      <div className="relative w-8 h-8 rounded-lg bg-surface-elevated/90 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/[0.08] via-transparent to-transparent" />
                        <FaXTwitter className="w-4 h-4 text-foreground-muted relative z-10" />
                      </div>
                    </div>
                    <div className="relative z-10">
                      <p className="text-sm font-medium text-foreground group-hover:text-white transition-colors">
                        Chat on X
                      </p>
                      <p className="text-[11px] text-foreground-subtle">
                        @theayush
                      </p>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Right Side - FAQ Accordion */}
          <div className="lg:col-span-8">
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className={`group rounded-2xl border transition-all duration-300 overflow-hidden ${
                    open === i
                      ? "bg-surface/80 border-white/10 shadow-lg shadow-black/20"
                      : "bg-surface/30 border-white/5 hover:border-white/10 hover:bg-surface/50"
                  }`}
                >
                  <button
                    onClick={() => setOpen(open === i ? null : i)}
                    className={`w-full flex cursor-pointer items-center justify-between  text-left ${
                      open === i ? "p-5 sm:p-6 pb-2 md:pb-2" : "p-5 sm:p-6"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Number indicator with glass border corner */}
                      <div className="relative">
                        {/* Border glow - top left only - softer */}
                        <div
                          className="absolute -top-px -left-px w-6 h-6 rounded-lg blur-[1px]"
                          style={{
                            background:
                              open === i
                                ? "radial-gradient(ellipse at top left, rgba(232,97,60,0.5) 0%, rgba(232,97,60,0.15) 40%, transparent 70%)"
                                : "radial-gradient(ellipse at top left, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.12) 40%, transparent 70%)",
                          }}
                        />
                        <div
                          className={`relative w-8 h-8 rounded-lg flex items-center justify-center text-sm font-mono transition-all duration-300 backdrop-blur-sm border ${
                            open === i
                              ? "bg-accent/15 text-accent border-white/10"
                              : "bg-white/5 text-foreground-subtle border-white/10"
                          }`}
                          style={{
                            boxShadow: "inset 0 1px 1px rgba(255,255,255,0.05)",
                          }}
                        >
                          {/* Inner glow - softer */}
                          <div className="absolute inset-0 rounded-lg bg-linear-to-br from-white/[0.06] via-transparent to-transparent" />
                          <span className="relative z-10">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-sm sm:text-base font-medium transition-colors ${
                          open === i
                            ? "text-foreground"
                            : "text-foreground-muted group-hover:text-foreground"
                        }`}
                      >
                        {faq.q}
                      </span>
                    </div>
                    <div className="relative">
                      <div
                        className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300   ${
                          open === i ? " rotate-180" : ""
                        }`}
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-colors ${
                            open === i
                              ? "text-accent"
                              : "text-foreground-subtle"
                          }`}
                        />
                      </div>
                    </div>
                  </button>
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      open === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-5 sm:px-6 pb-5 sm:pb-6 pl-[4.5rem] sm:pl-[4.5rem]">
                        <p className="text-sm sm:text-base text-foreground-muted leading-relaxed">
                          {faq.a}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom note */}
            {/* <div className="mt-8 p-5 rounded-2xl bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 border border-accent/10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">
                    Still have questions?
                  </p>
                  <p className="text-sm text-foreground-muted">
                    We&apos;re here to help. Reach out anytime and we&apos;ll
                    get back to you as soon as possible.
                  </p>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </section>
  );
}
