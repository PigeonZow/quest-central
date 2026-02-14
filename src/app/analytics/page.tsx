"use client";

import { useEffect, useState } from "react";
import { ARCHITECTURE_LABELS } from "@/lib/constants";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
} from "recharts";

interface AnalyticsEntry {
  architecture_type: string;
  difficulty: string;
  avg_score: number;
  avg_time: number;
  count: number;
  win_rate: number;
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
          No scored quests yet. Complete and score some quests to see analytics.
        </div>
      </div>
    );
  }

  const architectures = [...new Set(data.map((d) => d.architecture_type))];

  const scoreByDifficulty = DIFF_ORDER.map((diff) => {
    const entry: Record<string, string | number> = { difficulty: `${diff}-Rank` };
    for (const arch of architectures) {
      const match = data.find(
        (d) => d.difficulty === diff && d.architecture_type === arch
      );
      entry[arch] = match?.avg_score ?? 0;
    }
    return entry;
  });

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

  const winRateByArch = architectures.map((arch) => {
    const entries = data.filter((d) => d.architecture_type === arch);
    const totalWins = entries.reduce((s, e) => s + e.win_rate * e.count, 0);
    const totalCount = entries.reduce((s, e) => s + e.count, 0);
    return {
      name: ARCHITECTURE_LABELS[arch] ?? arch,
      architecture_type: arch,
      win_rate: totalCount > 0 ? Math.round(totalWins / totalCount) : 0,
    };
  }).sort((a, b) => b.win_rate - a.win_rate);

  const scatterData = data.map((d) => ({
    x: d.avg_time,
    y: d.avg_score,
    name: `${ARCHITECTURE_LABELS[d.architecture_type] ?? d.architecture_type} (${d.difficulty})`,
    arch: d.architecture_type,
    difficulty: d.difficulty,
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="font-heading text-xl font-semibold tracking-wide">Analytics</h1>

      {/* Score by difficulty */}
      <div className="card-rpg rounded-sm">
        <div className="px-5 py-3 border-b border-border/40">
          <h2 className="font-heading text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Average Score by Architecture & Difficulty
          </h2>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={scoreByDifficulty}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A24" />
              <XAxis dataKey="difficulty" stroke="#7A7462" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} stroke="#7A7462" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#C4B998" }} />
              <Legend
                formatter={(value: string) =>
                  ARCHITECTURE_LABELS[value] ?? value
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Completion time */}
        <div className="card-rpg rounded-sm">
          <div className="px-5 py-3 border-b border-border/40">
            <h2 className="font-heading text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
              Completion Time by Difficulty (s)
            </h2>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={timeByDifficulty}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A24" />
                <XAxis dataKey="difficulty" stroke="#7A7462" tick={{ fontSize: 11 }} />
                <YAxis stroke="#7A7462" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#C4B998" }} />
                <Legend
                  formatter={(value: string) =>
                    ARCHITECTURE_LABELS[value] ?? value
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

        {/* Win rate */}
        <div className="card-rpg rounded-sm">
          <div className="px-5 py-3 border-b border-border/40">
            <h2 className="font-heading text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
              Win Rate by Architecture
            </h2>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={winRateByArch} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A24" />
                <XAxis type="number" domain={[0, 100]} stroke="#7A7462" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#7A7462"
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="win_rate" radius={[0, 2, 2, 0]}>
                  {winRateByArch.map((entry) => (
                    <Cell
                      key={entry.architecture_type}
                      fill={ARCH_COLORS[entry.architecture_type] ?? "#666"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Scatter */}
      <div className="card-rpg rounded-sm">
        <div className="px-5 py-3 border-b border-border/40">
          <h2 className="font-heading text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
            Score vs Completion Time
          </h2>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A24" />
              <XAxis
                dataKey="x"
                name="Time (s)"
                stroke="#7A7462"
                tick={{ fontSize: 11 }}
                label={{ value: "Time (s)", position: "bottom", fill: "#7A7462", fontSize: 10 }}
              />
              <YAxis
                dataKey="y"
                name="Score"
                domain={[0, 100]}
                stroke="#7A7462"
                tick={{ fontSize: 11 }}
                label={{ value: "Score", angle: -90, position: "insideLeft", fill: "#7A7462", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: any, name: any) => [String(value), name === "x" ? "Time (s)" : "Score"]) as any}
              />
              {architectures.map((arch) => (
                <Scatter
                  key={arch}
                  name={ARCHITECTURE_LABELS[arch] ?? arch}
                  data={scatterData.filter((d) => d.arch === arch)}
                  fill={ARCH_COLORS[arch] ?? "#666"}
                />
              ))}
              <Legend />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
