"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Scroll,
  Swords,
  Trophy,
  BarChart3,
  BookOpen,
  LayoutDashboard,
  Coins,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DEMO_USER_ID, DEMO_USER_2_ID } from "@/lib/constants";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/quests", label: "Quests", icon: Scroll, countKey: "quests" as const },
  { href: "/parties", label: "Parties", icon: Swords, countKey: "parties" as const },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/docs", label: "API Docs", icon: BookOpen },
];

const USERS = [
  { id: DEMO_USER_ID, name: "questmaster69" },
  { id: DEMO_USER_2_ID, name: "agentmaxxer420" },
];

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${60 * 60 * 24 * 365}`;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [gold, setGold] = useState<number | null>(null);
  const [questCount, setQuestCount] = useState<number | null>(null);
  const [partyCount, setPartyCount] = useState<number | null>(null);
  const [userId, setUserId] = useState(DEMO_USER_ID);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentUser = USERS.find((u) => u.id === userId) ?? USERS[0];

  const switchUser = useCallback(
    (newUserId: string) => {
      setCookie("qc_user_id", newUserId);
      setUserId(newUserId);
      setDropdownOpen(false);
      router.refresh();
    },
    [router]
  );

  // Read cookie after hydration to avoid SSR mismatch
  useEffect(() => {
    const cookieUserId = getCookie("qc_user_id");
    if (cookieUserId && cookieUserId !== userId && USERS.some((u) => u.id === cookieUserId)) {
      setUserId(cookieUserId);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const supabase = createClient();

    // Fetch gold
    function fetchGold() {
      supabase
        .from("profiles")
        .select("gold")
        .eq("id", userId)
        .single()
        .then(({ data }) => {
          if (data) setGold(data.gold ?? 0);
        });
    }
    fetchGold();

    // Fetch quest count (all active quests)
    supabase
      .from("quests")
      .select("*", { count: "exact", head: true })
      .in("status", ["open", "in_progress", "review"])
      .then(({ count }) => {
        setQuestCount(count ?? 0);
      });

    // Fetch party count (per-user)
    supabase
      .from("parties")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", userId)
      .then(({ count }) => {
        setPartyCount(count ?? 0);
      });

    // Listen for gold-changed events from other pages (e.g. quest creation)
    const onGoldChanged = () => fetchGold();
    window.addEventListener("gold-changed", onGoldChanged);

    const channel = supabase
      .channel("navbar-stats")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as { gold?: number };
          if (updated.gold !== undefined) setGold(updated.gold);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quests" },
        () => {
          supabase
            .from("quests")
            .select("*", { count: "exact", head: true })
            .in("status", ["open", "in_progress", "review"])
            .then(({ count }) => setQuestCount(count ?? 0));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parties" },
        () => {
          supabase
            .from("parties")
            .select("*", { count: "exact", head: true })
            .eq("owner_id", userId)
            .then(({ count }) => setPartyCount(count ?? 0));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("gold-changed", onGoldChanged);
    };
  }, [userId]);

  const counts: Record<string, number | null> = {
    quests: questCount,
    parties: partyCount,
  };

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
            const count = item.countKey ? counts[item.countKey] : null;
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
                {count !== null && (
                  <span className="text-[10px] font-normal text-muted-foreground/60">
                    ({count})
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side: Gold + User Switcher */}
        <div className="ml-auto flex items-center gap-5">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-gold" />
            <span className="font-heading text-sm font-bold text-gold tracking-wide">
              {gold !== null ? gold.toLocaleString() : "..."}
            </span>
          </div>

          {/* User Switcher */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="font-heading text-xs font-medium tracking-wide">
                {currentUser.name}
              </span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 z-50 w-44 rounded-sm border border-border/60 bg-[#0A0A0A] shadow-lg">
                  {USERS.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => switchUser(user.id)}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        user.id === userId
                          ? "text-gold bg-gold/5"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      }`}
                    >
                      {user.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
