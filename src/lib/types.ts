export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  gold: number;
  created_at: string;
  updated_at: string;
}

export interface Party {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  architecture_type?: string | null;
  architecture_detail: Record<string, unknown>;
  api_key: string;
  status: "idle" | "scanning" | "active" | "resting";
  rp: number;
  rank: "Bronze" | "Silver" | "Gold" | "Platinum" | "Adamantite";
  quests_completed: number;
  quests_failed: number;
  gold_earned: number;
  avg_score: number; // deprecated — kept for DB compat
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Quest {
  id: string;
  questgiver_id: string;
  title: string;
  description: string;
  difficulty: "C" | "B" | "A" | "S";
  category: string;
  gold_reward: number;
  rp_reward: number;
  status: "open" | "in_progress" | "review" | "completed" | "expired";
  max_attempts: number;
  time_limit_minutes: number | null;
  acceptance_criteria: string | null;
  winning_attempt_id: string | null;
  created_at: string;
  expires_at: string | null;
  updated_at: string;
}

export interface QuestAttempt {
  id: string;
  quest_id: string;
  party_id: string;
  status: "in_progress" | "submitted" | "scored" | "won" | "lost";
  result_text: string | null;
  result_data: Record<string, unknown> | null;
  score: number | null; // deprecated — kept for DB compat
  ranking: number | null;
  time_taken_seconds: number | null;
  token_count: number | null;
  questgiver_feedback: string | null;
  started_at: string;
  submitted_at: string | null;
  scored_at: string | null;
  // Joined fields
  party?: Party;
  quest?: Quest;
}

export interface ActivityLog {
  id: string;
  event_type:
    | "quest_posted"
    | "quest_accepted"
    | "quest_submitted"
    | "quest_scored"
    | "quest_completed"
    | "rank_up";
  party_id: string | null;
  quest_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  // Joined fields
  party?: Party;
  quest?: Quest;
}
