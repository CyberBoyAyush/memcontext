"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Github, Menu, X } from "lucide-react";
import { BsGithub } from "react-icons/bs";

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const navigation = [
  { name: "Features", href: "#features" },
  { name: "How it Works", href: "#how-it-works" },
  { name: "FAQ", href: "#faq" },
];

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className={`fixed top-0 mx-2 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "py-3 sm:py-4" : "py-2 sm:py-3"
          }`}
      >
        <nav
          className={`mx-auto max-w-5xl px-4 sm:px-6 transition-all duration-500 border rounded-xl ${scrolled
              ? "bg-surface/90 backdrop-blur-md border-border shadow-lg mx-4 sm:mx-6 lg:mx-auto"
              : "border-transparent bg-transparent"
            }`}
        >
          <div
            className={`flex items-center justify-between transition-all duration-500 ${scrolled ? "h-12 sm:h-14 px-2 sm:px-4" : "h-14 sm:h-16"
              }`}
          >
            {/* Glass logo button */}
            <Link
              href="/"
              className="flex items-center gap-2 group"        
            >
              <div className="relative">
                {/* Border glow spots */}
                <div
                  className="absolute -top-[0.5px] -left-[0.5px] w-6 h-6 rounded-lg blur-[0.5px]"
                  style={{
                    background:
                      "radial-gradient(ellipse at top left, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.4) 30%, transparent 60%)",
                  }}
                />

                {/* Glass container */}
                <div className="relative w-8 h-8 sm:w-8 sm:h-8 rounded-lg bg-surface/80 backdrop-blur-sm border border-white/10 flex items-center justify-center overflow-hidden group-hover:opacity-80 transition-all">
                  {/* Inner glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
                  <Image
                    src="/sign.png"
                    alt="MemContext Logo"
                    width={20}
                    height={20}
                    className="w-5 h-5 sm:w-5 sm:h-5 relative z-10"
                  />
                </div>
              </div>
              <span className="text-lg sm:text-xl group-hover:opacity-80 transition-opacity">
                MemContext
              </span>

            </Link>
            <div className="hidden md:flex items-center gap-8 lg:gap-10">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-sm lg:text-base text-foreground-muted hover:text-foreground transition-colors link-underline"
                >
                  {item.name}
                </Link>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-4 lg:gap-5">
              <a
                href="https://aysh.me/X"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground-muted hover:text-foreground transition-colors hover:scale-110 duration-200"
              >
                <XIcon className="w-5 h-5 lg:w-6 lg:h-6" />
              </a>
              <button
                onClick={() => setShowGithubModal(true)}
                className="text-foreground-muted hover:text-foreground transition-colors hover:scale-110 duration-200"
              >
                <BsGithub className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
              <button
                onClick={scrollToTop}
                className="px-4 flex items-center gap-2 lg:px-5 py-1.5 lg:py-2 text-sm lg:text-base font-medium bg-accent text-foreground cursor-pointer rounded-lg transition-all"
              >
                Join Waitlist

              </button>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-foreground-muted hover:text-foreground transition-colors"
            >
              <div className="relative w-6 h-6">
                <Menu
                  className={`w-6 h-6 absolute transition-all duration-200 ${isMobileMenuOpen ? "opacity-0 rotate-90" : "opacity-100 rotate-0"}`}
                />
                <X
                  className={`w-6 h-6 absolute transition-all duration-200 ${isMobileMenuOpen ? "opacity-100 rotate-0" : "opacity-0 -rotate-90"}`}
                />
              </div>
            </button>
          </div>

          {/* Mobile Menu */}
          <div
            className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${isMobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
          >
            <div
              className={`py-4 space-y-1 mt-2 rounded-xl bg-surface/95 backdrop-blur-md border border-border/50 px-2`}
            >
              {navigation.map((item, index) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-3 text-base text-foreground-muted hover:text-foreground hover:bg-surface-elevated rounded-lg px-3 transition-all"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {item.name}
                </Link>
              ))}
              <button
                onClick={() => {
                  setShowGithubModal(true);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 py-3 text-base text-foreground-muted hover:text-foreground hover:bg-surface-elevated rounded-lg px-3 transition-all w-full"
              >
                <BsGithub className="w-5 h-5" />
                GitHub
              </button>
              <button
                onClick={scrollToTop}
                className="block w-full mt-3 px-5 py-3 text-center text-base font-medium bg-accent text-background rounded-xl "
              >
                Join Waitlist
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* GitHub Coming Soon Modal */}
      {showGithubModal && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in"
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
                <BsGithub className="w-7 h-7 sm:w-8 sm:h-8" />
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
                <BsGithub className="w-4 h-4 sm:w-5 sm:h-5" />
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
