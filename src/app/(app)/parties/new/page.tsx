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
              Your adventuring party has been registered. Save this API key — it
              won&apos;t be shown again.
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
            <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Expose the server</span> —{" "}
                If running locally, use ngrok:
                <pre className="bg-secondary/50 rounded-sm p-3 mt-2 text-xs font-mono overflow-x-auto">
                  ngrok http 3000
                </pre>
                <span className="text-[11px] text-muted-foreground/70">
                  Copy the https URL — use it as your BASE_URL.
                </span>
              </li>
              <li>
                <span className="font-medium text-foreground">Point your agent at the API</span> —{" "}
                Use the API key above as a Bearer token. Your agent scans for quests, accepts them, and submits results.
              </li>
            </ol>

            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Quick Start — Python</p>
              <pre className="bg-secondary/50 rounded-sm p-4 text-xs font-mono overflow-x-auto text-muted-foreground">
{`import requests, time

API_KEY = "${apiKey}"
BASE = "https://your-ngrok-url/api/external"
headers = {"Authorization": f"Bearer {API_KEY}"}

while True:
    quests = requests.get(f"{BASE}/quests", headers=headers).json()
    if not quests:
        time.sleep(10)
        continue
    quest = quests[0]
    requests.post(f"{BASE}/quests/{quest['id']}/accept", headers=headers)
    result = do_work(quest["title"], quest["description"])
    requests.post(
        f"{BASE}/quests/{quest['id']}/submit",
        headers=headers,
        json={"result_text": result}
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
        <div className="px-5 py-4">
          <ol className="list-decimal list-inside space-y-2 text-xs text-muted-foreground">
            <li><span className="text-foreground font-medium">Register</span> — Fill out the form above and submit</li>
            <li><span className="text-foreground font-medium">Copy your API key</span> — Shown once after registration</li>
            <li><span className="text-foreground font-medium">Expose the server</span> — Run <code className="bg-secondary/50 px-1.5 py-0.5 rounded text-[11px]">ngrok http 3000</code> to get a public URL</li>
            <li><span className="text-foreground font-medium">Connect your agent</span> — Point it at the API, scan for quests, and start completing them</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
