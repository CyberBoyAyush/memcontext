"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Github, Loader2, Check, X } from "lucide-react";

export function Hero() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [demoStep, setDemoStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDemoStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 800);
    return () => clearInterval(timer);
  }, []);

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
      <section className="pt-28 pb-16 sm:pt-36 sm:pb-24 lg:pt-44 lg:pb-32">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center">
            <p className="animate-fade-in opacity-0 text-sm sm:text-base text-foreground-muted mb-4 sm:mb-5 font-mono tracking-wide">
              Persistent memory for AI coding agents
            </p>

            <h1 className="animate-fade-in opacity-0 animation-delay-100 text-3xl sm:text-5xl lg:text-7xl font-semibold tracking-tight leading-[1.1]">
              Your AI remembers
              <br className="hidden sm:block" />
              <span className="sm:hidden"> </span>
              everything.
              <br />
              <span className="text-foreground-muted">Automatically.</span>
            </h1>

            <p className="animate-fade-in opacity-0 animation-delay-200 mt-6 sm:mt-8 text-base sm:text-xl text-foreground-muted max-w-2xl mx-auto leading-relaxed px-2">
              Connect the MCP server to Claude, Cursor, or Cline.
              Chat normally. Context is saved and retrieved without any extra work.
            </p>

            {/* Email Signup Form */}
            <div className="animate-fade-in opacity-0 animation-delay-300 mt-8 sm:mt-12 max-w-lg mx-auto px-2">
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      required
                      disabled={status === "loading" || status === "success"}
                      className="w-full px-4 sm:px-5 py-3 sm:py-3.5 text-base font-mono bg-background border border-border rounded-xl input-focus-glow focus:outline-none focus:border-foreground transition-all placeholder:text-foreground-subtle disabled:opacity-50"
                    />
                  </div>
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
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-foreground-subtle">
                We&apos;ll notify you when MemContext is ready. No spam, ever.
              </p>
            </div>

            {/* GitHub Link */}
            <div className="animate-fade-in opacity-0 animation-delay-400 mt-6 sm:mt-8">
              <button
                onClick={() => setShowGithubModal(true)}
                className="inline-flex items-center gap-2 text-sm sm:text-base text-foreground-muted hover:text-foreground transition-colors font-mono link-underline"
              >
                <Github className="w-4 h-4 sm:w-5 sm:h-5" />
                View on GitHub
              </button>
            </div>
          </div>

          {/* Demo Terminal */}
          <div className="animate-fade-in opacity-0 animation-delay-500 mt-12 sm:mt-20 px-2">
            <div className="border border-border rounded-xl sm:rounded-2xl overflow-hidden bg-surface-elevated shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b border-border bg-background flex items-center justify-between">
                <div className="flex gap-1.5 sm:gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400/60" />
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400/60" />
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400/60" />
                </div>
                <span className="text-xs text-foreground-subtle font-mono hidden sm:block">terminal</span>
              </div>

              <div className="p-4 sm:p-8 space-y-4 sm:space-y-5 font-mono text-sm sm:text-base">
                <div className={`transition-opacity duration-300 ${demoStep >= 1 ? "opacity-100" : "opacity-0"}`}>
                  <span className="text-foreground-subtle text-xs sm:text-sm">you</span>
                  <p className="mt-1 sm:mt-1.5">I prefer TypeScript strict mode and pnpm for packages.</p>
                </div>

                <div className={`transition-opacity duration-300 ${demoStep >= 2 ? "opacity-100" : "opacity-0"}`}>
                  <span className="text-foreground-subtle text-xs sm:text-sm">claude</span>
                  <p className="mt-1 sm:mt-1.5 text-foreground-muted">
                    <span className="text-success inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Saved
                    </span>
                    <span className="mx-2">—</span>
                    Got it, I&apos;ll remember that.
                  </p>
                </div>

                <div className={`pt-4 sm:pt-5 border-t border-border transition-opacity duration-300 ${demoStep >= 3 ? "opacity-100" : "opacity-0"}`}>
                  <p className="text-xs text-foreground-subtle mb-3 sm:mb-4 flex items-center gap-2">
                    <span className="w-8 h-px bg-border" />
                    next session
                    <span className="w-8 h-px bg-border" />
                  </p>
                  <span className="text-foreground-subtle text-xs sm:text-sm">you</span>
                  <p className="mt-1 sm:mt-1.5">Set up a new project for me.</p>
                </div>

                <div className={`transition-opacity duration-300 ${demoStep >= 4 ? "opacity-100" : "opacity-0"}`}>
                  <span className="text-foreground-subtle text-xs sm:text-sm">claude</span>
                  <p className="mt-1 sm:mt-1.5 text-foreground-muted">
                    <span className="text-foreground inline-flex items-center gap-1">
                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 rotate-180" />
                      Retrieved
                    </span>
                    <span className="mx-2">—</span>
                    I&apos;ll use TypeScript with strict mode and pnpm.
                  </p>
                </div>
              </div>
            </div>
          </div>
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
