"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  SquaresFour,
  Brain,
  Key,
  GearSix,
  List,
  X,
  Sun,
  Moon,
  Plugs,
  User,
  SignOut,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState, useSyncExternalStore, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { signOut } from "@/lib/auth-client";

function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

interface UserProfile {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: SquaresFour,
  },
  {
    label: "Memories",
    href: "/memories",
    icon: Brain,
  },
  {
    label: "API Keys",
    href: "/api-keys",
    icon: Key,
  },
  {
    label: "MCP Setup",
    href: "/mcp",
    icon: Plugs,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: GearSix,
  },
];

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function UserProfileDropdown({
  user,
  onClose,
}: {
  user: UserProfile["user"] | undefined;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push("/login");
    } catch {
      setIsSigningOut(false);
    }
  };

  const handleSettings = () => {
    router.push("/settings");
    onClose();
  };

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 mx-2 rounded-xl border border-border bg-surface shadow-xl animate-scale-in overflow-hidden">
      {/* User Info */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border overflow-hidden flex items-center justify-center shrink-0">
            {user?.image ? (
              <Image
                src={user.image}
                alt={user.name || "User"}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <User
                className="h-5 w-5 text-foreground-muted"
                weight="duotone"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-foreground-muted truncate">
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-1.5">
        <button
          onClick={handleSettings}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground-muted hover:text-foreground hover:bg-surface-elevated rounded-lg transition-colors"
        >
          <GearSix className="h-4 w-4" weight="duotone" />
          Settings
        </button>
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-error hover:bg-error/10 rounded-lg transition-colors disabled:opacity-50"
        >
          <SignOut className="h-4 w-4" weight="duotone" />
          {isSigningOut ? "Signing out..." : "Sign Out"}
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useIsMounted();
  const profileRef = useRef<HTMLDivElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<UserProfile>("/api/user/profile"),
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const user = profile?.user;

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? (
          <X className="h-5 w-5" weight="bold" />
        ) : (
          <List className="h-5 w-5" weight="bold" />
        )}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden animate-backdrop-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-background/95 backdrop-blur-sm transition-transform duration-300 md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-border px-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 font-semibold text-lg group"
              onClick={() => setMobileOpen(false)}
            >
              {/* Glass logo container matching website header */}
              <div className="relative">
                {/* Border glow spots */}
                <div
                  className="absolute -top-[0.5px] -left-[0.5px] w-6 h-6 rounded-lg blur-[0.5px]"
                  style={{
                    background:
                      "radial-gradient(ellipse at top left, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.3) 30%, transparent 60%)",
                  }}
                />
                {/* Glass container */}
                <div className="relative w-8 h-8 rounded-lg bg-surface/80 backdrop-blur-sm border border-white/10 flex items-center justify-center overflow-hidden group-hover:opacity-80 transition-all">
                  {/* Inner glow */}
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
              <span className="group-hover:opacity-80 transition-opacity">
                MemContext
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-accent/10 text-accent border border-accent/20"
                      : "text-foreground-muted hover:bg-surface-elevated hover:text-foreground border border-transparent",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isActive ? "text-accent" : "text-foreground-muted",
                    )}
                    weight={isActive ? "fill" : "duotone"}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-border p-4 space-y-3">
            {/* Theme Toggle */}
            {mounted && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-foreground-muted hover:text-foreground"
                onClick={() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark")
                }
              >
                {resolvedTheme === "dark" ? (
                  <>
                    <Sun className="h-4 w-4" weight="duotone" />
                    Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4" weight="duotone" />
                    Dark Mode
                  </>
                )}
              </Button>
            )}

            {/* Beta Testing Info */}
            <div className="p-3 rounded-xl bg-surface-elevated/50 border border-border space-y-2">
              <p className="text-xs text-foreground-muted leading-relaxed">
                Thanks for beta testing! Report issues to{" "}
                <a
                  href="mailto:hi@aysh.me"
                  className="text-accent hover:underline"
                >
                  hi@aysh.me
                </a>
              </p>
              {/* Chat on X Badge */}
              <a
                href="https://aysh.me/X"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-foreground/5 hover:bg-foreground/10 transition-colors w-fit"
              >
                <XIcon className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Chat on X</span>
                <span className="text-xs text-foreground-muted">@theayush</span>
                <ArrowSquareOut
                  className="h-3 w-3 text-foreground-subtle"
                  weight="bold"
                />
              </a>
            </div>

            {/* User Profile */}
            <div className="relative" ref={profileRef}>
              {profileOpen && (
                <UserProfileDropdown
                  user={user}
                  onClose={() => setProfileOpen(false)}
                />
              )}
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-xl transition-colors",
                  profileOpen
                    ? "bg-surface-elevated"
                    : "hover:bg-surface-elevated",
                )}
              >
                <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border overflow-hidden flex items-center justify-center shrink-0">
                  {user?.image ? (
                    <Image
                      src={user.image}
                      alt={user.name || "User"}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User
                      className="h-4 w-4 text-foreground-muted"
                      weight="duotone"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-foreground-muted truncate">
                    {user?.email || "Loading..."}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
