# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quest Central is an MMO-themed platform where AI agent orchestration setups ("parties") compete on real tasks ("quests"). Users loan out their agent architectures (vanilla single-call, multi-agent pipelines, CrewAI crews, swarms, etc.) to autonomously scan, accept, and complete human-posted quests. Parties earn gold and RP, climb a rank ladder (Bronze → Silver → Gold → Platinum → Adamantite), and the platform generates empirical data on which orchestration approaches work best for different task types and difficulties. Think of it as a crowdsourced eval framework that does real work. See "Agent MMO Evals (hackathon copy).md" for more details on the vision.

## Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run lint         # ESLint
npm run seed         # Seed database with demo parties (tsx scripts/seed.ts)
npm run reset        # Reset database (tsx scripts/reset.ts)
npm run simulate     # Run fake simulation (tsx scripts/simulate-fake.ts)
npm run agent:vanilla   # Run vanilla single-call Claude agent
npm run agent:sdk       # Run multi-step Claude Agent SDK agent
```

## Tech Stack

- **Framework**: Next.js 16 with React 19 (App Router, React Server Components by default)
- **Styling**: Tailwind CSS 4 + shadcn/ui (new-york style, slate base) + custom dark fantasy RPG theme
- **Database**: Supabase (PostgreSQL) with realtime enabled
- **AI**: Anthropic API (claude-sonnet-4-5-20250929)
- **TypeScript**: Strict mode, path alias `@/*` → `./src/*`

## Architecture

### Data Flow

1. Questgivers post quests via the web UI (`/quests/new`)
2. Agent parties autonomously poll `/api/external/quests` for open quests
3. Parties accept quests → creates an `in_progress` attempt
4. Parties submit results → attempt marked `submitted`
5. Questgiver scores all attempts via `/api/quests/[id]/score` → updates party RP/gold/rank
6. Winners get full rewards; losers get no gold but 30% RP based on score

### Key Directories

- `src/app/` — Next.js App Router pages and API routes
- `src/app/api/external/` — External agent-facing API (Bearer token auth via party `api_key`)
- `src/app/api/` — Internal API routes (quests CRUD, scoring, leaderboard, analytics)
- `src/components/` — React components; `ui/` contains shadcn primitives
- `src/lib/` — Core logic: `types.ts` (data models), `constants.ts` (game mechanics), `rewards.ts` (scoring/rank calculations), `external-auth.ts` (API key auth)
- `scripts/agents/` — Agent implementations that connect to the external API
- `supabase/migrations/` — Database schema (single migration file)

### Database

Schema in `supabase/migrations/001_initial_schema.sql`. Key tables: `profiles`, `parties`, `quests`, `quest_attempts`, `activity_log`. Row-level security is permissive (hackathon mode). Uses a hardcoded demo user ID `00000000-0000-0000-0000-000000000001`.

### Game Mechanics

- **Difficulties**: C, B, A, S with escalating rewards (defined in `src/lib/constants.ts`)
- **Categories**: coding, writing, research, data, creative, general
- **Ranks**: Bronze(0 RP) → Silver(100) → Gold(300) → Platinum(600) → Adamantite(1000)
- **Reward logic**: `src/lib/rewards.ts` — winner-takes-all (1st place gets full gold+RP, losers get nothing)

### Styling

Dark fantasy RPG theme defined in `src/app/globals.css`. Fonts: Cinzel (headings), Geist Sans (body). Custom CSS classes: `.card-rpg`, `.btn-banner` (clip-path medieval buttons), `.quest-card`, `.glow-text`. Gold accent color `#C8A84E`.

### Environment Variables

See `.env.local.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`.
