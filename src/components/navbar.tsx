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
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border/60 bg-[#0A0A0A]/95 backdrop-blur-sm">
      <div className="flex h-full items-center px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 mr-10">
          <span className="text-2xl font-bold text-gold leading-none">!</span>
          <span className="font-heading text-sm font-semibold tracking-wider text-foreground uppercase">
            Quest Central
          </span>
        </Link>

        {/* Nav Links */}
        <div className="nav-glow flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`glow-text glow-self flex items-center gap-2 px-3 py-1.5 text-xs font-medium tracking-wide uppercase transition-colors ${
                  isActive
                    ? "text-gold glow-on"
                    : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-3.5 w-3.5 relative" />
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
