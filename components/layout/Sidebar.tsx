"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  CheckSquare,
  Receipt,
  Package,
  Sparkles,
  Home,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHousehold } from "@/lib/contexts/HouseholdContext";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/groceries", label: "Groceries", icon: ShoppingCart },
  { href: "/chores", label: "Chores", icon: CheckSquare },
  { href: "/bills", label: "Bills", icon: Receipt },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/household", label: "Household", icon: Home },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { household, members } = useHousehold();

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-white dark:bg-[#0d0d17] border-r border-slate-200 dark:border-white/10 h-screen sticky top-0 flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100 dark:border-white/10">
        <Image
          src="/narla-logo.png"
          alt="narla"
          width={110}
          height={55}
          className="w-auto"
          priority
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-indigo-50 text-indigo-700 dark:bg-pink-500/10 dark:text-pink-300"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-white/5 dark:hover:text-slate-200"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4.5 h-4.5 flex-shrink-0",
                      isActive ? "text-indigo-600 dark:text-pink-300" : "text-slate-400"
                    )}
                    style={{ width: 18, height: 18 }}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Household footer */}
      {household && (
        <div className="px-4 py-4 border-t border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-100 dark:bg-pink-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-indigo-600 dark:text-pink-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {household.name}
              </p>
              <p className="text-xs text-slate-400">
                {members.length} member{members.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
