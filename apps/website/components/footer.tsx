"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Github, X } from "lucide-react";
import { BsGithub } from "react-icons/bs";

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export function Footer() {
  const [showGithubModal, setShowGithubModal] = useState(false);

  return (
    <>
      <footer className="relative pt-16 px-3 sm:pt-20 pb-0 overflow-hidden">
        {/* Top border line - fades from center */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="mx-auto max-w-6xl px-4 sm:px-6 relative z-10">
          {/* Main footer content */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-8 sm:gap-12 pb-16 sm:pb-20">
            {/* Left side - Logo, description, and links */}
            <div className="flex-1 max-w-md">
              {/* Logo */}
              <Link href="/" className="inline-flex items-center gap-2.5 group">
                <div className="relative">
                  {/* Border glow spot */}
                  <div
                    className="absolute -top-[0.5px] -left-[0.5px] w-6 h-6 rounded-lg blur-[0.5px]"
                    style={{
                      background:
                        "radial-gradient(ellipse at top left, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.4) 30%, transparent 60%)",
                    }}
                  />
                  {/* Glass container */}
                  <div className="relative w-8 h-8 rounded-lg bg-surface/80 backdrop-blur-sm border border-white/10 flex items-center justify-center overflow-hidden group-hover:opacity-80 transition-all">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
                    <Image
                      src="/sign.png"
                      alt="MemContext Logo"
                      width={20}
                      height={20}
                      className="w-5 h-5 relative z-10"
                    />
                  </div>
                </div>
                <span className="text-lg font-mono font-medium group-hover:opacity-80 transition-opacity">
                  MemContext
                </span>
              </Link>

              <p className="mt-4 text-sm text-foreground-muted leading-relaxed">
                Persistent memory for AI coding assistants. Connect once, chat
                normally, memory happens automatically.
              </p>

            

              {/* Copyright and credit */}
              <div className="mt-4 flex flex-col gap-1">
                {/* <p className="text-xs text-foreground-subtle">
                  © {new Date().getFullYear()} MemContext. All rights reserved.
                </p> */}
                <p className="text-xs text-foreground-subtle">
                  Crafted by{" "}
                  <a
                    href="https://aysh.me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground-muted hover:text-foreground transition-colors"
                  >
                    Ayush Sharma
                  </a>
                  {" & "}
                  <a
                    href="https://vrandagarg.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground-muted hover:text-foreground transition-colors"
                  >
                    Vranda Garg
                  </a>
                </p>
              </div>
            </div>

            {/* Right side - Navigation and Social */}
            <div className="flex gap-12 sm:gap-16">
              {/* Product links */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  Product
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link
                      href="#features"
                      className="text-sm text-foreground-muted hover:text-foreground transition-colors"
                    >
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#how-it-works"
                      className="text-sm text-foreground-muted hover:text-foreground transition-colors"
                    >
                      How it Works
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#faq"
                      className="text-sm text-foreground-muted hover:text-foreground transition-colors"
                    >
                      FAQ
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Connect links */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  Connect
                </h3>
                <ul className="space-y-3">
                  <li>
                    <a
                      href="https://aysh.me/X"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-foreground-muted hover:text-foreground transition-colors inline-flex items-center gap-2"
                    >
                      <XIcon className="w-3.5 h-3.5" />
                      Twitter
                    </a>
                  </li>
                  <li>
                    <button
                      onClick={() => setShowGithubModal(true)}
                      className="text-sm text-foreground-muted hover:text-foreground transition-colors inline-flex items-center gap-2"
                    >
                      <BsGithub className="w-3.5 h-3.5" />
                      GitHub
                    </button>
                  </li>
                  {/* <li>
                    <a
                      href="https://aysh.me"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-foreground-muted hover:text-foreground transition-colors"
                    >
                      Creator
                    </a>
                  </li> */}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Large MemContext text at bottom - fading down, cut off at bottom */}
        <div className="relative h-16 sm:h-22 md:h-28 lg:h-36 overflow-hidden">
          {/* Large text - positioned to show top portion, cut off at bottom */}
          <h2
            className="absolute left-1/2 -translate-x-1/2 top-0 text-[4.5rem] sm:text-[6rem] md:text-[7rem] lg:text-[10rem] xl:text-[13rem] font-display font-bold tracking-tighter leading-[0.85] select-none whitespace-nowrap"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.015) 70%, transparent 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            MemContext
          </h2>
        </div>
      </footer>

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
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
                Coming Soon
              </h3>
              <p className="text-foreground-muted text-sm sm:text-base mb-6 sm:mb-8">
                MemContext will be open source soon. Star the repo to get
                notified when we go public.
              </p>
              <a
                href="https://github.com/cyberboyayush"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium bg-accent text-background rounded-xl btn-hover-lift transition-all"
              >
                <Github className="w-4 h-4 sm:w-5 sm:h-5" />
                Follow on GitHub
              </a>
              <p className="mt-4 sm:mt-5 text-xs sm:text-sm text-foreground-subtle font-mono">
                github.com/cyberboyayush
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
