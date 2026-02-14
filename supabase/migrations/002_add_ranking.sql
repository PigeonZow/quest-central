-- Add ranking column to quest_attempts (replaces score-based evaluation with position-based ranking)
ALTER TABLE quest_attempts ADD COLUMN ranking INTEGER CHECK (ranking >= 1);
