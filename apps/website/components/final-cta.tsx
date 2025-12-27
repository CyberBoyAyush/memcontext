"use client";

import { useState } from "react";
import { ArrowRight, Loader2, Check, Github, X } from "lucide-react";

export function FinalCTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [showGithubModal, setShowGithubModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setStatus("success");
    setEmail("");
    setTimeout(() => setStatus("idle"), 3000);
  };

  return (
    <>
      <section className="py-20 sm:py-28 bg-surface-elevated">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-5">
            Stop repeating yourself.
          </h2>
          <p className="text-base sm:text-lg text-foreground-muted mb-8 sm:mb-10">
            Connect once. Chat normally. Memory happens automatically.
          </p>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 max-w-lg mx-auto mb-6 sm:mb-8"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                disabled={status === "loading" || status === "success"}
                className="flex-1 px-4 sm:px-5 py-3 sm:py-3.5 text-base font-mono bg-background border border-border rounded-xl input-focus-glow focus:outline-none focus:border-foreground transition-all placeholder:text-foreground-subtle disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={status === "loading" || status === "success"}
                className="px-6 py-3 sm:py-3.5 text-base font-medium bg-accent text-background rounded-xl btn-hover-lift transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Joining...</span>
                  </>
                ) : status === "success" ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>You&apos;re in!</span>
                  </>
                ) : (
                  <>
                    <span>Get Early Access</span>
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </form>

          <button
            onClick={() => setShowGithubModal(true)}
            className="text-sm sm:text-base text-foreground-muted hover:text-foreground transition-colors font-mono inline-flex items-center gap-2 link-underline"
          >
            <Github className="w-4 h-4 sm:w-5 sm:h-5" />
            Star on GitHub
          </button>
        </div>
      </section>

      {/* GitHub Coming Soon Modal */}
      {showGithubModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowGithubModal(false)}
        >
          <div
            className="relative bg-background border border-border rounded-2xl p-6 sm:p-10 max-w-md w-full shadow-xl animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowGithubModal(false)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 text-foreground-subtle hover:text-foreground transition-colors hover:rotate-90 duration-200"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-5 rounded-full bg-surface-elevated flex items-center justify-center">
                <Github className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">Coming Soon</h3>
              <p className="text-foreground-muted text-sm sm:text-base mb-6 sm:mb-8">
                MemContext will be open source soon. Star the repo to get notified when we go public.
              </p>
              <a
                href="https://github.com/cyberboyayush/memcontext"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium bg-accent text-background rounded-xl btn-hover-lift transition-all"
              >
                <Github className="w-4 h-4 sm:w-5 sm:h-5" />
                Follow on GitHub
              </a>
              <p className="mt-4 sm:mt-5 text-xs sm:text-sm text-foreground-subtle font-mono">
                github.com/cyberboyayush/memcontext
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
