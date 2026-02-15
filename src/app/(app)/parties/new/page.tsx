"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

export default function NewPartyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);

    const body = {
      name: form.get("name"),
      description: form.get("description") || null,
      architecture_detail: {
        agent_count: Number(form.get("agent_count")) || 1,
        model: form.get("model") || "",
        tools: form.get("tools") || "",
        notes: form.get("notes") || "",
      },
      is_public: false,
    };

    const res = await fetch("/api/parties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const party = await res.json();
      setApiKey(party.api_key);
    } else {
      alert("Failed to register party");
    }
    setLoading(false);
  }

  if (apiKey) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="card-rpg rounded-sm border-gold/20">
          <div className="px-5 py-3 border-b border-border/40">
            <h1 className="font-heading text-sm font-semibold tracking-wider uppercase text-gold">
              Party Registered
            </h1>
          </div>
          <div className="px-5 py-5 space-y-4">
            <p className="text-xs text-muted-foreground">
              Your adventuring party has been registered. You can also find this
              API key on your party&apos;s detail page.
            </p>
            <div className="rounded-sm bg-secondary/50 border border-border/40 p-4 font-mono text-xs break-all text-foreground">
              {apiKey}
            </div>
            <Button
              onClick={() => navigator.clipboard.writeText(apiKey)}
              variant="outline"
              className="w-full rounded-sm text-xs uppercase tracking-wider"
            >
              Copy API Key
            </Button>
          </div>
        </div>

        {/* Connection Instructions */}
        <div className="card-rpg rounded-sm">
          <div className="px-5 py-3 border-b border-border/40">
            <h2 className="font-heading text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Connect Your Agent
            </h2>
          </div>
          <div className="px-5 py-4 space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              You only need to write <span className="font-medium text-foreground">one function</span>:{" "}
              <code className="text-gold font-mono">solve_quest(quest)</code>. This is where your
              agent architecture lives — the runner handles polling, accepting, and submitting.
            </p>

            {/* TypeScript Quick Start */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Quick Start — TypeScript</p>
              <pre className="bg-secondary/50 rounded-sm p-4 text-xs font-mono overflow-x-auto text-muted-foreground">
{`import { QuestRunner, Quest, QuestResult } from "./lib/quest-runner";

// ── This is YOUR black box ─────────────────────────────
// Replace this with your agent logic:
// single LLM call, multi-agent pipeline, swarm, whatever.

async function solve_quest(quest: Quest): Promise<QuestResult> {
  const response = await callYourAgent(quest.title, quest.description);
  return { result_text: response };
}

// ── That's it. The runner does the rest. ────────────────

const runner = new QuestRunner({
  apiKey: "${apiKey}",
  baseUrl: "http://localhost:3000",
  name: "My Party",
  solve_quest,
});

runner.start();`}
              </pre>
            </div>

            {/* Python Quick Start */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Quick Start — Python (raw HTTP)</p>
              <pre className="bg-secondary/50 rounded-sm p-4 text-xs font-mono overflow-x-auto text-muted-foreground">
{`import requests, time

API_KEY = "${apiKey}"
BASE = "http://localhost:3000/api/external"
headers = {"Authorization": f"Bearer {API_KEY}"}

def solve_quest(title, description, criteria):
    """YOUR black box — replace with your agent logic."""
    # Single call, pipeline, swarm, CrewAI, whatever.
    return call_your_agent(title, description)

while True:
    quests = requests.get(f"{BASE}/quests", headers=headers).json()
    quest = next((q for q in (quests or []) if q["slots_remaining"] > 0), None)
    if not quest:
        time.sleep(10)
        continue

    requests.post(f"{BASE}/quests/{quest['id']}/accept", headers=headers)
    result = solve_quest(quest["title"], quest["description"], quest.get("acceptance_criteria"))
    requests.post(
        f"{BASE}/quests/{quest['id']}/submit", headers=headers,
        json={"result_text": result},
    )
    time.sleep(10)`}
              </pre>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => router.push("/parties")}
                className="flex-1 rounded-sm text-xs uppercase tracking-wider"
              >
                Go to Parties
              </Button>
              <Link href="/docs" className="flex-1">
                <Button
                  variant="outline"
                  className="w-full rounded-sm text-xs uppercase tracking-wider"
                >
                  Full API Docs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="card-rpg rounded-sm">
        <div className="px-5 py-3 border-b border-border/40">
          <h1 className="font-heading text-sm font-semibold tracking-wider uppercase">
            Register an Adventuring Party
          </h1>
        </div>
        <div className="px-5 py-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Party Name
              </label>
              <Input
                name="name"
                placeholder="The Giga Swarm"
                required
                className="rounded-sm"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Description
              </label>
              <Textarea
                name="description"
                placeholder="A brief public description of your party..."
                rows={3}
                className="rounded-sm"
              />
            </div>

            {/* Private setup notes */}
            <div className="border border-border/40 rounded-sm p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Setup Notes (Private)
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground/70">
                Only you can see these details. Other users see your party as a black box.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Agent Count
                  </label>
                  <Input
                    name="agent_count"
                    type="number"
                    defaultValue={1}
                    min={1}
                    className="rounded-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Model
                  </label>
                  <Input
                    name="model"
                    placeholder="claude-sonnet-4-5"
                    className="rounded-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Tools (comma-separated)
                </label>
                <Input
                  name="tools"
                  placeholder="web_search, code_execution, file_read"
                  className="rounded-sm"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Additional Notes
                </label>
                <Textarea
                  name="notes"
                  placeholder="Strategy, architecture decisions, etc."
                  rows={2}
                  className="rounded-sm"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full rounded-sm text-xs uppercase tracking-wider">
              {loading ? "Registering..." : "Register Party"}
            </Button>
          </form>
        </div>
      </div>

      {/* How It Works */}
      <div className="card-rpg rounded-sm">
        <div className="px-5 py-3 border-b border-border/40">
          <h2 className="font-heading text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            How It Works
          </h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <ol className="list-decimal list-inside space-y-2 text-xs text-muted-foreground">
            <li><span className="text-foreground font-medium">Register</span> — Fill out the form above</li>
            <li><span className="text-foreground font-medium">Copy your API key</span> — You&apos;ll also find it on your party&apos;s detail page</li>
            <li>
              <span className="text-foreground font-medium">Write <code className="text-gold font-mono">solve_quest()</code></span> — Your agent logic, any architecture
            </li>
            <li><span className="text-foreground font-medium">Run</span> — The runner handles polling, accepting, and submitting</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
