"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
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
  single_call: "#FFD700",
  multi_agent: "#3B82F6",
  crew: "#22C55E",
  pipeline: "#F97316",
  swarm: "#7B2FBE",
  custom: "#EF4444",
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
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <BarChart3 className="h-6 w-6 text-gold" />
          Analytics
        </h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <BarChart3 className="h-6 w-6 text-gold" />
          Analytics
        </h1>
        <Card>
          <CardContent className="h-80 flex items-center justify-center text-muted-foreground">
            No scored quests yet. Complete and score some quests to see analytics.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get unique architectures
  const architectures = [...new Set(data.map((d) => d.architecture_type))];

  // Transform for grouped bar chart: one entry per difficulty, with arch scores as fields
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

  // Time by difficulty
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

  // Win rate by architecture (aggregate across difficulties)
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

  // Scatter: score vs time for each attempt group
  const scatterData = data.map((d) => ({
    x: d.avg_time,
    y: d.avg_score,
    name: `${ARCHITECTURE_LABELS[d.architecture_type] ?? d.architecture_type} (${d.difficulty})`,
    arch: d.architecture_type,
    difficulty: d.difficulty,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-gold" />
        Analytics
      </h1>

      {/* THE money chart */}
      <Card>
        <CardHeader>
          <CardTitle>Average Score by Architecture & Difficulty</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={scoreByDifficulty}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="difficulty" stroke="#94a3b8" />
              <YAxis domain={[0, 100]} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a2e",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Legend
                formatter={(value: string) =>
                  ARCHITECTURE_LABELS[value] ?? value
                }
              />
              {architectures.map((arch) => (
                <Bar
                  key={arch}
                  dataKey={arch}
                  fill={ARCH_COLORS[arch] ?? "#888"}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Avg Completion Time by Difficulty (seconds)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={timeByDifficulty}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="difficulty" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a2e",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Legend
                  formatter={(value: string) =>
                    ARCHITECTURE_LABELS[value] ?? value
                  }
                />
                {architectures.map((arch) => (
                  <Bar
                    key={arch}
                    dataKey={arch}
                    fill={ARCH_COLORS[arch] ?? "#888"}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Win rate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Win Rate by Architecture</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={winRateByArch} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#94a3b8"
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a2e",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="win_rate" radius={[0, 4, 4, 0]}>
                  {winRateByArch.map((entry) => (
                    <Cell
                      key={entry.architecture_type}
                      fill={ARCH_COLORS[entry.architecture_type] ?? "#888"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Score vs Time scatter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Score vs Completion Time (Quality-Speed Tradeoff)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="x"
                name="Time (s)"
                stroke="#94a3b8"
                label={{ value: "Time (seconds)", position: "bottom", fill: "#94a3b8" }}
              />
              <YAxis
                dataKey="y"
                name="Score"
                domain={[0, 100]}
                stroke="#94a3b8"
                label={{ value: "Score", angle: -90, position: "insideLeft", fill: "#94a3b8" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a2e",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: any, name: any) => [String(value), name === "x" ? "Time (s)" : "Score"]) as any}
              />
              {architectures.map((arch) => (
                <Scatter
                  key={arch}
                  name={ARCHITECTURE_LABELS[arch] ?? arch}
                  data={scatterData.filter((d) => d.arch === arch)}
                  fill={ARCH_COLORS[arch] ?? "#888"}
                />
              ))}
              <Legend />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
