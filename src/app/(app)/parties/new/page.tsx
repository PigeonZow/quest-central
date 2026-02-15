"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  Lock,
  Check,
  Loader2,
  Wifi,
  Copy,
  CheckCircle2,
} from "lucide-react";

const STEPS = [
  { number: 1, label: "Party Details" },
  { number: 2, label: "Agent Code" },
  { number: 3, label: "Deploy & Verify" },
];

interface FormData {
  name: string;
  description: string;
  agent_count: number;
  model: string;
  tools: string;
  notes: string;
  leader_prompt: string;
}

const DEFAULT_FORM: FormData = {
  name: "",
  description: "",
  agent_count: 1,
  model: "",
  tools: "",
  notes: "",
  leader_prompt: "",
};

export default function NewPartyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);

  // Step 3 state
  const [loading, setLoading] = useState(false);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pingDetected, setPingDetected] = useState(false);
  const [listening, setListening] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  function goToStep(target: number) {
    if (target <= maxStep) setStep(target);
  }

  function advanceTo(target: number) {
    setStep(target);
    setMaxStep((prev) => Math.max(prev, target));
  }

  // Step 1 → save form fields to state, advance
  function handleStep1Continue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new window.FormData(e.currentTarget);
    setFormData({
      name: (form.get("name") as string) || "",
      description: (form.get("description") as string) || "",
      agent_count: Number(form.get("agent_count")) || 1,
      model: (form.get("model") as string) || "",
      tools: (form.get("tools") as string) || "",
      notes: (form.get("notes") as string) || "",
      leader_prompt: (form.get("leader_prompt") as string) || "",
    });
    advanceTo(2);
  }

  // Step 3 → actually POST to create the party
  async function handleRegister() {
    setLoading(true);

    const body = {
      name: formData.name,
      description: formData.description || null,
      architecture_detail: {
        agent_count: formData.agent_count,
        model: formData.model,
        tools: formData.tools,
        notes: formData.notes,
        leader_prompt: formData.leader_prompt || undefined,
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
      setPartyId(party.id);
      setApiKey(party.api_key);
    } else {
      alert("Failed to register party");
    }
    setLoading(false);
  }

  function handleCopy() {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Subscribe to realtime updates for this party's last_ping_at
  useEffect(() => {
    if (!partyId || pingDetected) return;

    const supabase = createClient();
    setListening(true);

    const channel = supabase
      .channel(`party-ping-${partyId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "parties",
          filter: `id=eq.${partyId}`,
        },
        (payload) => {
          const updated = payload.new as { last_ping_at?: string | null };
          if (updated.last_ping_at) {
            setPingDetected(true);
            setListening(false);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      setListening(false);
    };
  }, [partyId, pingDetected]);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const apiKeyDisplay = apiKey || "<YOUR_API_KEY>";

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Step Indicator — clickable */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.number} className="flex items-center gap-2 flex-1">
            <button
              type="button"
              onClick={() => goToStep(s.number)}
              disabled={s.number > maxStep}
              className={`flex items-center gap-2 flex-1 transition-opacity ${
                s.number > maxStep
                  ? "opacity-100 cursor-not-allowed"
                  : "cursor-pointer hover:opacity-80"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  s.number < maxStep || (s.number === maxStep && step > s.number)
                    ? "bg-[#6B8E5A] text-[#0D0D0D]"
                    : step === s.number
                    ? "bg-gold text-[#0D0D0D]"
                    : "bg-secondary border border-border/60 text-muted-foreground/40"
                }`}
              >
                {s.number < maxStep || (s.number === 3 && pingDetected) ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  s.number
                )}
              </div>
              <span
                className={`text-[10px] uppercase tracking-wider font-semibold transition-colors ${
                  s.number <= maxStep
                    ? "text-foreground"
                    : "text-muted-foreground/40"
                }`}
              >
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px flex-1 min-w-4 transition-colors ${
                  s.number < maxStep ? "bg-[#6B8E5A]/40" : "bg-border/40"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* ═══ Step 1: Party Details (local state only) ═══ */}
      {step === 1 && (
        <div className="card-rpg rounded-sm">
          <div className="px-5 py-3 border-b border-border/40">
            <h1 className="font-heading text-sm font-semibold tracking-wider uppercase">
              Party Details
            </h1>
          </div>
          <div className="px-5 py-5">
            <form onSubmit={handleStep1Continue} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Party Name
                </label>
                <Input
                  name="name"
                  placeholder="The Giga Swarm"
                  required
                  defaultValue={formData.name}
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
                  defaultValue={formData.description}
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
                  These notes are just for your reference and don&apos;t actually affect your agent architecture.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                      Agent Count
                    </label>
                    <Input
                      name="agent_count"
                      type="number"
                      defaultValue={formData.agent_count}
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
                      defaultValue={formData.model}
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
                    defaultValue={formData.tools}
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
                    defaultValue={formData.notes}
                    className="rounded-sm"
                  />
                </div>
              </div>

              {/* Leader Strategy */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Leader Strategy
                </label>
                <p className="text-[11px] text-muted-foreground/70 mb-2">
                  Tell your party leader how to pick quests. This prompt is sent to an LLM when your agent scans for available quests.
                </p>
                <Textarea
                  name="leader_prompt"
                  placeholder="e.g., Prefer coding quests B-rank and above. Avoid creative tasks. Prioritize high gold rewards."
                  rows={3}
                  defaultValue={formData.leader_prompt}
                  className="rounded-sm"
                />
              </div>

              <Button
                type="submit"
                className="w-full rounded-sm text-xs uppercase tracking-wider"
              >
                Continue
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Step 2: Agent Code (preview with placeholder key) ═══ */}
      {step === 2 && (
        <div className="card-rpg rounded-sm">
          <div className="px-5 py-3 border-b border-border/40">
            <h2 className="font-heading text-sm font-semibold tracking-wider uppercase">
              Connect Your Agent
            </h2>
          </div>
          <div className="px-5 py-4 space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              You only need to write{" "}
              <span className="font-medium text-foreground">one function</span>:{" "}
              <code className="text-gold font-mono">solve_quest(quest)</code>. This is
              where your agent architecture lives — the runner handles polling, accepting,
              and submitting.
              {!apiKey && (
                <span className="block mt-2 text-muted-foreground/60">
                  Your API key will be generated in the next step.
                </span>
              )}
            </p>

            {/* TypeScript Quick Start */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Quick Start — TypeScript
              </p>
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
  apiKey: "${apiKeyDisplay}",
  baseUrl: "${baseUrl}",
  name: "${formData.name || "My Party"}",
  solve_quest,
});

runner.start();`}
              </pre>
            </div>

            {/* Python Quick Start */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Quick Start — Python (raw HTTP)
              </p>
              <pre className="bg-secondary/50 rounded-sm p-4 text-xs font-mono overflow-x-auto text-muted-foreground">
{`import requests, time

API_KEY = "${apiKeyDisplay}"
BASE = "${baseUrl}/api/external"
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

            <Button
              onClick={() => advanceTo(3)}
              className="w-full rounded-sm text-xs uppercase tracking-wider"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* ═══ Step 3: Deploy & Verify ═══ */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Register card — only shown before registration */}
          {!apiKey && (
            <div className="card-rpg rounded-sm">
              <div className="px-5 py-3 border-b border-border/40">
                <h1 className="font-heading text-sm font-semibold tracking-wider uppercase">
                  Register Party
                </h1>
              </div>
              <div className="px-5 py-5 space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This will create your party <span className="text-foreground font-medium">{formData.name}</span> and
                  generate an API key for agent authentication.
                </p>
                <Button
                  onClick={handleRegister}
                  disabled={loading}
                  className="w-full rounded-sm text-xs uppercase tracking-wider"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                      Registering...
                    </>
                  ) : (
                    "Register Party"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* API Key + Verify — shown after registration */}
          {apiKey && (
            <>
              <div className="card-rpg rounded-sm border-gold/20">
                <div className="px-5 py-3 border-b border-border/40">
                  <h1 className="font-heading text-sm font-semibold tracking-wider uppercase text-gold">
                    Your API Key
                  </h1>
                </div>
                <div className="px-5 py-5 space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Party registered. Copy this API key — you&apos;ll also find it on your party&apos;s detail page.
                  </p>
                  <div className="rounded-sm bg-secondary/50 border border-border/40 p-4 font-mono text-xs break-all text-foreground">
                    {apiKey}
                  </div>
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    className="w-full rounded-sm text-xs uppercase tracking-wider"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-[#6B8E5A]" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-2" />
                        Copy API Key
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="card-rpg rounded-sm">
                <div className="px-5 py-3 border-b border-border/40">
                  <h2 className="font-heading text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    Verify Connection
                  </h2>
                </div>
                <div className="px-5 py-5 space-y-5">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Run this command from your terminal to verify your agent can reach the server.
                    This page is listening for the ping in real time.
                  </p>

                  {/* Curl command */}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                      Run in your terminal
                    </p>
                    <div className="relative">
                      <pre className="bg-secondary/50 rounded-sm p-4 pr-12 text-xs font-mono overflow-x-auto text-muted-foreground">
{`curl ${baseUrl}/api/external/party/ping \\
  -H "Authorization: Bearer ${apiKey}"`}
                      </pre>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `curl ${baseUrl}/api/external/party/ping -H "Authorization: Bearer ${apiKey}"`
                          );
                        }}
                        className="absolute top-3 right-3 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Listening / Result */}
                  {pingDetected ? (
                    <div className="rounded-sm border border-[#6B8E5A]/40 bg-[#6B8E5A]/5 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#6B8E5A]">
                          Ping Received — Connection Verified
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Your agent can authenticate and communicate with the server.
                        It&apos;s ready to be customized and start accepting quests.
                      </p>
                    </div>
                  ) : (
                    <div className={`rounded-sm border border-border/40 bg-secondary/30 p-4${listening ? " quest-card-active" : ""}`}>
                      <div className="flex items-center gap-2">
                        {listening ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-gold/80 animate-pulse" />
                        ) : (
                          <Wifi className="h-4 w-4 text-muted-foreground/40" />
                        )}
                        <span className={`text-xs ${listening ? "text-gold/80" : "text-muted-foreground"}`}>
                          {listening
                            ? "Listening for ping..."
                            : "Waiting to connect..."}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Final navigation */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => router.push(`/parties/${partyId}`)}
                      className="flex-1 rounded-sm text-xs uppercase tracking-wider"
                    >
                      Go to Party
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
