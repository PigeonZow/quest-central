"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsEntry {
  architecture_type: string;
  difficulty: string;
  avg_time: number;
  count: number;
}

// Format architecture_type for display (e.g. "single_call" → "Single Call")
function formatArch(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const ARCH_COLORS: Record<string, string> = {
  single_call: "#C8A84E",
  multi_agent: "#5A7B8E",
  crew: "#6B8E5A",
  pipeline: "#8E6B5A",
  swarm: "#7B5A8E",
  custom: "#8E5A5A",
};

const TOOLTIP_STYLE = {
  backgroundColor: "#151515",
  border: "1px solid #2A2A24",
  borderRadius: "2px",
};

const DIFF_ORDER = ["C", "B", "A", "S"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => {
        setData(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="font-heading text-xl font-semibold tracking-wide mb-6">Analytics</h1>
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="font-heading text-xl font-semibold tracking-wide mb-6">Analytics</h1>
        <div className="card-rpg rounded-sm h-64 flex items-center justify-center text-muted-foreground text-sm">
          No completed quests yet. Complete and rank some quests to see analytics.
        </div>
      </div>
    );
  }

  const architectures = [...new Set(data.map((d) => d.architecture_type))];

  const timeByDifficulty = DIFF_ORDER.map((diff) => {
    const entry: Record<string, string | number> = { difficulty: `${diff}-Rank` };
    for (const arch of architectures) {
      const match = data.find(
        (d) => d.difficulty === diff && d.architecture_type === arch
      );
      entry[arch] = match?.avg_time ?? 0;
    }
    return entry;
  });

  const attemptsByArch = architectures.map((arch) => {
    const entries = data.filter((d) => d.architecture_type === arch);
    const totalCount = entries.reduce((s, e) => s + e.count, 0);
    return {
      name: formatArch(arch),
      architecture_type: arch,
      attempts: totalCount,
    };
  }).sort((a, b) => b.attempts - a.attempts);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="font-heading text-xl font-semibold tracking-wide">Analytics</h1>

      {/* Completion time by difficulty */}
      <div className="card-rpg rounded-sm">
        <div className="px-5 py-3 border-b border-border/40">
          <h2 className="font-heading text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Completion Time by Architecture & Difficulty (s)
          </h2>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={timeByDifficulty}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A24" />
              <XAxis dataKey="difficulty" stroke="#7A7462" tick={{ fontSize: 11 }} />
              <YAxis stroke="#7A7462" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#C4B998" }} />
              <Legend
                formatter={(value: string) =>
                  formatArch(value)
                }
              />
              {architectures.map((arch) => (
                <Bar
                  key={arch}
                  dataKey={arch}
                  fill={ARCH_COLORS[arch] ?? "#666"}
                  radius={[2, 2, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attempts by architecture */}
      <div className="card-rpg rounded-sm">
        <div className="px-5 py-3 border-b border-border/40">
          <h2 className="font-heading text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
            Total Attempts by Architecture
          </h2>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={attemptsByArch} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A24" />
              <XAxis type="number" stroke="#7A7462" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#7A7462"
                width={100}
                tick={{ fontSize: 11 }}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="attempts" fill="#C8A84E" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
