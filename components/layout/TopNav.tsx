"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Menu, X, LayoutDashboard, ShoppingCart, CheckSquare,
  Receipt, Package, Sparkles, Home, Settings,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { href: "/chores",     label: "Chores",      icon: CheckSquare },
  { href: "/bills",      label: "Bills",       icon: Receipt },
  { href: "/inventory",  label: "Inventory",   icon: Package },
  { href: "/insights",   label: "Insights",    icon: Sparkles },
  { href: "/groceries",  label: "Groceries",   icon: ShoppingCart },
  { href: "/household",  label: "Household",   icon: Home },
  { href: "/settings",   label: "Settings",    icon: Settings },
];

// These show in the top pill nav; the rest are in the mobile drawer only
const primaryNav = ["/dashboard", "/chores", "/bills", "/inventory", "/insights", "/household", "/groceries"];

export function TopNav() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 w-full border-b border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">

          {/* Logo — dark mode uses narla-logo.png, light mode uses narla-logo-light.png */}
          <Link href="/dashboard" className="flex-shrink-0">
            <Image src="/narla-logo.png" alt="narla" width={110} height={55} className="hidden dark:block w-auto h-11" priority />
            <Image src="/narla-logo-lightt.png" alt="narla" width={110} height={55} className="block dark:hidden w-auto h-[72px] brightness-110" priority />
          </Link>

          {/* Pill nav — desktop */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 px-4">
            {navItems
              .filter((n) => primaryNav.includes(n.href))
              .map(({ href, label }) => {
                const isActive = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                      isActive
                        ? "bg-black/10 dark:bg-white/15 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white/80 hover:bg-black/5 dark:hover:bg-white/8"
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2 ml-auto">
            <ThemeToggle />
            <NotificationBell />
            <Link
              href="/settings"
              className={cn(
                "p-2 rounded-full transition-colors",
                pathname === "/settings"
                  ? "bg-black/10 dark:bg-white/15 text-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white/80 hover:bg-black/5 dark:hover:bg-white/10"
              )}
            >
              <Settings className="w-4 h-4" />
            </Link>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>

          {/* Hamburger — mobile */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden p-2 rounded-lg text-white/60 hover:bg-white/10 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── Mobile Drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-[#0d0d17] border-r border-white/10 flex flex-col shadow-2xl">
            <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
              <Image src="/narla-logo.png" alt="narla" width={110} height={55} className="w-auto" />
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-white/40 hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
              <ul className="space-y-0.5">
                {navItems.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href || pathname.startsWith(href + "/");
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={() => setDrawerOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                          isActive
                            ? "bg-pink-500/10 text-pink-300"
                            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                        )}
                      >
                        <Icon style={{ width: 18, height: 18 }} className={isActive ? "text-pink-300" : "text-slate-500"} />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
