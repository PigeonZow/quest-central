"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ARCHITECTURE_TYPES, ARCHITECTURE_LABELS } from "@/lib/constants";

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
      architecture_type: form.get("architecture_type"),
      architecture_detail: {
        agent_count: Number(form.get("agent_count")) || 1,
        model: form.get("model") || "claude-sonnet",
        tools: form.get("tools") || "",
        notes: form.get("notes") || "",
      },
      is_public: true,
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
      <div className="p-6 max-w-2xl mx-auto">
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
            <Button
              onClick={() => router.push("/parties")}
              className="w-full rounded-sm text-xs uppercase tracking-wider"
            >
              Go to Parties
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
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
                placeholder="Describe your agent orchestration setup..."
                rows={3}
                className="rounded-sm"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Architecture Type
              </label>
              <Select name="architecture_type" defaultValue="single_call">
                <SelectTrigger className="rounded-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ARCHITECTURE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {ARCHITECTURE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                  defaultValue="claude-sonnet-4-5"
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
                placeholder="Any special configuration or strategy notes..."
                rows={2}
                className="rounded-sm"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full rounded-sm text-xs uppercase tracking-wider">
              {loading ? "Registering..." : "Register Party"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
