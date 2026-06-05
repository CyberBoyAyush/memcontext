"use client";

import { ArrowRight } from "lucide-react";
import {
  FilePdf,
  FileDoc,
  Globe,
  Image as ImageIcon,
  Quotes,
  ShieldCheck,
  UsersThree,
  Stack,
  ThumbsUp,
  ThumbsDown,
  PencilSimple,
  ArrowsClockwise,
  Sparkle,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

interface Pillar {
  icon: Icon;
  title: string;
  body: string;
}

const pillars: Pillar[] = [
  {
    icon: Stack,
    title: "Ingest anything",
    body: "PDFs, DOCX, images, CSV, Markdown, and live URLs. MemContext chunks every source and extracts the durable facts.",
  },
  {
    icon: Quotes,
    title: "Cited, not hallucinated",
    body: "Every extracted fact links back to its source passage — page and chunk when available — so answers stay grounded and auditable.",
  },
  {
    icon: UsersThree,
    title: "Built for teams",
    body: "Workspaces with owner, admin, member, and viewer roles. Invite your team and share one knowledge base.",
  },
  {
    icon: ShieldCheck,
    title: "Hard scope isolation",
    body: "Lock knowledge into scopes like hr or engineering, group by project, and keep tenants strictly separated.",
  },
  {
    icon: ArrowsClockwise,
    title: "Learns from feedback",
    body: "Rate a fact helpful or wrong to reshape ranking. Corrections rewrite the memory and its source chunk, so retrieval keeps getting sharper.",
  },
];

// Source file chips ingested into the vault
const sources: { icon: Icon; label: string; tint: string }[] = [
  { icon: FilePdf, label: "handbook.pdf", tint: "#E8613C" },
  { icon: FileDoc, label: "pricing.docx", tint: "#7AA2E8" },
  { icon: Globe, label: "docs.site.com", tint: "#5EC8A0" },
  { icon: ImageIcon, label: "invoice.png", tint: "#E8A17A" },
];

function VaultPanel() {
  return (
    <div className="relative">
      {/* Border glow — top left */}
      <div
        aria-hidden
        className="absolute -top-px -left-px w-28 h-20 rounded-2xl"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 40%, transparent 70%)",
        }}
      />
      {/* Border glow — bottom right */}
      <div
        aria-hidden
        className="absolute -bottom-px -right-px w-28 h-20 rounded-2xl"
        style={{
          background:
            "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 40%, transparent 70%)",
        }}
      />
      {/* Soft ambient accent glow behind panel */}
      <div
        aria-hidden
        className="absolute -inset-8 rounded-3xl blur-3xl opacity-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 30% 30%, rgba(232,97,60,0.18) 0%, transparent 60%)",
        }}
      />

      {/* Main panel */}
      <div className="relative rounded-2xl bg-surface/50 backdrop-blur-md border border-white/[0.08] shadow-2xl shadow-black/40 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent rounded-2xl pointer-events-none"
        />

        {/* Panel header */}
        <div className="relative flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center">
              <UsersThree weight="duotone" className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground leading-none">
                Acme Workspace
              </p>
              <p className="text-[10px] text-foreground-subtle mt-1 font-mono">
                scope: support · project: billing
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-pulse-subtle absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            Indexed
          </span>
        </div>

        {/* Body */}
        <div className="relative p-5 sm:p-6">
          {/* Sources row */}
          <p className="font-mono text-[9px] uppercase tracking-widest text-foreground-subtle mb-3">
            Sources
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            {sources.map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/40 border border-white/[0.08]"
              >
                <s.icon weight="duotone" className="w-3.5 h-3.5" style={{ color: s.tint }} />
                <span className="text-[11px] text-foreground-muted font-mono">
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Distillation connector */}
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-white/10" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-foreground-subtle">
              extracted facts
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-white/10 to-white/10" />
          </div>

          {/* Extracted memory cards with citations + feedback affordances */}
          <div className="space-y-2.5">
            {/* Card 1 — live fact with feedback controls */}
            <div className="relative rounded-xl bg-background/40 border border-white/[0.08] p-3.5">
              <p className="text-[13px] text-foreground leading-snug">
                Refunds are issued within 30 days of purchase.
              </p>
              <div className="flex items-center justify-between mt-2.5">
                <div className="flex items-center gap-1.5">
                  <Quotes weight="fill" className="w-3 h-3 text-accent/80" />
                  <span className="text-[10px] text-accent/80 font-mono">
                    policy.pdf · p.4
                  </span>
                </div>
                {/* Feedback pills */}
                <div className="flex items-center gap-1">
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                    <ThumbsUp
                      weight="fill"
                      className="w-2.5 h-2.5 text-emerald-400"
                    />
                    <span className="text-[9px] font-mono text-emerald-400/90">
                      12
                    </span>
                  </span>
                  <span className="flex items-center justify-center w-5 h-5 rounded-md bg-white/[0.04] border border-white/[0.08]">
                    <ThumbsDown
                      weight="regular"
                      className="w-2.5 h-2.5 text-foreground-subtle"
                    />
                  </span>
                  <span className="flex items-center justify-center w-5 h-5 rounded-md bg-white/[0.04] border border-white/[0.08]">
                    <PencilSimple
                      weight="regular"
                      className="w-2.5 h-2.5 text-foreground-subtle"
                    />
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2 — just corrected, showing the loop closing */}
            <div className="relative rounded-xl bg-background/40 border border-accent/20 p-3.5">
              {/* corrected ribbon */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-accent/10 border border-accent/20">
                  <ArrowsClockwise
                    weight="bold"
                    className="w-2.5 h-2.5 text-accent"
                  />
                  <span className="text-[8px] font-mono uppercase tracking-wider text-accent">
                    Corrected
                  </span>
                </span>
                <span className="text-[9px] text-foreground-subtle">
                  memory + chunk updated
                </span>
              </div>
              <p className="text-[13px] text-foreground leading-snug">
                The free trial lasts{" "}
                <span className="text-accent font-medium">30 days</span>
                <span className="text-foreground-subtle line-through decoration-foreground-subtle/50">
                  {" "}
                  14 days
                </span>
                .
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <Quotes weight="fill" className="w-3 h-3 text-accent/80" />
                <span className="text-[10px] text-accent/80 font-mono">
                  pricing.docx · §2
                </span>
              </div>
            </div>
          </div>

          {/* Self-learning loop strip */}
          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center justify-between gap-1">
              {[
                { icon: ThumbsUp, label: "Feedback" },
                { icon: PencilSimple, label: "Correct" },
                { icon: ArrowsClockwise, label: "Re-rank" },
                { icon: Sparkle, label: "Sharper" },
              ].map((step, i, arr) => (
                <div key={step.label} className="flex items-center gap-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center">
                      <step.icon
                        weight="duotone"
                        className="w-2.5 h-2.5 text-accent"
                      />
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-foreground-muted font-medium whitespace-nowrap">
                      {step.label}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight className="w-2.5 h-2.5 text-foreground-subtle/50 mx-0.5 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative px-5 py-3 border-t border-white/[0.06] flex items-center justify-between bg-background/20">
          <span className="text-[11px] text-foreground-muted">
            Grounded answers that improve with feedback.
          </span>
          <span className="text-[10px] text-foreground-subtle font-mono hidden sm:block">
            Context Vault
          </span>
        </div>
      </div>
    </div>
  );
}

export function ContextVault() {
  return (
    <section
      id="context-vault"
      className="py-20 sm:py-28 lg:py-32 px-4 sm:px-6 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Centered header */}
        <div className="text-center mb-12 sm:mb-16">
          {/* Glowing badge pill — matches Features / How-it-Works */}
          <div className="flex justify-center mb-6">
            <div className="group relative">
              <div
                aria-hidden
                className="absolute -top-px -left-px w-16 h-9 rounded-full blur-[1px]"
                style={{
                  background:
                    "radial-gradient(ellipse at top left, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 70%)",
                }}
              />
              <div
                aria-hidden
                className="absolute -bottom-px -right-px w-16 h-9 rounded-full blur-[1px]"
                style={{
                  background:
                    "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 30%, transparent 70%)",
                }}
              />
              <div className="absolute -inset-0.5 rounded-full border border-white/10" />
              <div className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/95 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="relative z-10 text-xs sm:text-sm text-foreground font-medium">
                  New · Context Vault
                </span>
              </div>
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4 tracking-tight leading-[1.1]">
            A shared brain for your whole team
          </h2>
          <p className="text-base sm:text-lg text-foreground-muted max-w-2xl mx-auto">
            Drop in your docs. MemContext extracts the facts, cites the source,
            and learns from every correction — so your knowledge base gets
            sharper the more your team uses it.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
          {/* LEFT — pillars + CTA */}
          <div>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-8">
              {pillars.map((p) => (
                <div key={p.title} className="flex flex-col">
                  <div className="relative w-fit mb-4">
                    <div
                      aria-hidden
                      className="absolute -top-px -left-px w-7 h-7 rounded-lg blur-[1px]"
                      style={{
                        background:
                          "radial-gradient(ellipse at top left, rgba(232,97,60,0.5) 0%, rgba(232,97,60,0.12) 40%, transparent 70%)",
                      }}
                    />
                    <div className="relative w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/[0.06] via-transparent to-transparent" />
                      <p.icon
                        weight="duotone"
                        className="relative z-10 w-5 h-5 text-accent"
                      />
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1.5">
                    {p.title}
                  </h3>
                  <p className="text-sm text-foreground-muted leading-relaxed">
                    {p.body}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-10">
              <a
                href="https://docs.memcontext.in/context-vault/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-block"
              >
                <div className="absolute -inset-0.5 rounded-xl border border-white/8" />
                <div className="relative flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-surface/60 backdrop-blur-sm border border-white/[0.08] transition-all group-hover:border-white/15 group-hover:bg-surface/80">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.04] via-transparent to-transparent" />
                  <span className="text-sm sm:text-base text-foreground font-display font-semibold relative z-10">
                    Explore Context Vault
                  </span>
                  <ArrowRight className="w-4 h-4 text-foreground relative z-10 transition-transform group-hover:translate-x-1" />
                </div>
              </a>
            </div>
          </div>

          {/* RIGHT — vault panel */}
          <VaultPanel />
        </div>
      </div>
    </section>
  );
}
