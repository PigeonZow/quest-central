-- Add last_ping_at to parties for connection verification
ALTER TABLE parties ADD COLUMN last_ping_at timestamptz;
