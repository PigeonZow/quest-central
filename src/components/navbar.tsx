"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Scroll,
  Swords,
  Trophy,
  BarChart3,
  BookOpen,
  LayoutDashboard,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/quests", label: "Quests", icon: Scroll },
  { href: "/parties", label: "Parties", icon: Swords },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/docs", label: "API Docs", icon: BookOpen },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-sidebar">
      <div className="flex h-full items-center px-6">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 mr-8">
          <span className="text-3xl font-bold text-gold leading-none">!</span>
          <span className="text-lg font-bold text-foreground">
            Quest Central
          </span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent text-gold"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
