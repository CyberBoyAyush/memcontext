"use client";

import {
  Brain,
  Sparkles,
  Search,
  RefreshCcw,
  Shield,
  GitBranch,
} from "lucide-react";
import { ReactNode } from "react";

interface Feature {
  title: string;
  description: string;
  icon: ReactNode;
}

const features: Feature[] = [
  {
    title: "Intelligent Memory",
    description: "Context is detected and saved automatically. Your AI learns your preferences without manual input.",
    icon: <Brain className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />,
  },
  {
    title: "Semantic Retrieval",
    description: "Memories are retrieved by meaning, not keywords. Ask naturally and get relevant context instantly.",
    icon: <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />,
  },
  {
    title: "Powerful Search",
    description: "Search through all your memories with natural language. Find exactly what you need in seconds.",
    icon: <Search className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />,
  },
  {
    title: "Auto Updates",
    description: "When your preferences change, memories update automatically. No duplicates, always current.",
    icon: <RefreshCcw className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />,
  },
  {
    title: "Encrypted & Private",
    description: "All data is encrypted at rest and in transit. Your memories are never used to train models.",
    icon: <Shield className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />,
  },
  {
    title: "Cross-Tool Sync",
    description: "One memory layer across all your AI tools. Set a preference in Cursor, use it in Claude.",
    icon: <GitBranch className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />,
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-20">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4">
            How it helps
          </h2>
          <p className="text-base sm:text-lg text-foreground-muted max-w-2xl mx-auto">
            MemContext gives your AI tools persistent memory, so you never repeat yourself.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-5 sm:p-6 rounded-xl border border-border bg-background hover:bg-surface-elevated hover:border-foreground/10 transition-all duration-300 hover:shadow-sm"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-surface-elevated group-hover:bg-background flex items-center justify-center mb-4 transition-colors duration-300">
                <span className="text-foreground-muted group-hover:text-foreground transition-colors duration-300">
                  {feature.icon}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-medium mb-2">{feature.title}</h3>
              <p className="text-sm sm:text-base text-foreground-muted leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
