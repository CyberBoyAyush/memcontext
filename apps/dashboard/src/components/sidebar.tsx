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
  ShieldCheck,
  CaretUpDown,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState, useSyncExternalStore, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { signOut } from "@/lib/auth-client";
import { useSidebar } from "@/providers/sidebar-provider";

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
    role: string;
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

const adminNavItem = {
  label: "Admin",
  href: "/legend",
  icon: ShieldCheck,
};

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { collapsed, setCollapsed, hoverPeek, setHoverPeek } = useSidebar();
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
      {/* Mobile menu button - only show when sidebar is closed */}
      {!mobileOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden cursor-pointer"
          onClick={() => setMobileOpen(true)}
        >
          <List className="h-5 w-5" weight="bold" />
        </Button>
      )}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/20 backdrop-blur-md md:hidden animate-backdrop-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-background/95 backdrop-blur-sm transition-all duration-300 overflow-visible",
          mobileOpen ? "translate-x-0 w-64" : "-translate-x-full",
          "md:translate-x-0",
          collapsed ? "md:w-16" : hoverPeek ? "md:w-60" : "md:w-64",
        )}
      >
        {/* Desktop collapse button - vertical bar on the right edge */}
        {/* Wide transparent hover area prevents wobble when sidebar shrinks */}
        <button
          className={cn(
            "hidden md:flex absolute top-1/2 -translate-y-1/2 z-50 items-center justify-end cursor-pointer py-4 group transition-all duration-200",
            hoverPeek ? "-right-8 pr-6 pl-2" : "-right-4 pr-2 pl-2",
          )}
          onClick={() => setCollapsed(!collapsed)}
          onMouseEnter={() => !collapsed && setHoverPeek(true)}
          onMouseLeave={() => setHoverPeek(false)}
        >
          <div className="w-1 h-8 rounded-full bg-border-hover transition-all duration-200 group-hover:h-12 group-hover:bg-foreground-muted" />
        </button>

        <div className="flex h-full flex-col">
          {/* Logo */}
          <div
            className={cn(
              "flex h-16 items-center justify-between shrink-0 transition-all duration-300 px-6",
              collapsed && "md:px-3 md:justify-center",
            )}
          >
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 font-semibold text-lg group"
              onClick={() => setMobileOpen(false)}
            >
              {/* Glass logo container */}
              <div className="relative shrink-0">
                <div
                  className="absolute -top-[0.5px] -left-[0.5px] w-6 h-6 rounded-lg blur-[0.5px]"
                  style={{
                    background:
                      "radial-gradient(ellipse at top left, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.3) 30%, transparent 60%)",
                  }}
                />
                <div
                  className="relative w-8 h-8 rounded-lg backdrop-blur-sm flex items-center justify-center overflow-hidden group-hover:opacity-80 transition-all"
                  style={{
                    backgroundColor: "#111111",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
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
              <span
                className={cn(
                  "group-hover:opacity-80 transition-opacity whitespace-nowrap",
                  collapsed && "md:hidden",
                )}
              >
                MemContext
              </span>
            </Link>
            {/* Mobile close button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8 cursor-pointer"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" weight="bold" />
            </Button>
          </div>

          {/* Navigation */}
          <nav
            className={cn(
              "flex-1 space-y-1 transition-all duration-300 p-4",
              collapsed && "md:p-2",
            )}
          >
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 px-4 py-3",
                    collapsed && "md:p-3 md:justify-center",
                    isActive
                      ? "bg-border text-sidebar-active border border-border"
                      : "text-foreground-muted hover:bg-surface-elevated hover:text-foreground border border-transparent",
                  )}
                >
                  <item.icon
                    size={20}
                    className={cn(
                      "transition-colors shrink-0",
                      isActive
                        ? "text-sidebar-active"
                        : "text-foreground-muted",
                    )}
                    weight={isActive ? "fill" : "duotone"}
                  />
                  <span className={cn(collapsed && "md:hidden")}>
                    {item.label}
                  </span>
                </Link>
              );
            })}

            {/* Admin Link */}
            {user?.role === "admin" && (
              <>
                <div className="my-2 border-t border-border/50" />
                <Link
                  href={adminNavItem.href}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? adminNavItem.label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 px-4 py-3",
                    collapsed && "md:p-3 md:justify-center",
                    pathname.startsWith("/legend")
                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      : "text-foreground-muted hover:bg-surface-elevated hover:text-foreground border border-transparent",
                  )}
                >
                  <adminNavItem.icon
                    className={cn(
                      "h-5 w-5 transition-colors shrink-0",
                      pathname.startsWith("/legend")
                        ? "text-amber-500"
                        : "text-foreground-muted",
                    )}
                    weight={pathname.startsWith("/legend") ? "fill" : "duotone"}
                  />
                  <span className={cn(collapsed && "md:hidden")}>
                    {adminNavItem.label}
                  </span>
                </Link>
              </>
            )}
          </nav>

          {/* Footer */}
          <div
            className={cn(
              "border-t border-border space-y-3 transition-all duration-300 overflow-visible p-4",
              collapsed && "md:p-2",
            )}
          >
            {/* Beta Testing Info - hide when collapsed on desktop */}
            <div
              className={cn(
                "p-3 rounded-xl bg-surface-elevated/50 border border-border space-y-2",
                collapsed && "md:hidden",
              )}
            >
              <p className="text-xs text-foreground-muted leading-relaxed">
                Thanks for beta testing! Report issues to{" "}
                <a
                  href="mailto:hi@aysh.me"
                  className="text-accent hover:underline"
                >
                  hi@aysh.me
                </a>
              </p>
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
              {profileOpen && mounted && (
                <div
                  className={cn(
                    "absolute z-[100] rounded-xl border border-border bg-surface shadow-xl animate-scale-in overflow-hidden bottom-full left-0 right-0 mb-2",
                    collapsed &&
                      "md:bottom-0 md:left-full md:right-auto md:ml-2 md:mb-0 md:w-56",
                  )}
                >
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
                      onClick={() => {
                        router.push("/settings");
                        setProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground-muted hover:text-foreground hover:bg-surface-elevated rounded-lg transition-colors"
                    >
                      <GearSix className="h-4 w-4" weight="duotone" />
                      Settings
                    </button>
                    <button
                      onClick={() =>
                        setTheme(resolvedTheme === "dark" ? "light" : "dark")
                      }
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground-muted hover:text-foreground hover:bg-surface-elevated rounded-lg transition-colors"
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
                    </button>
                    <div className="my-1 border-t border-border" />
                    <button
                      onClick={async () => {
                        await signOut();
                        router.push("/login");
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-error hover:bg-error/10 rounded-lg transition-colors"
                    >
                      <SignOut className="h-4 w-4" weight="duotone" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                title={collapsed ? user?.name || "User" : undefined}
                className={cn(
                  "w-full flex items-center cursor-pointer rounded-xl border transition-colors gap-3 p-2.5",
                  collapsed && "md:p-2 md:justify-center",
                  profileOpen
                    ? "bg-surface-elevated border-border"
                    : "bg-surface border-border/50 hover:bg-surface-elevated hover:border-border",
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
                <div
                  className={cn(
                    "flex-1 min-w-0 text-left",
                    collapsed && "md:hidden",
                  )}
                >
                  <p className="text-sm font-medium truncate">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-foreground-muted truncate">
                    {user?.email || "Loading..."}
                  </p>
                </div>
                <CaretUpDown
                  className={cn(
                    "h-4 w-4 text-foreground-muted shrink-0",
                    collapsed && "md:hidden",
                  )}
                  weight="bold"
                />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
