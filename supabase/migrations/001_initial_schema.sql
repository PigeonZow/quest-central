-- Quest Central: Initial Schema
-- Run this in the Supabase SQL Editor

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  gold INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert demo users (no auth)
INSERT INTO profiles (id, username, display_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'questmaster69', 'questmaster69');

INSERT INTO profiles (id, username, display_name)
VALUES ('00000000-0000-0000-0000-000000000002', 'agentmaxxer420', 'agentmaxxer420');

-- ============================================
-- PARTIES (Adventuring Parties / Agent Setups)
-- ============================================
CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  architecture_type TEXT DEFAULT 'custom',
  architecture_detail JSONB DEFAULT '{}',
  api_key UUID DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'scanning', 'active', 'resting')),
  rp INTEGER DEFAULT 0,
  rank TEXT DEFAULT 'Bronze' CHECK (rank IN ('Bronze', 'Silver', 'Gold', 'Platinum', 'Adamantite')),
  quests_completed INTEGER DEFAULT 0,
  quests_failed INTEGER DEFAULT 0,
  gold_earned INTEGER DEFAULT 0,
  avg_score NUMERIC(5,2) DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_parties_owner ON parties(owner_id);
CREATE INDEX idx_parties_rank ON parties(rank);
CREATE INDEX idx_parties_rp ON parties(rp DESC);
CREATE UNIQUE INDEX idx_parties_api_key ON parties(api_key);

-- ============================================
-- QUESTS
-- ============================================
CREATE TABLE quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questgiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('C', 'B', 'A', 'S')),
  category TEXT DEFAULT 'general',
  gold_reward INTEGER NOT NULL DEFAULT 50,
  rp_reward INTEGER NOT NULL DEFAULT 10,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'review', 'completed', 'expired')),
  max_attempts INTEGER DEFAULT 5,
  time_limit_minutes INTEGER,
  acceptance_criteria TEXT,
  winning_attempt_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_quests_status ON quests(status);
CREATE INDEX idx_quests_difficulty ON quests(difficulty);
CREATE INDEX idx_quests_questgiver ON quests(questgiver_id);

-- ============================================
-- QUEST ATTEMPTS
-- ============================================
CREATE TABLE quest_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'scored', 'won', 'lost')),
  result_text TEXT,
  result_data JSONB,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  time_taken_seconds INTEGER,
  token_count INTEGER,
  questgiver_feedback TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  scored_at TIMESTAMPTZ
);

CREATE INDEX idx_attempts_quest ON quest_attempts(quest_id);
CREATE INDEX idx_attempts_party ON quest_attempts(party_id);
CREATE INDEX idx_attempts_status ON quest_attempts(status);

-- Prevent duplicate active attempts per party per quest
CREATE UNIQUE INDEX idx_unique_active_attempt
  ON quest_attempts(quest_id, party_id)
  WHERE status IN ('in_progress', 'submitted');

-- ============================================
-- ACTIVITY LOG
-- ============================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'quest_posted' | 'quest_accepted' | 'quest_submitted' | 'quest_scored' | 'quest_completed' | 'rank_up'
  party_id UUID REFERENCES parties(id) ON DELETE SET NULL,
  quest_id UUID REFERENCES quests(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_type ON activity_log(event_type);

-- ============================================
-- Add foreign key for winning_attempt_id after quest_attempts exists
-- ============================================
ALTER TABLE quests
  ADD CONSTRAINT fk_winning_attempt
  FOREIGN KEY (winning_attempt_id) REFERENCES quest_attempts(id) ON DELETE SET NULL;

-- ============================================
-- RLS POLICIES (permissive for hackathon demo)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Allow all reads/writes for the hackathon (no auth)
CREATE POLICY "Allow all on profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on parties" ON parties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on quests" ON quests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on quest_attempts" ON quest_attempts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on activity_log" ON activity_log FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE quests;
ALTER PUBLICATION supabase_realtime ADD TABLE quest_attempts;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
ALTER PUBLICATION supabase_realtime ADD TABLE parties;

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER parties_updated_at BEFORE UPDATE ON parties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER quests_updated_at BEFORE UPDATE ON quests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
