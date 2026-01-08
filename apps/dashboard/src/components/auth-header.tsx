"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { BsGithub } from "react-icons/bs";

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const navigation = [
  { name: "Features", href: "https://memcontext.in/#features" },
  { name: "How it Works", href: "https://memcontext.in/#how-it-works" },
  { name: "FAQ", href: "https://memcontext.in/#faq" },
];

export function AuthHeader() {
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

  return (
    <>
      <header
        className={`fixed top-0 mx-2 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? "py-3 sm:py-4" : "py-2 sm:py-3"
        }`}
      >
        <nav
          className={`mx-auto max-w-5xl px-4 sm:px-6 transition-all duration-500 border rounded-xl ${
            scrolled
              ? "backdrop-blur-md shadow-lg mx-4 sm:mx-6 lg:mx-auto"
              : "border-transparent bg-transparent"
          }`}
          style={{
            backgroundColor: scrolled ? "rgba(17, 17, 17, 0.9)" : "transparent",
            borderColor: scrolled ? "#1f1f1f" : "transparent",
          }}
        >
          <div
            className={`flex items-center justify-between transition-all duration-500 ${
              scrolled ? "h-12 sm:h-14 px-2 sm:px-4" : "h-14 sm:h-16"
            }`}
          >
            {/* Glass logo button */}
            <Link
              href="https://memcontext.in"
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
                <div
                  className="relative w-8 h-8 sm:w-8 sm:h-8 rounded-lg backdrop-blur-sm border border-white/10 flex items-center justify-center overflow-hidden group-hover:opacity-80 transition-all"
                  style={{ backgroundColor: "rgba(17, 17, 17, 0.8)" }}
                >
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
              <span
                className="font-semibold text-lg group-hover:opacity-80 transition-opacity"
                style={{ color: "#fafafa" }}
              >
                MemContext
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-8 lg:gap-10">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm lg:text-base transition-colors link-underline hover:opacity-100"
                  style={{ color: "#a1a1a1" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#fafafa")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#a1a1a1")
                  }
                >
                  {item.name}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-4 lg:gap-5">
              <a
                href="https://aysh.me/X"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:scale-110 duration-200"
                style={{ color: "#a1a1a1" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#fafafa")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#a1a1a1")}
              >
                <XIcon className="w-5 h-5 lg:w-6 lg:h-6" />
              </a>
              <button
                onClick={() => setShowGithubModal(true)}
                className="transition-colors hover:scale-110 duration-200"
                style={{ color: "#a1a1a1" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#fafafa")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#a1a1a1")}
              >
                <BsGithub className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
              <a
                href="https://memcontext.in"
                className="px-4 flex items-center gap-2 lg:px-5 py-1.5 lg:py-2 text-sm lg:text-base font-medium cursor-pointer rounded-lg transition-all"
                style={{ backgroundColor: "#e8613c", color: "#ffffff" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#d95530")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#e8613c")
                }
              >
                Home
              </a>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 transition-colors"
              style={{ color: "#a1a1a1" }}
            >
              <div className="relative w-6 h-6">
                <Menu
                  className={`w-6 h-6 absolute transition-all duration-200 ${
                    isMobileMenuOpen
                      ? "opacity-0 rotate-90"
                      : "opacity-100 rotate-0"
                  }`}
                />
                <X
                  className={`w-6 h-6 absolute transition-all duration-200 ${
                    isMobileMenuOpen
                      ? "opacity-100 rotate-0"
                      : "opacity-0 -rotate-90"
                  }`}
                />
              </div>
            </button>
          </div>

          {/* Mobile Menu */}
          <div
            className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
              isMobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div
              className="py-4 space-y-1 mt-2 rounded-xl backdrop-blur-md px-2"
              style={{
                backgroundColor: "rgba(17, 17, 17, 0.95)",
                border: "1px solid rgba(31, 31, 31, 0.5)",
              }}
            >
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-3 text-base rounded-lg px-3 transition-all"
                  style={{ color: "#a1a1a1" }}
                >
                  {item.name}
                </a>
              ))}
              <button
                onClick={() => {
                  setShowGithubModal(true);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 py-3 text-base rounded-lg px-3 transition-all w-full"
                style={{ color: "#a1a1a1" }}
              >
                <BsGithub className="w-5 h-5" />
                GitHub
              </button>
              <a
                href="https://memcontext.in"
                className="block w-full mt-3 px-5 py-3 text-center text-base font-medium rounded-xl"
                style={{ backgroundColor: "#e8613c", color: "#ffffff" }}
              >
                Home
              </a>
            </div>
          </div>
        </nav>
      </header>

      {/* GitHub Coming Soon Modal */}
      {showGithubModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
          style={{ backgroundColor: "rgba(10, 10, 10, 0.8)" }}
          onClick={() => setShowGithubModal(false)}
        >
          <div
            className="relative rounded-2xl p-6 sm:p-10 max-w-md w-full shadow-xl animate-fade-in-up"
            style={{
              backgroundColor: "#0a0a0a",
              border: "1px solid #1f1f1f",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowGithubModal(false)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 transition-colors hover:rotate-90 duration-200"
              style={{ color: "#6b6b6b" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fafafa")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#6b6b6b")}
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <div className="text-center">
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#171717" }}
              >
                <BsGithub
                  className="w-7 h-7 sm:w-8 sm:h-8"
                  style={{ color: "#fafafa" }}
                />
              </div>
              <h3
                className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3"
                style={{ color: "#fafafa" }}
              >
                Coming Soon
              </h3>
              <p
                className="text-sm sm:text-base mb-6 sm:mb-8"
                style={{ color: "#a1a1a1" }}
              >
                MemContext will be open source soon. Star the repo to get
                notified when we go public.
              </p>
              <a
                href="https://github.com/cyberboyayush"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium rounded-xl btn-hover-lift transition-all"
                style={{ backgroundColor: "#e8613c", color: "#ffffff" }}
              >
                <BsGithub className="w-4 h-4 sm:w-5 sm:h-5" />
                Follow on GitHub
              </a>
              <p
                className="mt-4 sm:mt-5 text-xs sm:text-sm font-mono"
                style={{ color: "#6b6b6b" }}
              >
                github.com/cyberboyayush
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
